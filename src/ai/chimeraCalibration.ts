import { expectedScore } from "../crs/formula";
import { clampElo, resultToScore } from "./elo";
import type { ChimeraCalibrationState, ChimeraMemory, StoredGame } from "./types";
import { INITIAL_CHIMERA_ELO, INITIAL_USER_ELO } from "./types";
import { getUserStrength } from "./chimeraStrength";

/** Games vs CHIMERA that update opponent calibration. */
export const CALIBRATION_CRS_MODES = new Set([
  "chimera",
  "bullet",
  "blitz",
  "rapid",
]);

export interface CalibrateGameInput {
  storedChimeraElo: number;
  /** Effective strength CHIMERA actually played at (snapshot at game start). */
  playedChimeraElo: number;
  calibration: ChimeraCalibrationState;
  crsAnchorElo: number;
  game: StoredGame;
}

export interface CalibrateGameResult {
  newStoredElo: number;
  delta: number;
  calibration: ChimeraCalibrationState;
  /** Human-readable note for logs / debug UI */
  note: string;
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
    3000
  );

  return {
    perceivedUserElo: perceived,
    confidence: Math.min(1, games / 18),
    calibrationGames: games,
    lastPlayedElo: memory.chimeraElo ?? INITIAL_CHIMERA_ELO,
  };
}

export function isChimeraCalibrationGame(mode?: string): boolean {
  if (!mode) return true;
  return CALIBRATION_CRS_MODES.has(mode);
}

/** Full moves (both sides) from ply count. */
export function fullMovesFromPlies(totalPlies: number): number {
  return Math.max(1, Math.round(totalPlies / 2));
}

/**
 * Quick decisive wins/losses amplify calibration (e.g. wipe in ~25 full moves).
 */
export function moveEfficiencyMultiplier(
  result: StoredGame["result"],
  totalPlies: number
): number {
  const full = fullMovesFromPlies(totalPlies);
  const quick = Math.max(0, (52 - full) / 52);

  if (result === "user-win") {
    if (full >= 58) return 1;
    return 1 + 0.85 * quick;
  }
  if (result === "chimera-win") {
    if (full >= 58) return 1;
    return 1 + 0.55 * quick;
  }
  return 1;
}

/** K decreases as confidence grows — fast early calibration, stable later. */
export function calibrationKFactor(calibrationGames: number, confidence: number): number {
  const gamesBoost = calibrationGames < 4 ? 1.35 : calibrationGames < 10 ? 1.15 : 1;
  const base = 58 * gamesBoost;
  const settled = 14 + confidence * 46;
  return Math.round(base * (1 - confidence * 0.55) + settled * confidence * 0.55);
}

function blendAnchorUser(
  perceived: number,
  crsAnchor: number,
  calibrationGames: number
): number {
  const w = Math.min(0.7, calibrationGames / 22);
  return clampElo(perceived * (1 - w) + crsAnchor * w, 100, 3200);
}

function challengeTargetElo(perceivedUser: number): number {
  if (perceivedUser < 700) return perceivedUser + 35;
  if (perceivedUser < 1000) return perceivedUser + 55;
  if (perceivedUser < 1400) return perceivedUser + 95;
  if (perceivedUser < 1800) return perceivedUser + 145;
  if (perceivedUser < 2200) return perceivedUser + 205;
  return perceivedUser + 265;
}

function maxSingleStep(calibrationGames: number, confidence: number): number {
  if (calibrationGames < 3) return 140;
  if (calibrationGames < 8) return 100;
  if (confidence < 0.45) return 75;
  if (confidence < 0.75) return 52;
  return 38;
}

/**
 * Per-player CHIMERA Elo calibration.
 * When the human crushes CHIMERA faster than expected, stored CHIMERA Elo rises toward
 * the strength needed for a fair fight (perceived user + challenge margin).
 */
export function calibrateAfterGame(input: CalibrateGameInput): CalibrateGameResult {
  const {
    storedChimeraElo,
    playedChimeraElo,
    calibration,
    crsAnchorElo,
    game,
  } = input;

  const userScore = resultToScore(game.result, true);
  const anchorUser = blendAnchorUser(
    calibration.perceivedUserElo,
    crsAnchorElo,
    calibration.calibrationGames
  );
  const expected = expectedScore(anchorUser, playedChimeraElo);
  let surprise = userScore - expected;
  surprise *= moveEfficiencyMultiplier(game.result, game.moves.length);

  const games = calibration.calibrationGames + 1;
  const k = calibrationKFactor(games, calibration.confidence);
  const cap = maxSingleStep(games, calibration.confidence);

  let chimeraDelta = Math.round(k * surprise);
  chimeraDelta = Math.max(-cap, Math.min(cap, chimeraDelta));

  let newStored = clampElo(storedChimeraElo + chimeraDelta, 80, 3200);

  const target = challengeTargetElo(anchorUser);
  if (userScore >= 0.5 && newStored < target - 90) {
    const pull = Math.min(cap, Math.round((target - newStored) * 0.42));
    newStored = clampElo(newStored + pull, 80, 3200);
    chimeraDelta = newStored - storedChimeraElo;
  } else if (userScore <= 0 && newStored > target + 120) {
    const pull = Math.min(cap, Math.round((newStored - target) * 0.35));
    newStored = clampElo(newStored - pull, 80, 3200);
    chimeraDelta = newStored - storedChimeraElo;
  }

  const perceivedK = Math.round(k * 0.52);
  let perceivedDelta = Math.round(perceivedK * surprise);
  perceivedDelta = Math.max(-cap, Math.min(cap, perceivedDelta));
  const newPerceived = clampElo(
    calibration.perceivedUserElo + perceivedDelta,
    100,
    3200
  );

  const confidence = Math.min(1, 1 - Math.exp(-games / 16));

  const note =
    surprise > 0.35
      ? "You outplayed this CHIMERA setting — strength increased."
      : surprise < -0.35
        ? "CHIMERA had your measure — strength eased."
        : "Fine-tuning CHIMERA for your level.";

  return {
    newStoredElo: newStored,
    delta: newStored - storedChimeraElo,
    calibration: {
      perceivedUserElo: newPerceived,
      confidence,
      calibrationGames: games,
      lastPlayedElo: playedChimeraElo,
    },
    note,
  };
}

export function calibrationStatusLabel(
  calibration: ChimeraCalibrationState
): string | null {
  if (calibration.confidence >= 0.82) return null;
  const pct = Math.round(calibration.confidence * 100);
  return `Calibrating · ${pct}%`;
}

export function runCalibrationSanityChecks(): void {
  const base: ChimeraCalibrationState = {
    perceivedUserElo: 400,
    confidence: 0.1,
    calibrationGames: 2,
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
  if (wipe.delta < 40) {
    throw new Error(
      `Expected large CHIMERA bump after fast win, got delta=${wipe.delta}`
    );
  }

  const loss = calibrateAfterGame({
    storedChimeraElo: 1200,
    playedChimeraElo: 1180,
    calibration: {
      perceivedUserElo: 900,
      confidence: 0.3,
      calibrationGames: 5,
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
