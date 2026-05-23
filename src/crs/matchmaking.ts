import type { CrsMode } from "./types";

/** Default CRS pairing window — expands while queued (seconds → max delta). */
export const MATCHMAKING_BANDS: { afterSec: number; maxDelta: number }[] = [
  { afterSec: 0, maxDelta: 100 },
  { afterSec: 5, maxDelta: 150 },
  { afterSec: 10, maxDelta: 250 },
  { afterSec: 20, maxDelta: 500 },
];

export function matchmakingDelta(waitSec: number): number {
  let delta = 100;
  for (const band of MATCHMAKING_BANDS) {
    if (waitSec >= band.afterSec) delta = band.maxDelta;
  }
  return delta;
}

export function canPair(
  ratingA: number,
  ratingB: number,
  waitSec: number,
  rdA = 200,
  rdB = 200
): boolean {
  const band = matchmakingDelta(waitSec);
  const uncertainty = Math.min(80, (rdA + rdB) / 8);
  return Math.abs(ratingA - ratingB) <= band + uncertainty;
}

export function modeRatingKey(mode: CrsMode): string {
  return `${mode}CRS`;
}
