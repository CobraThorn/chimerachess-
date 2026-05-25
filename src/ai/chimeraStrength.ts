import { CHIMERA_MAX_THINK_MS } from "../chess/movePacing";
import { ensureCrsState } from "../crs/profile";
import { ensureChimeraCalibration } from "./chimeraCalibration";
import { clampElo } from "./elo";
import type { ChimeraMemory } from "./types";
import { INITIAL_CHIMERA_ELO, INITIAL_USER_ELO } from "./types";

/** Best estimate of the human's strength (CRS, mode ratings, style Elo). */
export function getUserStrength(memory: ChimeraMemory): number {
  const crs = ensureCrsState(memory);
  const styleElo = memory.userStyle?.elo ?? INITIAL_USER_ELO;
  const modePeak = Math.max(
    crs.chimeraRating,
    ...Object.values(crs.modeRatings)
  );
  return clampElo(Math.max(styleElo, modePeak), 80, 3000);
}

function recentUserWinStreak(memory: ChimeraMemory): number {
  let streak = 0;
  for (let i = memory.games.length - 1; i >= 0; i--) {
    if (memory.games[i].result === "user-win") streak++;
    else break;
  }
  return streak;
}

/** Engine target strength — scales up vs strong players so CHIMERA stays competitive. */
export function getChallengeFloor(memory: ChimeraMemory, user: number): number {
  const stats = memory.stats;
  const games = stats?.totalGames ?? 0;
  const userWins = stats?.userWins ?? 0;
  const winRate = games >= 6 ? userWins / games : 0;
  const streak = recentUserWinStreak(memory);

  let floor: number;
  if (user < 700) floor = user + 30;
  else if (user < 1000) floor = user + 50;
  else if (user < 1400) floor = user + 90;
  else if (user < 1800) floor = user + 140;
  else if (user < 2200) floor = user + 200;
  else floor = user + 260;

  if (games >= 5 && winRate >= 0.65) floor += 80;
  if (games >= 8 && winRate >= 0.78) floor += 140;
  if (streak >= 3) floor += 60 + (streak - 2) * 40;

  return Math.min(3200, Math.round(floor));
}

/** Elo used for Stockfish limits, think time, and blunder rate. */
export function effectiveChimeraElo(memory: ChimeraMemory): number {
  const stored = memory.chimeraElo ?? INITIAL_CHIMERA_ELO;
  const cal = ensureChimeraCalibration(memory);
  const user = Math.max(getUserStrength(memory), cal.perceivedUserElo);
  const floor = getChallengeFloor(memory, user);
  const confidence =
    cal.ratingDeviation !== undefined
      ? Math.min(1, Math.max(0, 1 - cal.ratingDeviation / 320))
      : cal.confidence;

  if (confidence >= 0.78) {
    return Math.min(3200, Math.max(stored, user + 25));
  }

  const blend = confidence;
  const target = Math.round(stored * blend + Math.max(stored, floor) * (1 - blend));
  return Math.min(3200, Math.max(target, stored));
}

export function blunderRateForStrength(
  targetElo: number,
  adapt: number,
  mirror: boolean,
  biasDelta: number,
  learnDelta: number
): number {
  if (mirror) {
    return Math.min(
      0.35,
      Math.max(
        0.05,
        Math.max(0.15, 0.35 - adapt * 0.003) + biasDelta + learnDelta
      )
    );
  }

  let base: number;
  if (targetElo >= 2600) base = 0;
  else if (targetElo >= 2400) base = 0.006;
  else if (targetElo >= 2200) base = 0.015;
  else if (targetElo >= 2000) base = 0.035;
  else if (targetElo >= 1800) base = 0.055;
  else if (targetElo >= 1600) base = 0.075;
  else if (targetElo >= 1400) base = 0.095;
  else if (targetElo >= 1000) base = 0.11;
  else base = Math.max(0.08, 0.22 - adapt * 0.002);

  return Math.min(0.35, Math.max(0, base + biasDelta + learnDelta));
}

export function chimeraThinkTimeMs(
  targetElo: number,
  mirror: boolean,
  mult: number
): number {
  if (mirror) return 140;

  let base: number;
  if (targetElo >= 2600) base = 2400;
  else if (targetElo >= 2400) base = 1700;
  else if (targetElo >= 2200) base = 1200;
  else if (targetElo >= 2000) base = 800;
  else if (targetElo >= 1800) base = 560;
  else if (targetElo >= 1600) base = 420;
  else if (targetElo >= 1400) base = 340;
  else if (targetElo >= 1000) base = 280;
  else base = Math.min(360, Math.max(150, 110 + Math.floor(targetElo / 8)));

  return Math.min(CHIMERA_MAX_THINK_MS, Math.round(base * mult));
}

export function chimeraSearchDepth(targetElo: number, baseDepth: number): number {
  if (targetElo >= 2600) return Math.min(22, baseDepth + 6);
  if (targetElo >= 2400) return Math.min(20, baseDepth + 5);
  if (targetElo >= 2200) return Math.min(18, baseDepth + 4);
  if (targetElo >= 2000) return Math.min(17, baseDepth + 3);
  return baseDepth;
}

/** Near-max strength — skip UCI_Elo cap for titled-level challenge. */
export function useFullEngineStrength(targetElo: number): boolean {
  return targetElo >= 2850;
}

/** Perceived human strength from calibration (vs-CHIMERA games). */
export function getPerceivedUserElo(memory: ChimeraMemory): number {
  return ensureChimeraCalibration(memory).perceivedUserElo;
}
