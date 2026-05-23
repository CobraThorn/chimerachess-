import { analyzeUserMove } from "../ai/mistakeAnalyzer";
import type { GameMoveRecord } from "../ai/types";
import type { MistakeCategory } from "../ai/types";
import { createInitialState } from "../chess/board";
import { toFen } from "../chess/fen";
import { evalFromResult, formatEvalLabel } from "../engine/analysis";
import type { StockfishEngine } from "../engine/stockfish";
import { getEvaluation, getTopMoves } from "../engine/stockfish";
import {
  formatAvgMissPerMove,
  formatEnginePreferredOver,
  missSizeWord,
  playQualityFromAcpl,
} from "./metricsDisplay";
import {
  averageAccuracy,
  averageCentipawnLoss,
  cpLossToAccuracy,
} from "./accuracy";
import { analyzePositionForReview } from "./positionInsights";
import { buildRecapSteps, stateAtPly } from "./replay";
import type {
  EvalPoint,
  GamePhaseStats,
  GameReviewInput,
  GameReviewReport,
  MoveGrade,
  ReviewMoveAnalysis,
  ReviewProgress,
} from "./types";

const USER_DEPTH = 14;
const TIMELINE_DEPTH = 10;
const START_FEN = toFen(createInitialState());

function gradeFromCpLoss(cpLoss: number, playedBest: boolean): MoveGrade {
  if (cpLoss <= 3 && playedBest) return "brilliant";
  if (cpLoss <= 12 && playedBest) return "great";
  if (cpLoss < 35) return "good";
  if (cpLoss < 80) return "inaccuracy";
  if (cpLoss < 200) return "mistake";
  return "blunder";
}

function phaseForPly(ply: number): GamePhaseStats["phase"] {
  if (ply <= 16) return "opening";
  if (ply <= 44) return "middlegame";
  return "endgame";
}

function insightFor(
  grade: MoveGrade,
  cpLoss: number,
  bestUci: string,
  playedUci: string
): string {
  if (grade === "brilliant" || grade === "great") {
    return "Precise — you matched the engine's top choice.";
  }
  if (grade === "good") return "Solid. The position stays close to the engine's best line.";
  if (grade === "inaccuracy") {
    return formatEnginePreferredOver(bestUci, playedUci, cpLoss);
  }
  const sized = missSizeWord(cpLoss);
  return `${sized.charAt(0).toUpperCase()}${sized.slice(1)} — ${formatEnginePreferredOver(bestUci, playedUci, cpLoss)}`;
}

function resultLabel(result: GameReviewReport["result"], mode: GameReviewInput["mode"]): string {
  if (result === "draw") return "Draw";
  if (result === "user-win") return mode === "online" ? "Victory" : "You defeated CHIMERA";
  return mode === "online" ? "Defeat" : "CHIMERA wins";
}

function buildNarrative(report: Omit<GameReviewReport, "narrative">): string[] {
  const lines: string[] = [];
  const quality = playQualityFromAcpl(report.acpl);
  lines.push(
    `You scored ${report.accuracy}% accuracy over ${report.userMoves.length} moves — overall play: ${quality.label} (${formatAvgMissPerMove(report.acpl)} mistake size on average).`
  );
  if (report.blunders > 0) {
    lines.push(
      `${report.blunders} blunder${report.blunders > 1 ? "s" : ""} — tap them in the mistake rail to see heat maps and how to find the best move.`
    );
  } else if (report.mistakes > 0) {
    lines.push(
      `${report.mistakes} mistake${report.mistakes > 1 ? "s" : ""} — use the recap board overlays to train your scan habits.`
    );
  } else if (report.accuracy >= 85) {
    lines.push("Very clean game. Your decisions stayed close to engine top lines throughout.");
  }
  const worstPhase = [...report.phases].sort((a, b) => a.avgAccuracy - b.avgAccuracy)[0];
  if (worstPhase && worstPhase.avgAccuracy < report.accuracy - 8) {
    lines.push(
      `Weakest phase: ${worstPhase.phase} (${worstPhase.avgAccuracy}% avg) — extra focus there in training.`
    );
  }
  if (report.criticalMoments.length > 0) {
    const top = report.criticalMoments[0];
    lines.push(
      `Turning point: move ${Math.ceil(top.ply / 2)} — ${top.insight}`
    );
  }
  if (report.openingLine.trim()) {
    lines.push(`Opening: ${report.openingLine.slice(0, 80)}${report.openingLine.length > 80 ? "…" : ""}.`);
  }
  return lines.slice(0, 6);
}

function fenAfterPly(moves: GameMoveRecord[], ply: number): string {
  const { state } = stateAtPly(moves, ply);
  return toFen(state);
}

export async function buildGameReview(
  engine: StockfishEngine,
  input: GameReviewInput,
  onProgress?: (p: ReviewProgress) => void
): Promise<GameReviewReport> {
  if (!input.moves.length) {
    throw new Error("No moves to review");
  }

  engine.stop();

  const userMoveIndices = input.moves
    .map((m, i) => (m.by === "user" ? i : -1))
    .filter((i) => i >= 0);
  const totalSteps = input.moves.length + userMoveIndices.length * 2 + 4;
  let step = 0;
  const tick = (label: string) => {
    step += 1;
    onProgress?.({ step, total: totalSteps, label });
  };

  tick("Building evaluation timeline…");
  const evalTimeline: EvalPoint[] = [];
  const timelineDepth = input.moves.length > 40 ? 8 : TIMELINE_DEPTH;

  for (let ply = 0; ply <= input.moves.length; ply++) {
    const fen = ply === 0 ? START_FEN : fenAfterPly(input.moves, ply);
    const evalRes = await getEvaluation(engine, fen, timelineDepth);
    const { cpWhite } = evalFromResult(fen, evalRes);
    evalTimeline.push({
      ply,
      cpWhite,
      label: formatEvalLabel(cpWhite, evalRes.isMate, evalRes.mateIn),
    });
    if (ply > 0 && ply % 4 === 0) {
      tick(`Timeline ${ply}/${input.moves.length}`);
    }
  }

  tick("Deep grading your moves…");
  const userAnalyses: ReviewMoveAnalysis[] = [];

  for (let i = 0; i < input.moves.length; i++) {
    const m = input.moves[i];
    if (m.by !== "user") continue;

    const ply = i + 1;
    const fenBefore = fenAfterPly(input.moves, i);
    const fenAfter = fenAfterPly(input.moves, ply);
    const stateBefore = stateAtPly(input.moves, i).state;

    const mistake = await analyzeUserMove(
      engine,
      fenBefore,
      fenAfter,
      m.uci,
      input.userColor,
      USER_DEPTH
    );
    const topMoves = await getTopMoves(engine, fenBefore, USER_DEPTH, 3);
    const top = topMoves[0];
    const evalBefore = await getEvaluation(engine, fenBefore, USER_DEPTH);
    const evalAfter = await getEvaluation(engine, fenAfter, USER_DEPTH);
    const beforeW = evalFromResult(fenBefore, evalBefore).cpWhite;
    const afterW = evalFromResult(fenAfter, evalAfter).cpWhite;
    const cpLoss = mistake?.cpLoss ?? 0;
    const playedBest = top?.move === m.uci;
    const grade = gradeFromCpLoss(cpLoss, playedBest);
    const accuracyPct = cpLossToAccuracy(cpLoss);

    const position = analyzePositionForReview(
      stateBefore,
      input.userColor,
      m.uci,
      top?.move ?? m.uci,
      cpLoss,
      grade
    );

    userAnalyses.push({
      ply,
      uci: m.uci,
      san: m.san,
      fenBefore,
      fenAfter,
      grade,
      cpLoss,
      accuracyPct,
      bestUci: top?.move ?? m.uci,
      evalBeforeWhite: beforeW,
      evalAfterWhite: afterW,
      swingCp: cpLoss,
      category: (mistake?.category ?? null) as MistakeCategory | null,
      isCritical: cpLoss >= 100,
      insight: insightFor(grade, cpLoss, top?.move ?? m.uci, m.uci),
      position,
    });
    tick(`Move ${userAnalyses.length}/${userMoveIndices.length}`);
  }

  const counts = { brilliant: 0, great: 0, good: 0, inaccuracies: 0, mistakes: 0, blunders: 0 };
  for (const u of userAnalyses) {
    if (u.grade === "brilliant") counts.brilliant++;
    else if (u.grade === "great") counts.great++;
    else if (u.grade === "good") counts.good++;
    else if (u.grade === "inaccuracy") counts.inaccuracies++;
    else if (u.grade === "mistake") counts.mistakes++;
    else counts.blunders++;
  }

  const cpLosses = userAnalyses.map((u) => u.cpLoss);
  const accuracy = averageAccuracy(cpLosses);
  const acpl = averageCentipawnLoss(cpLosses);
  const quality = playQualityFromAcpl(acpl);

  const phaseMap = new Map<GamePhaseStats["phase"], { acc: number[]; worst: number }>();
  for (const u of userAnalyses) {
    const ph = phaseForPly(u.ply);
    const cur = phaseMap.get(ph) ?? { acc: [], worst: 0 };
    cur.acc.push(u.accuracyPct);
    cur.worst = Math.max(cur.worst, u.cpLoss);
    phaseMap.set(ph, cur);
  }
  const phases: GamePhaseStats[] = (["opening", "middlegame", "endgame"] as const)
    .filter((p) => phaseMap.has(p))
    .map((p) => {
      const v = phaseMap.get(p)!;
      return {
        phase: p,
        moves: v.acc.length,
        avgAccuracy: Math.round(
          v.acc.reduce((a, b) => a + b, 0) / v.acc.length
        ),
        worstLoss: v.worst,
      };
    });

  const criticalMoments = [...userAnalyses]
    .filter((u) => u.isCritical || u.grade === "blunder" || u.grade === "mistake")
    .sort((a, b) => b.cpLoss - a.cpLoss)
    .slice(0, 8);

  const openingLine = input.moves
    .slice(0, 10)
    .map((m) => m.san ?? m.uci)
    .join(" ");

  const recapSteps = buildRecapSteps(input.moves);

  const base: Omit<GameReviewReport, "narrative" | "coachSummary"> = {
    id: input.id,
    mode: input.mode,
    opponentLabel: input.opponentLabel,
    userColor: input.userColor,
    result: input.result,
    resultLabel: resultLabel(input.result, input.mode),
    durationMs: input.endedAt - input.startedAt,
    totalPlies: input.moves.length,
    accuracy,
    averageCpLoss: acpl,
    acpl,
    playQuality: quality.label,
    avgMissLabel: formatAvgMissPerMove(acpl),
    ...counts,
    openingLine,
    phases,
    evalTimeline,
    userMoves: userAnalyses,
    criticalMoments,
    liveMistakes: input.liveMistakes ?? [],
    recapSteps,
    moves: [...input.moves],
  };

  tick("Coach summary…");
  const narrative = buildNarrative(base);

  return { ...base, narrative };
}

export function onlineMovesToRecords(
  history: { uci: string; san?: string; fen: string; by: "user" | "opponent" }[]
): GameMoveRecord[] {
  return history.map((m) => ({
    uci: m.uci,
    fen: m.fen,
    san: m.san,
    by: m.by === "user" ? "user" : "chimera",
  }));
}
