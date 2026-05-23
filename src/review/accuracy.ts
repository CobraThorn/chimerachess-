/** CAPS-style move accuracy from centipawn loss (chess.com / lichess family). */
export function cpLossToAccuracy(cpLoss: number): number {
  const loss = Math.max(0, cpLoss);
  const raw = 103.1668 * Math.exp(-0.04354 * loss) - 3.1669;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function averageAccuracy(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 100;
  const sum = cpLosses.reduce((s, l) => s + cpLossToAccuracy(l), 0);
  return Math.round(sum / cpLosses.length);
}

export function averageCentipawnLoss(cpLosses: number[]): number {
  if (cpLosses.length === 0) return 0;
  return Math.round(cpLosses.reduce((a, b) => a + b, 0) / cpLosses.length);
}
