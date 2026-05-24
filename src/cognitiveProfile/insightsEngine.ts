import { getAxisMeta } from "../intelligence/config";
import type { IntelligencePhenotypeKey } from "../intelligence/types";
import type { MistakePatternFamily } from "../mistakeIntel/types";
import { linearSlope, windowMean } from "./seriesBuilder";
import type { GameSeriesPoint } from "./types";
import type { InsightBullet, OpeningPersonalitySlice, ProfileInsightsSnapshot } from "./types";

function bullet(
  id: string,
  title: string,
  detail: string,
  confidence: number,
  metric?: string
): InsightBullet {
  return { id, title, detail, confidence, metric };
}

function openingSlices(series: GameSeriesPoint[]): OpeningPersonalitySlice[] {
  const map = new Map<string, { acc: number[]; count: number }>();
  for (const p of series) {
    const token = p.openingLine.split(" ")[0] ?? "general";
    const label =
      token.length > 3 ? token : p.openingLine.slice(0, 24) || "General structures";
    const cur = map.get(label) ?? { acc: [], count: 0 };
    cur.acc.push(p.openingAccuracy);
    cur.count++;
    map.set(label, cur);
  }
  const total = series.length || 1;
  return [...map.entries()]
    .map(([label, v]) => {
      const slope = linearSlope(v.acc);
      return {
        label,
        share: Math.round((v.count / total) * 100),
        avgOpeningAccuracy: Math.round(windowMean(v.acc)),
        trend: slope > 0.8 ? "up" : slope < -0.8 ? "down" : "flat",
      } as OpeningPersonalitySlice;
    })
    .sort((a, b) => b.share - a.share)
    .slice(0, 6);
}

export function buildProfileInsights(
  series: GameSeriesPoint[],
  families: MistakePatternFamily[] = []
): ProfileInsightsSnapshot {
  const improvements: InsightBullet[] = [];
  const weaknessCycles: InsightBullet[] = [];
  const longTerm: InsightBullet[] = [];

  const axes: IntelligencePhenotypeKey[] = [
    "tacticalSharpness",
    "aggression",
    "endgameDiscipline",
    "openingConfidence",
    "timePressureResilience",
  ];

  for (const key of axes) {
    const vals = series.map((p) => p.phenotype[key]);
    const slope = linearSlope(vals);
    const invert = getAxisMeta(key).invertScale;
    const effective = invert ? -slope : slope;
    if (effective > 1.5) {
      improvements.push(
        bullet(
          `imp-${key}`,
          getAxisMeta(key).label,
          `+${effective.toFixed(1)} pts/game slope over ${series.length} reviewed sessions.`,
          64,
          key
        )
      );
    } else if (effective < -1.5) {
      weaknessCycles.push(
        bullet(
          `weak-${key}`,
          getAxisMeta(key).label,
          `Downward slope (${effective.toFixed(1)} pts/game) — active weakness cycle.`,
          62,
          key
        )
      );
    }
  }

  const accSlope = linearSlope(series.map((p) => p.accuracy));
  if (accSlope > 0.5) {
    longTerm.push(
      bullet(
        "lt-acc",
        "Accuracy trajectory",
        `Long-term accuracy drift +${accSlope.toFixed(1)}% per reviewed game.`,
        68,
        "accuracy"
      )
    );
  }
  const agFirst = windowMean(
    series.slice(0, Math.ceil(series.length / 3)).map((p) => p.phenotype.aggression)
  );
  const agLast = windowMean(
    series.slice(-Math.ceil(series.length / 3)).map((p) => p.phenotype.aggression)
  );
  if (Math.abs(agLast - agFirst) > 8) {
    longTerm.push(
      bullet(
        "lt-ag",
        "Aggression profile",
        agLast > agFirst
          ? `You became significantly more aggressive between early and recent games (${Math.round(agFirst)}→${Math.round(agLast)}).`
          : `Aggression compressed (${Math.round(agFirst)}→${Math.round(agLast)}) — style shifted toward control.`,
        70,
        "aggression"
      )
    );
  }

  const mistakeFamilyEvolution = families
    .filter((f) => f.occurrences >= 2)
    .slice(0, 5)
    .map((f) =>
      bullet(
        `mf-${f.id}`,
        f.label,
        `${f.occurrences} occurrences · last: ${f.sampleHeadline}`,
        Math.min(85, 50 + f.occurrences * 6),
        f.id
      )
    );

  const heatmapTrends: InsightBullet[] = [];
  const blindProxy = series.map((p) => 100 - p.phenotype.tacticalSharpness);
  if (linearSlope(blindProxy) < -1) {
    heatmapTrends.push(
      bullet(
        "heat-tac",
        "Tactical blind-zone pressure",
        "Tactical vulnerability scores are easing — fewer high-leverage oversights in reviewed games.",
        58
      )
    );
  }
  const kingProxy = series.map((p) => p.phenotype.confidence);
  if (linearSlope(kingProxy) > 1) {
    heatmapTrends.push(
      bullet(
        "heat-conf",
        "Decision confidence",
        "Competitive confidence heat trend rising — you commit faster when lines are sound.",
        60
      )
    );
  }

  return {
    biggestImprovements: improvements.slice(0, 5),
    biggestWeaknessCycles: weaknessCycles.slice(0, 5),
    longTermTrends: longTerm.slice(0, 5),
    openingPersonality: openingSlices(series),
    mistakeFamilyEvolution,
    heatmapTrends,
  };
}
