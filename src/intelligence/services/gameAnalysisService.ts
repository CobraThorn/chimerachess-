import type { GameReviewReport } from "../../review/types";
import { playQualityFromAcpl } from "../../review/metricsDisplay";
import type { GameAnalysisServiceInput, GameAnalysisSnapshot } from "../types";
import { INTELLIGENCE_CONFIG } from "../config";
import { clamp } from "../utils/math";

/**
 * Normalizes raw game + optional Stockfish review into a stable analysis snapshot.
 * Review data wins over live-mistake heuristics when present.
 */
export function analyzeGamePerformance(
  input: GameAnalysisServiceInput
): GameAnalysisSnapshot {
  const { game, reviewReport } = input;
  const userMoves = reviewReport?.userMoves ?? [];
  const userMoveCount =
    userMoves.length || game.moves.filter((m) => m.by === "user").length;

  const accuracy = reviewReport?.accuracy ?? estimateAccuracyFromMistakes(game);
  const acpl =
    reviewReport?.acpl ??
    reviewReport?.averageCpLoss ??
    averageCpLossFromMistakes(game);
  const playQuality =
    reviewReport?.playQuality ?? playQualityFromAcpl(acpl).label;

  const blunders =
    reviewReport?.blunders ??
    game.mistakes.filter((m) => m.category === "blunder").length;
  const mistakes =
    reviewReport?.mistakes ??
    game.mistakes.filter((m) => m.category === "mistake").length;
  const inaccuracies =
    reviewReport?.inaccuracies ??
    game.mistakes.filter((m) => m.category === "inaccuracy").length;
  const brilliantMoves = reviewReport?.brilliant ?? 0;

  const phaseAcc = phaseAccuracies(userMoves);
  const criticalMoments = reviewReport
    ? reviewReport.criticalMoments.length
    : userMoves.filter((u) => u.isCritical).length;

  const maxCpLoss =
    userMoves.length > 0
      ? Math.max(...userMoves.map((u) => u.cpLoss))
      : game.mistakes.reduce((m, x) => Math.max(m, x.cpLoss), 0);

  return {
    gameId: game.id,
    mode: reviewReport?.mode ?? "chimera",
    result: game.result,
    userColor: game.userColor,
    accuracy,
    acpl,
    playQuality,
    blunders,
    mistakes,
    inaccuracies,
    brilliantMoves,
    openingAccuracy: phaseAcc.opening,
    middlegameAccuracy: phaseAcc.middlegame,
    endgameAccuracy: phaseAcc.endgame,
    totalPlies: game.moves.length,
    userMoves: userMoveCount,
    criticalMoments,
    maxCpLoss,
    openingLine: reviewReport?.openingLine ?? game.openingLine,
    durationMs: Math.max(0, game.endedAt - game.startedAt),
  };
}

function phaseAccuracies(
  userMoves: GameReviewReport["userMoves"]
): { opening: number; middlegame: number; endgame: number } {
  const buckets = { opening: [] as number[], middlegame: [] as number[], endgame: [] as number[] };
  for (const u of userMoves) {
    if (u.ply <= INTELLIGENCE_CONFIG.openingPlyMax) buckets.opening.push(u.accuracyPct);
    else if (u.ply <= INTELLIGENCE_CONFIG.middlegamePlyMax)
      buckets.middlegame.push(u.accuracyPct);
    else buckets.endgame.push(u.accuracyPct);
  }
  const mean = (arr: number[], fallback: number) =>
    arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : fallback;
  const overall =
    userMoves.length > 0
      ? Math.round(
          userMoves.reduce((s, u) => s + u.accuracyPct, 0) / userMoves.length
        )
      : 75;
  return {
    opening: mean(buckets.opening, overall),
    middlegame: mean(buckets.middlegame, overall),
    endgame: mean(buckets.endgame, overall),
  };
}

function estimateAccuracyFromMistakes(game: import("../../ai/types").StoredGame): number {
  const n = game.mistakes.length;
  const bl = game.mistakes.filter((m) => m.category === "blunder").length;
  const penalty = bl * 12 + n * 4;
  return clamp(92 - penalty, 45, 98);
}

function averageCpLossFromMistakes(game: import("../../ai/types").StoredGame): number {
  if (!game.mistakes.length) return 18;
  return Math.round(
    game.mistakes.reduce((s, m) => s + m.cpLoss, 0) / game.mistakes.length
  );
}
