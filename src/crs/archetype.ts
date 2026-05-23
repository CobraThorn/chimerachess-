import type { PlayStyleProfile } from "../ai/playStyle";

/** Dynamic player archetype from behavioural fingerprint. */
export function derivePlayerArchetype(style: PlayStyleProfile): string {
  const moves = Math.max(1, style.moves);
  const agg =
    (style.captures + style.checks + style.sacrifices) / moves;
  const quiet = style.quietMoves / moves;
  const end = style.endgameMoves / moves;
  const tac = (style.checks + style.sacrifices) / moves;
  const blunderRate = style.blunders / Math.max(1, style.moves / 12);

  if (tac > 0.22 && agg > 0.35) return "Aggressive Tactician";
  if (quiet > 0.55 && blunderRate < 0.08) return "Positional Grinder";
  if (end > 0.28) return "Endgame Specialist";
  if (style.earlyQueen > 2 && agg > 0.3) return "Chaos Creator";
  if (style.prophylaxis > 8 && quiet > 0.45) return "Calculated Predator";
  if (style.castles > 3 && style.development > 15) return "Classical Developer";
  if (blunderRate > 0.15) return "High-Variance Fighter";
  return "Adaptive Strategist";
}
