/** User-facing labels — engine still uses centipawns internally. */

export function cpToPawns(cp: number): number {
  return Math.round((Math.max(0, cp) / 100) * 10) / 10;
}

/** e.g. "0.4 pawns" or "1.2 pawns" */
export function formatPawnAmount(cp: number): string {
  const p = cpToPawns(cp);
  if (p < 0.05) return "a tiny edge";
  return `${p} pawn${p === 1 ? "" : "s"}`;
}

/** Short miss size word for chips and lists */
export function missSizeWord(cp: number): string {
  const p = cpToPawns(cp);
  if (p < 0.15) return "tiny miss";
  if (p < 0.35) return "small miss";
  if (p < 0.75) return "clear miss";
  if (p < 1.5) return "big miss";
  return "game-swinging miss";
}

/** Header stat: average mistake size per move */
export function formatAvgMissPerMove(acpl: number): string {
  const p = cpToPawns(acpl);
  if (p < 0.05) return "Minimal";
  return `${p.toFixed(1)} pawns`;
}

export function avgMissSubtext(): string {
  return "avg. mistake size per move";
}

/** Overall game quality from average miss (ACPL internally) */
export function playQualityFromAcpl(acpl: number): {
  label: string;
  hint: string;
} {
  if (acpl <= 25) {
    return { label: "Excellent", hint: "Very few meaningful mistakes" };
  }
  if (acpl <= 45) {
    return { label: "Strong", hint: "Most moves matched the engine" };
  }
  if (acpl <= 70) {
    return { label: "Decent", hint: "Some loose moves — review the rail" };
  }
  if (acpl <= 120) {
    return { label: "Inconsistent", hint: "Key moments cost material or tempo" };
  }
  return { label: "Rough", hint: "Several big misses — focus on the heat map" };
}

/** One-line comparison for move insights */
export function formatEnginePreferredOver(
  bestUci: string,
  playedUci: string,
  cpLoss: number
): string {
  if (cpLoss < 8) {
    return `Engine slightly preferred ${bestUci} over ${playedUci}.`;
  }
  return `Engine preferred ${bestUci} — about ${formatPawnAmount(cpLoss)} better than ${playedUci}.`;
}

/** Eval swing in plain language */
export function formatEvalSwing(cpLoss: number): string {
  if (cpLoss < 15) return "Position stayed roughly equal.";
  return `Roughly ${formatPawnAmount(cpLoss)} slipped away on this move.`;
}
