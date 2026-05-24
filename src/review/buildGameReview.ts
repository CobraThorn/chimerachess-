import { gradeUserMoveForReview } from "../ai/mistakeAnalyzer";
import type { GameMoveRecord } from "../ai/types";
import type { MistakeCategory } from "../ai/types";
import { createInitialState } from "../chess/board";
import { toFen } from "../chess/fen";
import type { StockfishEngine } from "../engine/stockfish";
import { buildEvalTimelineFromGrades } from "./evalTimeline";
import {
  formatAvgMissPerMove,
  playQualityFromAcpl,
} from "./metricsDisplay";
import {
  averageAccuracy,
  averageCentipawnLoss,
  cpLossToAccuracy,
} from "./accuracy";
import {
  classifyMoveGrade,
  CP_MISTAKE,
  insightForGrade,
} from "./classifyMove";
import { analyzePositionForReview } from "./positionInsights";
import { buildRecapSteps, stateAtPly } from "./replay";
import {
  REVIEW_MOVE_DEPTH,
  REVIEW_MULTIPV,
  REVIEW_START_DEPTH,
} from "./reviewEngine";
import type {
  GamePhaseStats,
  GameReviewInput,
  GameReviewReport,
  ReviewMoveAnalysis,
  ReviewProgress,
} from "./types";

const START_FEN = toFen(createInitialState());

function phaseForPly(ply: number): GamePhaseStats["phase"] {
  if (ply <= 16) return "opening";
  if (ply <= 44) return "middlegame";
  return "endgame";
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
    `You scored ${report.accuracy}% accuracy (${quality.label}) — ${report.best + report.excellent} best/excellent moves out of ${report.userMoves.length}.`
  );
  if (report.blunders > 0) {
    lines.push(
      `${report.blunders} blunder${report.blunders > 1 ? "s" : ""} — use the review board arrows: green = best move, red = what you played.`
    );
  } else if (report.misses > 0) {
    lines.push(`${report.misses} missed win${report.misses > 1 ? "s" : ""} — revisit those moments in the timeline.`);
  } else if (report.mistakes > 0) {
    lines.push(`${report.mistakes} mistake${report.mistakes > 1 ? "s" : ""} to drill in training.`);
  } else if (report.accuracy >= 90) {
    lines.push("Clean game — your moves matched engine top lines throughout.");
  }
  const worstPhase = [...report.phases].sort((a, b) => a.avgAccuracy - b.avgAccuracy)[0];
  if (worstPhase && worstPhase.avgAccuracy < report.accuracy - 8) {
    lines.push(`Weakest phase: ${worstPhase.phase} (${worstPhase.avgAccuracy}% avg).`);
  }
  if (report.criticalMoments.length > 0) {
    const top = report.criticalMoments[0];
    lines.push(`Key moment: move ${Math.ceil(top.ply / 2)} — ${top.insight}`);
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
  const totalSteps = userMoveIndices.length + 4;
  let step = 0;
  const tick = (label: string) => {
    step += 1;
    onProgress?.({ step, total: totalSteps, label });
  };

  tick("Classifying your moves…");
  const userAnalyses: ReviewMoveAnalysis[] = [];

  for (let i = 0; i < input.moves.length; i++) {
    const m = input.moves[i];
    if (m.by !== "user") continue;

    const ply = i + 1;
    const fenBefore = fenAfterPly(input.moves, i);
    const fenAfter = fenAfterPly(input.moves, ply);
    const stateBefore = stateAtPly(input.moves, i).state;

    const graded = await gradeUserMoveForReview(
      engine,
      fenBefore,
      fenAfter,
      m.uci,
      input.userColor,
      REVIEW_MOVE_DEPTH
    );
    const cpLoss = graded?.cpLoss ?? 0;
    const playedBest = graded?.playedBest ?? false;
    const userEvalBefore = graded?.userEvalBeforeCp ?? 0;
    const grade = classifyMoveGrade({
      cpLoss,
      playedBest,
      brilliantCandidate: graded?.brilliantCandidate ?? false,
      ply,
      userEvalBeforeCp: userEvalBefore,
    });
    const beforeW = graded?.evalBeforeCpWhite ?? 0;
    const afterW = graded?.evalAfterCpWhite ?? 0;
    const accuracyPct = cpLossToAccuracy(cpLoss);
    const bestUci = graded?.bestUci ?? m.uci;

    const position = analyzePositionForReview(
      stateBefore,
      input.userColor,
      m.uci,
      bestUci,
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
      bestUci,
      evalBeforeWhite: beforeW,
      evalAfterWhite: afterW,
      swingCp: cpLoss,
      category: (graded?.category ?? null) as MistakeCategory | null,
      isCritical: cpLoss >= CP_MISTAKE,
      insight: insightForGrade(grade, cpLoss, bestUci, m.uci, m.san),
      position,
    });
    tick(`Move ${userAnalyses.length}/${userMoveIndices.length}`);
  }

  const counts = {
    brilliant: 0,
    best: 0,
    excellent: 0,
    good: 0,
    book: 0,
    inaccuracies: 0,
    mistakes: 0,
    misses: 0,
    blunders: 0,
  };
  for (const u of userAnalyses) {
    if (u.grade === "brilliant") counts.brilliant++;
    else if (u.grade === "best") counts.best++;
    else if (u.grade === "excellent") counts.excellent++;
    else if (u.grade === "good") counts.good++;
    else if (u.grade === "book") counts.book++;
    else if (u.grade === "inaccuracy") counts.inaccuracies++;
    else if (u.grade === "mistake") counts.mistakes++;
    else if (u.grade === "miss") counts.misses++;
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
        avgAccuracy: Math.round(v.acc.reduce((a, b) => a + b, 0) / v.acc.length),
        worstLoss: v.worst,
      };
    });

  const criticalMoments = [...userAnalyses]
    .filter(
      (u) =>
        u.isCritical ||
        u.grade === "blunder" ||
        u.grade === "mistake" ||
        u.grade === "miss"
    )
    .sort((a, b) => b.cpLoss - a.cpLoss)
    .slice(0, 10);

  const openingLine = input.moves
    .slice(0, 10)
    .map((m) => m.san ?? m.uci)
    .join(" ");

  const recapSteps = buildRecapSteps(input.moves);

  tick("Building evaluation graph…");
  const evalTimeline = await buildEvalTimelineFromGrades(
    engine,
    input.moves.length,
    userAnalyses,
    START_FEN,
    REVIEW_START_DEPTH
  );

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
    analysisDepth: REVIEW_MOVE_DEPTH,
    analysisMultipv: REVIEW_MULTIPV,
    analysisEngines: ["stockfish"],
    torchUsed: false,
    openingLine,
    phases,
    evalTimeline,
    userMoves: userAnalyses,
    criticalMoments,
    liveMistakes: input.liveMistakes ?? [],
    recapSteps,
    moves: [...input.moves],
  };

  tick("Summary…");
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
