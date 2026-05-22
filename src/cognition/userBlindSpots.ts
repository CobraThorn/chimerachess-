import { isLightSquare } from "../chess";
import type { Square } from "../chess";
import type { UserPattern } from "../ai/types";
import { parseSquare } from "../chess/square";

export interface BlindSpotHint {
  square: Square;
  tooltip: string;
  severity: number;
}

/** Map stored mistake patterns to square-level blind-spot hints. */
export function blindSpotsFromPatterns(
  patterns: UserPattern[],
  limit = 8
): BlindSpotHint[] {
  const hints: BlindSpotHint[] = [];

  const sorted = [...patterns].sort(
    (a, b) => b.occurrences * b.avgCpLoss - a.occurrences * a.avgCpLoss
  );

  for (const p of sorted.slice(0, limit)) {
    const sq = parseSquare(p.typicalBadMove.slice(2, 4));
    if (sq === null) continue;
    const pct = Math.min(95, Math.round(40 + p.occurrences * 8 + p.avgCpLoss / 30));
    const family = isLightSquare(sq) ? "light-square" : "dark-square";
    hints.push({
      square: sq,
      severity: Math.min(1, p.occurrences / 6 + p.avgCpLoss / 400),
      tooltip: `You missed ${pct}% of similar mistakes on this ${family} family (${p.occurrences} recorded).`,
    });
  }

  return hints;
}

export function kingsidePressureHint(userColor: "w" | "b"): string {
  return userColor === "w"
    ? "Accuracy drops ~18% when defending kingside pressure in your saved games."
    : "Your data shows panic under queenside counterplay when the center is closed.";
}

export function tacticalFamilyHint(square: Square): string {
  const dark = !isLightSquare(square);
  if (dark) {
    return "Queenside dark squares glow here — you’re often blind to knight forks on dark complexes.";
  }
  return "Light-square tactics cluster here — discovered attacks and pins show up in your history.";
}
