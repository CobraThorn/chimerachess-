import type { CrsUpdateInput, CrsUpdateResult, ChimeraRatingState } from "./types";
import { getChimeraClass, percentileLabel } from "./classes";
import { buildPostGameInsight, performanceLabel } from "./insights";
import { detectSmurfBoost } from "./smurf";

const MODIFIER_CAP = 0.15;

/** Standard expected score (White/Player perspective). */
export function expectedScore(playerRating: number, opponentRating: number): number {
  return 1 / (1 + Math.pow(10, (opponentRating - playerRating) / 400));
}

/** Adaptive K — new players move faster; elite slower; low confidence faster. */
export function dynamicKFactor(
  gamesPlayed: number,
  rating: number,
  ratingDeviation: number
): number {
  if (gamesPlayed < 20) return 40;
  if (rating >= 2200) return 10;
  if (ratingDeviation > 280) return 28;
  if (ratingDeviation > 200) return 24;
  return 20;
}

/**
 * Chimera modifiers on base Elo delta (capped ±15%).
 * Elo remains dominant; modifiers tune psychology & fairness.
 */
export function chimeraModifier(input: CrsUpdateInput, baseDelta: number): number {
  let mod = 0;
  const won = input.score === 1;
  const lost = input.score === 0;
  const ratingGap = input.opponentRating - input.playerRating;

  if (won && input.accuracy >= 88 && baseDelta > 0) mod += 0.06;
  if (won && input.avgCpLoss > 55 && baseDelta > 0) mod -= 0.08;
  if (won && ratingGap >= 80 && input.accuracy >= 75) mod += 0.1;
  if (input.blunders >= 2 && won && baseDelta > 0) mod -= 0.05;
  if (lost && input.accuracy >= 82 && baseDelta < 0) mod += 0.07;
  if (input.performanceScore >= 85 && baseDelta > 0) mod += 0.04;

  const smurf = detectSmurfBoost(input);
  if (smurf > 0 && baseDelta > 0) mod += smurf;

  return Math.max(-MODIFIER_CAP, Math.min(MODIFIER_CAP, mod));
}

export function clampRating(r: number): number {
  return Math.max(100, Math.min(3200, Math.round(r)));
}

function resultFromScore(score: 0 | 0.5 | 1): "win" | "loss" | "draw" {
  if (score === 1) return "win";
  if (score === 0) return "loss";
  return "draw";
}

function gradeFromMetrics(accuracy: number, performance: number): string {
  const avg = (accuracy + performance) / 2;
  if (avg >= 92) return "A+";
  if (avg >= 85) return "A";
  if (avg >= 78) return "B+";
  if (avg >= 70) return "B";
  if (avg >= 62) return "C+";
  return "C";
}

function pressureLabel(accuracy: number, blunders: number): string {
  if (blunders === 0 && accuracy >= 80) return "High";
  if (blunders >= 2) return "Strained";
  return "Moderate";
}

function updateRatingDeviation(
  rd: number,
  gamesPlayed: number,
  performanceScore: number
): number {
  let next = rd - 8 - Math.floor(performanceScore / 25);
  if (gamesPlayed < 20) next = Math.max(next, 220);
  return Math.max(80, Math.min(350, next));
}

export function applyCrsUpdate(
  state: ChimeraRatingState,
  input: CrsUpdateInput
): CrsUpdateResult {
  const mode = input.mode;
  const prevModeRating = state.modeRatings[mode] ?? state.chimeraRating;
  const prevPrimary = state.chimeraRating;
  const useRating = mode === "chimera" ? prevPrimary : prevModeRating;

  const expected = expectedScore(useRating, input.opponentRating);
  const k = dynamicKFactor(input.gamesPlayed, useRating, input.ratingDeviation);
  let baseDelta = Math.round(k * (input.score - expected));

  const mod = chimeraModifier(input, baseDelta);
  const delta = Math.round(baseDelta * (1 + mod));
  const newModeRating = clampRating(useRating + delta);

  const modeRatings = { ...state.modeRatings, [mode]: newModeRating };
  const gamesByMode = {
    ...state.gamesByMode,
    [mode]: (state.gamesByMode[mode] ?? 0) + 1,
  };

  const chimeraRating =
    mode === "chimera" ? newModeRating : state.chimeraRating;
  const newPrimary =
    mode === "chimera" ? newModeRating : chimeraRating;

  const prevClass = getChimeraClass(prevPrimary);
  const newClass = getChimeraClass(newPrimary);
  const promoted = newClass.id !== prevClass.id && newPrimary > prevPrimary;

  const result = resultFromScore(input.score);
  const winStreak =
    result === "win" ? state.winStreak + 1 : 0;
  const bestStreak = Math.max(state.bestStreak, winStreak);

  const recentScores = [...state.recentScores, input.score].slice(-12);
  const ratingDeviation = updateRatingDeviation(
    state.ratingDeviation,
    input.gamesPlayed + 1,
    input.performanceScore
  );

  const entry = {
    id: `crs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    mode,
    previousRating: useRating,
    newRating: newModeRating,
    delta,
    result,
    accuracy: input.accuracy,
    performanceScore: input.performanceScore,
    opponentRating: input.opponentRating,
    createdAt: Date.now(),
  };

  const history = [...state.ratingHistory, entry].slice(-400);

  const summary = {
    result,
    mode,
    delta,
    previousRating: useRating,
    newRating: newModeRating,
    accuracy: input.accuracy,
    performanceLabel: performanceLabel(input.performanceScore, result),
    decisionGrade: gradeFromMetrics(input.accuracy, input.performanceScore),
    pressureLabel: pressureLabel(input.accuracy, input.blunders),
    brilliantMoves: input.brilliantMoves,
    mistakes: input.mistakes,
    blunders: input.blunders,
    className: newClass.name.toUpperCase(),
    classId: newClass.id,
    percentileLabel: percentileLabel(newPrimary),
    promoted,
    insight: buildPostGameInsight(input, result, delta),
  };

  const nextState: ChimeraRatingState = {
    ...state,
    chimeraRating: newPrimary,
    peakRating: Math.max(state.peakRating, newPrimary),
    ratingDeviation,
    modeRatings,
    gamesByMode,
    totalRatedGames: state.totalRatedGames + 1,
    winStreak,
    bestStreak,
    recentScores,
    ratingHistory: history,
    lastPostGame: summary,
    pendingPromotion: promoted ? newClass.id : null,
    playerArchetype: state.playerArchetype,
  };

  return { state: nextState, summary };
}
