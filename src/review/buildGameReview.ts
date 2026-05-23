import { analyzeUserMove } from "../ai/mistakeAnalyzer";
import type { GameMoveRecord } from "../ai/types";
import type { MistakeCategory } from "../ai/types";
import { evalFromResult, formatEvalLabel } from "../engine/analysis";
import type { StockfishEngine } from "../engine/stockfish";
import { getEvaluation, getTopMoves } from "../engine/stockfish";
import { createInitialState } from "../chess/board";
import { toFen } from "../chess/fen";

const START_FEN = toFen(createInitialState());
import { buildRecapSteps } from "./replay";
import type {
  EvalPoint,
  GamePhaseStats,
  GameReviewInput,
  GameReviewReport,
  MoveGrade,
  ReviewMoveAnalysis,
  ReviewProgress,
} from "./types";

const USER_DEPTH = 12;
const TIMELINE_DEPTH = 8;

function gradeFromCpLoss(cpLoss: number, playedBest: boolean): MoveGrade {
  if (cpLoss <= 3 && playedBest) return "brilliant";
  if (cpLoss <= 12 && playedBest) return "great";
  if (cpLoss < 35) return "good";
  if (cpLoss < 80) return "inaccuracy";
  if (cpLoss < 200) return "mistake";
  return "blunder";
}

function moveAccuracy(cpLoss: number): number {
  return Math.max(0, Math.min(100, 100 - cpLoss * 0.11));
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
  if (grade === "good") return "Solid. The position stays within a small margin of best play.";
  if (grade === "inaccuracy") {
    return `Slightly imprecise (−${cpLoss}cp). Engine prefers ${bestUci} over ${playedUci}.`;
  }
  if (grade === "mistake") {
    return `Missed stronger play (−${cpLoss}cp). ${bestUci} keeps more pressure.`;
  }
  return `Critical swing (−${cpLoss}cp). ${bestUci} was much stronger than ${playedUci}.`;
}

function resultLabel(result: GameReviewReport["result"], mode: GameReviewInput["mode"]): string {
  if (result === "draw") return "Draw";
  if (result === "user-win") return mode === "online" ? "Victory" : "You defeated CHIMERA";
  return mode === "online" ? "Defeat" : "CHIMERA wins";
}

function buildNarrative(report: Omit<GameReviewReport, "narrative">): string[] {
  const lines: string[] = [];
  lines.push(
    `You scored ${report.accuracy}% accuracy over ${report.userMoves.length} moves in ${Math.round(report.durationMs / 60000) || 1} min of play.`
  );
  if (report.blunders > 0) {
    lines.push(
      `${report.blunders} blunder${report.blunders > 1 ? "s" : ""} defined the result — review those moments below.`
    );
  } else if (report.mistakes > 0) {
    lines.push(
      `${report.mistakes} mistake${report.mistakes > 1 ? "s" : ""} cost meaningful eval — tightening those wins more games.`
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
    lines.push(`Opening sequence: ${report.openingLine.slice(0, 80)}${report.openingLine.length > 80 ? "…" : ""}.`);
  }
  return lines.slice(0, 6);
}

export async function buildGameReview(
  engine: StockfishEngine,
  input: GameReviewInput,
  onProgress?: (p: ReviewProgress) => void
): Promise<GameReviewReport> {
  const userMoves = input.moves.filter((m) => m.by === "user");
  const totalSteps = input.moves.length + userMoves.length + 2;
  let step = 0;
  const tick = (label: string) => {
    step += 1;
    onProgress?.({ step, total: totalSteps, label });
  };

  tick("Building evaluation timeline…");
  const evalTimeline: EvalPoint[] = [{ ply: 0, cpWhite: 0, label: "0.0" }];
  for (let i = 0; i < input.moves.length; i++) {
    const m = input.moves[i];
    const evalRes = await getEvaluation(engine, m.fen, TIMELINE_DEPTH);
    const { cpWhite } = evalFromResult(m.fen, evalRes);
    evalTimeline.push({
      ply: i + 1,
      cpWhite,
      label: formatEvalLabel(cpWhite, evalRes.isMate, evalRes.mateIn),
    });
    if (i % 4 === 0) tick(`Timeline ${i + 1}/${input.moves.length}`);
  }

  tick("Grading your moves…");
  const userAnalyses: ReviewMoveAnalysis[] = [];
  let fenBefore = START_FEN;
  let ply = 0;

  for (const m of input.moves) {
    ply += 1;
    if (m.by !== "user") {
      fenBefore = m.fen;
      continue;
    }

    const mistake = await analyzeUserMove(
      engine,
      fenBefore,
      m.fen,
      m.uci,
      input.userColor
    );
    const top = await getTopMoves(engine, fenBefore, USER_DEPTH, 1).then((t) => t[0]);
    const evalBefore = await getEvaluation(engine, fenBefore, USER_DEPTH);
    const evalAfter = await getEvaluation(engine, m.fen, USER_DEPTH);
    const beforeW = evalFromResult(fenBefore, evalBefore).cpWhite;
    const afterW = evalFromResult(m.fen, evalAfter).cpWhite;
    const cpLoss = mistake?.cpLoss ?? 0;
    const playedBest = top?.move === m.uci;
    const grade = gradeFromCpLoss(cpLoss, playedBest);

    userAnalyses.push({
      ply,
      uci: m.uci,
      san: m.san,
      fenBefore,
      fenAfter: m.fen,
      grade,
      cpLoss,
      bestUci: top?.move ?? m.uci,
      evalBeforeWhite: beforeW,
      evalAfterWhite: afterW,
      swingCp: cpLoss,
      category: (mistake?.category ?? null) as MistakeCategory | null,
      isCritical: cpLoss >= 120,
      insight: insightFor(grade, cpLoss, top?.move ?? m.uci, m.uci),
    });
    fenBefore = m.fen;
    tick(`Move ${userAnalyses.length}/${userMoves.length}`);
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

  const accuracy =
    userAnalyses.length > 0
      ? Math.round(
          userAnalyses.reduce((s, u) => s + moveAccuracy(u.cpLoss), 0) /
            userAnalyses.length
        )
      : 100;
  const averageCpLoss =
    userAnalyses.length > 0
      ? Math.round(
          userAnalyses.reduce((s, u) => s + u.cpLoss, 0) / userAnalyses.length
        )
      : 0;

  const phaseMap = new Map<GamePhaseStats["phase"], { acc: number[]; worst: number }>();
  for (const u of userAnalyses) {
    const ph = phaseForPly(u.ply);
    const cur = phaseMap.get(ph) ?? { acc: [], worst: 0 };
    cur.acc.push(moveAccuracy(u.cpLoss));
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
    .filter((u) => u.isCritical)
    .sort((a, b) => b.cpLoss - a.cpLoss)
    .slice(0, 5);

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
    averageCpLoss,
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

/** Convert online move log to game move records */
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
