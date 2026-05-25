import { expectedScore } from "../crs/formula";
import { clampElo, resultToScore } from "./elo";
import type {
  CalibrationMathSnapshot,
  ChimeraCalibrationState,
  ChimeraMemory,
  StoredGame,
} from "./types";
import { INITIAL_CHIMERA_ELO, INITIAL_USER_ELO } from "./types";
import { getUserStrength } from "./chimeraStrength";

/** Games vs CHIMERA that update opponent calibration. */
export const CALIBRATION_CRS_MODES = new Set([
  "chimera",
  "bullet",
  "blitz",
  "rapid",
]);

/** Elo scale (standard). */
export const ELO_SCALE = 400;

/** Logistic move-efficiency: fewer full moves → stronger performance signal. */
export const EFFICIENCY_HALF_MOVES = 52;

export interface CalibrateGameInput {
  storedChimeraElo: number;
  playedChimeraElo: number;
  calibration: ChimeraCalibrationState;
  crsAnchorElo: number;
  game: StoredGame;
}

export interface CalibrateGameResult {
  newStoredElo: number;
  delta: number;
  calibration: ChimeraCalibrationState;
  math: CalibrationMathSnapshot;
}

export function ensureChimeraCalibration(
  memory: ChimeraMemory
): ChimeraCalibrationState {
  if (memory.chimeraCalibration) return memory.chimeraCalibration;

  const games = memory.stats?.totalGames ?? memory.games.length;
  const perceived = clampElo(
    Math.max(
      memory.userStyle?.elo ?? INITIAL_USER_ELO,
      getUserStrength(memory) - 80
    ),
    100,
    3200
  );

  return {
    perceivedUserElo: perceived,
    confidence: confidenceFromRd(initialRatingDeviation(games)),
    calibrationGames: games,
    ratingDeviation: initialRatingDeviation(games),
    lastPlayedElo: memory.chimeraElo ?? INITIAL_CHIMERA_ELO,
  };
}

export function isChimeraCalibrationGame(mode?: string): boolean {
  if (!mode) return true;
  return CALIBRATION_CRS_MODES.has(mode);
}

export function fullMovesFromPlies(totalPlies: number): number {
  return Math.max(1, Math.round(totalPlies / 2));
}

/** σ_start / √(1 + n) — Glicko-style decay of uncertainty. */
export function initialRatingDeviation(calibrationGames: number): number {
  const sigma0 = 320;
  return Math.max(80, Math.round(sigma0 / Math.sqrt(1 + calibrationGames / 4)));
}

export function confidenceFromRd(ratingDeviation: number): number {
  return Math.min(1, Math.max(0, 1 - ratingDeviation / 320));
}

/**
 * Logistic efficiency: at half-move count h, factor = 1.
 * Shorter decisive games → factor > 1 (capped).
 */
export function moveEfficiencyFactor(
  result: StoredGame["result"],
  totalPlies: number
): number {
  if (result === "draw") return 1;
  const full = fullMovesFromPlies(totalPlies);
  const x = (EFFICIENCY_HALF_MOVES - full) / 12;
  const logistic = 1 / (1 + Math.exp(-x));
  const centered = 0.82 + 0.36 * logistic;
  if (result === "user-win") return Math.min(1.75, centered);
  if (result === "chimera-win") return Math.min(1.45, 2 - centered);
  return 1;
}

/** Average centipawn loss on user mistakes → small penalty on S. */
export function mistakePerformancePenalty(game: StoredGame): number {
  const userMistakes = game.mistakes.filter((m) => m.cpLoss > 0);
  if (!userMistakes.length) return 0;
  const avg = userMistakes.reduce((s, m) => s + m.cpLoss, 0) / userMistakes.length;
  return Math.min(0.12, avg / 900);
}

/**
 * Performance score S: result × efficiency (wins) or result / efficiency (losses),
 * minus mistake penalty, clamped to [0, 1].
 */
export function performanceScoreFromGame(game: StoredGame): {
  resultScore: number;
  efficiencyFactor: number;
  mistakePenalty: number;
  performanceScore: number;
} {
  const resultScore = resultToScore(game.result, true);
  const efficiencyFactor = moveEfficiencyFactor(game.result, game.moves.length);
  const mistakePenalty = mistakePerformancePenalty(game);

  let performanceScore: number = resultScore;
  if (game.result === "user-win") {
    performanceScore = resultScore * efficiencyFactor - mistakePenalty;
  } else if (game.result === "chimera-win") {
    performanceScore = resultScore / efficiencyFactor - mistakePenalty;
  } else {
    performanceScore = resultScore - mistakePenalty * 0.5;
  }

  performanceScore = Math.max(0, Math.min(1, performanceScore));

  return { resultScore, efficiencyFactor, mistakePenalty, performanceScore };
}

/** K = 800 / RD, bounded — standard Elo step scaled by uncertainty. */
export function calibrationKFromRd(ratingDeviation: number): number {
  return Math.round(Math.max(12, Math.min(72, 800 / ratingDeviation)));
}

export function blendUserRatingForExpected(
  perceived: number,
  crsAnchor: number,
  calibrationGames: number
): number {
  const w = Math.min(0.72, calibrationGames / (calibrationGames + 14));
  return clampElo(perceived * (1 - w) + crsAnchor * w, 100, 3200);
}

/** Target CHIMERA rating for ~50% expected score: R_c = R_u + δ. */
export function challengeMarginElo(userRating: number): number {
  return Math.round(35 + 0.12 * Math.max(0, userRating - 400));
}

export function targetChimeraElo(userRating: number): number {
  return clampElo(userRating + challengeMarginElo(userRating), 80, 3200);
}

function updateRatingDeviation(
  rd: number,
  games: number,
  surprise: number
): number {
  const decay = 18 + Math.min(12, games * 0.8);
  const shock = Math.abs(surprise) > 0.45 ? 12 : Math.abs(surprise) > 0.25 ? 6 : 0;
  return Math.max(80, Math.min(350, Math.round(rd - decay + shock)));
}

/**
 * Per-player CHIMERA calibration (explicit Elo math).
 *
 * E(R_u, R_c) = 1 / (1 + 10^((R_c − R_u) / 400))
 * S = performance score from result, move efficiency, mistakes
 * ΔR_c = K × (S_chimera − E(R_c, R_u))  with S_chimera = 1 − S for pairing symmetry on wins/losses
 *
 * ΔR_c = K × (S − E(R_u, R_c)) — user outperforming raises CHIMERA toward your level.
 */
export function calibrateAfterGame(input: CalibrateGameInput): CalibrateGameResult {
  const {
    storedChimeraElo,
    playedChimeraElo,
    calibration,
    crsAnchorElo,
    game,
  } = input;

  const { resultScore, efficiencyFactor, mistakePenalty, performanceScore } =
    performanceScoreFromGame(game);

  const userRating = blendUserRatingForExpected(
    calibration.perceivedUserElo,
    crsAnchorElo,
    calibration.calibrationGames
  );

  const expected = expectedScore(userRating, playedChimeraElo);
  const surprise = performanceScore - expected;

  const games = calibration.calibrationGames + 1;
  const rd = calibration.ratingDeviation ?? initialRatingDeviation(games);
  const k = calibrationKFromRd(rd);

  let chimeraDelta = Math.round(k * surprise);
  let perceivedDelta = Math.round(k * surprise);

  const maxStep = Math.round(120 / Math.sqrt(1 + games / 6));
  chimeraDelta = Math.max(-maxStep, Math.min(maxStep, chimeraDelta));
  perceivedDelta = Math.max(-maxStep, Math.min(maxStep, perceivedDelta));

  let newStored = clampElo(storedChimeraElo + chimeraDelta, 80, 3200);

  const target = targetChimeraElo(userRating);
  const gap = target - newStored;
  const settleWeight = Math.max(0, 1 - confidenceFromRd(rd)) * 0.28;
  if (Math.abs(gap) > 40 && settleWeight > 0) {
    const pull = Math.round(gap * settleWeight);
    const capped = Math.max(-maxStep, Math.min(maxStep, pull));
    newStored = clampElo(newStored + capped, 80, 3200);
    chimeraDelta = newStored - storedChimeraElo;
  }

  const newPerceived = clampElo(
    calibration.perceivedUserElo + perceivedDelta,
    100,
    3200
  );

  const newRd = updateRatingDeviation(rd, games, surprise);
  const confidence = confidenceFromRd(newRd);

  const math: CalibrationMathSnapshot = {
    at: Date.now(),
    userRating,
    chimeraPlayedElo: playedChimeraElo,
    chimeraStoredBefore: storedChimeraElo,
    chimeraStoredAfter: newStored,
    resultScore,
    efficiencyFactor,
    mistakePenalty,
    performanceScore,
    expectedScore: expected,
    surprise,
    kFactor: k,
    chimeraDelta,
    perceivedUserDelta: perceivedDelta,
    fullMoves: fullMovesFromPlies(game.moves.length),
    ratingDeviation: newRd,
  };

  return {
    newStoredElo: newStored,
    delta: chimeraDelta,
    calibration: {
      perceivedUserElo: newPerceived,
      confidence,
      calibrationGames: games,
      ratingDeviation: newRd,
      lastPlayedElo: playedChimeraElo,
      lastSnapshot: math,
    },
    math,
  };
}

export function formatExpectedScoreFormula(
  userR: number,
  chimeraR: number
): string {
  return `E = 1 / (1 + 10^(${chimeraR} − ${userR}) / ${ELO_SCALE})`;
}

export function formatExpectedScoreValue(userR: number, chimeraR: number): string {
  const e = expectedScore(userR, chimeraR);
  return `E ≈ ${(e * 100).toFixed(1)}%`;
}

export function calibrationStatusLabel(
  calibration: ChimeraCalibrationState
): string | null {
  if (calibration.confidence >= 0.82) return null;
  const pct = Math.round(calibration.confidence * 100);
  const rd = calibration.ratingDeviation ?? initialRatingDeviation(
    calibration.calibrationGames
  );
  return `σ ${rd} · ${pct}%`;
}

export function runCalibrationSanityChecks(): void {
  const base: ChimeraCalibrationState = {
    perceivedUserElo: 400,
    confidence: 0.1,
    calibrationGames: 2,
    ratingDeviation: 280,
    lastPlayedElo: 250,
  };
  const wipe = calibrateAfterGame({
    storedChimeraElo: 250,
    playedChimeraElo: 280,
    calibration: base,
    crsAnchorElo: 420,
    game: {
      id: "t",
      startedAt: 0,
      endedAt: 1,
      userColor: "w",
      moves: Array.from({ length: 50 }, () => ({
        uci: "e2e4",
        fen: "",
        by: "user" as const,
      })),
      mistakes: [],
      result: "user-win",
      openingLine: "",
    },
  });
  if (wipe.delta < 35) {
    throw new Error(
      `Expected large CHIMERA bump after fast win, got delta=${wipe.delta}`
    );
  }
  if (wipe.math.performanceScore <= wipe.math.expectedScore) {
    throw new Error("Performance score should exceed expected on fast win");
  }

  const perf = performanceScoreFromGame({
    id: "p",
    startedAt: 0,
    endedAt: 1,
    userColor: "w",
    moves: Array.from({ length: 30 }, () => ({
      uci: "e2e4",
      fen: "",
      by: "user" as const,
    })),
    mistakes: [],
    result: "user-win",
    openingLine: "",
  });
  if (perf.performanceScore < 0.99) {
    throw new Error(`Quick win S should be ~1, got ${perf.performanceScore}`);
  }

  const loss = calibrateAfterGame({
    storedChimeraElo: 1200,
    playedChimeraElo: 1180,
    calibration: {
      perceivedUserElo: 900,
      confidence: 0.3,
      calibrationGames: 5,
      ratingDeviation: 220,
    },
    crsAnchorElo: 880,
    game: {
      id: "t2",
      startedAt: 0,
      endedAt: 1,
      userColor: "w",
      moves: Array.from({ length: 90 }, () => ({
        uci: "e2e4",
        fen: "",
        by: "chimera" as const,
      })),
      mistakes: [],
      result: "chimera-win",
      openingLine: "",
    },
  });
  if (loss.delta >= 0) {
    throw new Error(
      `Expected CHIMERA drop after user loss, got delta=${loss.delta}`
    );
  }
}
