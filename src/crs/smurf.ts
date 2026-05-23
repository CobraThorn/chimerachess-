import type { CrsUpdateInput } from "./types";

/**
 * Fast-track when performance massively exceeds rating band.
 * Returns extra modifier (0–0.12), capped by formula layer.
 */
export function detectSmurfBoost(input: CrsUpdateInput): number {
  if (input.score < 0.5) return 0;
  const gap = input.opponentRating - input.playerRating;
  if (gap < 40) return 0;

  if (input.accuracy >= 92 && input.performanceScore >= 88 && input.avgCpLoss < 25) {
    return 0.12;
  }
  if (input.accuracy >= 85 && input.performanceScore >= 82) {
    return 0.06;
  }
  return 0;
}
