import type { CrsUpdateInput } from "./types";
import type { CrsResult } from "./types";

export function performanceLabel(score: number, result: CrsResult): string {
  if (result === "win") {
    if (score >= 90) return "Excellent";
    if (score >= 78) return "Strong";
    return "Resilient";
  }
  if (result === "draw") return "Balanced";
  if (score >= 80) return "Above average";
  if (score >= 68) return "Competitive";
  return "Learning";
}

export function buildPostGameInsight(
  input: CrsUpdateInput,
  result: CrsResult,
  delta: number
): string {
  if (result === "loss" && input.accuracy >= 80) {
    return "You lost on the scoreboard, but your decision quality stayed above your rating band — keep this accuracy.";
  }
  if (result === "win" && input.blunders >= 2) {
    return "Victory earned with tension — tightening late-game focus will convert more clean wins.";
  }
  if (delta >= 15) {
    return "You outperformed expectation — CRS is adjusting quickly to reflect your true level.";
  }
  if (input.avgCpLoss < 30) {
    return "Low centipawn loss — your consistency index is improving.";
  }
  return "Every rated game refines your cognitive profile — review critical moments to accelerate growth.";
}

/** Profile-level improvement bullets from CRS + memory stats. */
export function buildImprovementInsights(opts: {
  recentScores: number[];
  blunderRate: number;
  avgAccuracy: number;
  gamesPlayed: number;
}): string[] {
  const lines: string[] = [];
  const form = opts.recentScores.slice(-5);
  const formAvg =
    form.length > 0 ? form.reduce((a, b) => a + b, 0) / form.length : 0.5;

  if (form.length >= 3 && formAvg >= 0.7) {
    lines.push("Recent form trending upward — confidence index rising.");
  }
  if (opts.blunderRate < 0.15 && opts.gamesPlayed > 5) {
    lines.push(`Blunder rate reduced — holding ${Math.round((1 - opts.blunderRate) * 100)}% clean games.`);
  }
  if (opts.avgAccuracy >= 82) {
    lines.push("Opening-to-middlegame accuracy above your class average.");
  }
  if (form.length >= 4 && formAvg < 0.35) {
    lines.push("Under pressure performance declining — consider slower time controls.");
  }
  if (lines.length === 0) {
    lines.push("Play more rated games to unlock personalised improvement intelligence.");
  }
  return lines.slice(0, 4);
}
