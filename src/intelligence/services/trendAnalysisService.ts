import type { PerformanceTrends, TrendAnalysisInput, TrendMetric } from "../types";
import { INTELLIGENCE_CONFIG } from "../config";
import { avg } from "../utils/math";

export function analyzePerformanceTrends(
  input: TrendAnalysisInput
): PerformanceTrends {
  const { archive, current, memory } = input;
  const recent = archive.reports
    .filter((r) => r.gameId !== current.gameId)
    .slice(-INTELLIGENCE_CONFIG.trendWindowGames);

  const prevAccuracies = recent.map((r) => r.gameAnalysis.accuracy);
  const prevAcpls = recent.map((r) => r.gameAnalysis.acpl);
  const prevBlunderRates = recent.map((r) =>
    r.gameAnalysis.userMoves
      ? r.gameAnalysis.blunders / r.gameAnalysis.userMoves
      : 0
  );

  const winRate = computeWinRate(memory, recent.length + 1);

  return {
    accuracy: buildTrend("accuracy", "Accuracy", current.accuracy, avg(prevAccuracies), true),
    acpl: buildTrend("acpl", "ACPL", current.acpl, avg(prevAcpls), false),
    blunderRate: buildTrend(
      "blunderRate",
      "Blunder rate",
      current.userMoves ? current.blunders / current.userMoves : 0,
      avg(prevBlunderRates),
      false
    ),
    winRate: {
      key: "winRate",
      label: "Win rate (recent)",
      current: Math.round(winRate * 100),
      previousAvg: Math.round(winRate * 100),
      delta: 0,
      direction: "stable",
    },
    streakLabel: streakLabelFrom(memory),
  };
}

function buildTrend(
  key: string,
  label: string,
  current: number,
  previousAvg: number,
  higherIsBetter: boolean
): TrendMetric {
  const delta = Math.round((current - previousAvg) * 10) / 10;
  let direction: TrendMetric["direction"] = "stable";
  if (Math.abs(delta) > 2) {
    const improved = higherIsBetter ? delta > 0 : delta < 0;
    direction = improved ? "improving" : "declining";
  }
  return { key, label, current, previousAvg: Math.round(previousAvg * 10) / 10, delta, direction };
}

function computeWinRate(
  memory: TrendAnalysisInput["memory"],
  window: number
): number {
  const games = memory.games.slice(-window);
  if (!games.length) return 0.5;
  const wins = games.filter((g) => g.result === "user-win").length;
  return wins / games.length;
}

function streakLabelFrom(memory: TrendAnalysisInput["memory"]): string {
  const recent = memory.games.slice(-5);
  if (!recent.length) return "Building baseline";
  let streak = 0;
  const last = recent[recent.length - 1].result;
  for (let i = recent.length - 1; i >= 0; i--) {
    if (recent[i].result === last) streak++;
    else break;
  }
  if (last === "user-win") return streak >= 2 ? `${streak}-game win streak` : "Bounce-back opportunity";
  if (last === "draw") return "Drawing trend — conversion focus";
  return streak >= 2 ? `${streak}-game learning stretch` : "Reset after tough result";
}
