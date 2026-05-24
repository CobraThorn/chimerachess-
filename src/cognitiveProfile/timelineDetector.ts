import { getAxisMeta } from "../intelligence/config";
import type { IntelligencePhenotypeKey } from "../intelligence/types";
import type { MistakePatternFamily } from "../mistakeIntel/types";
import { COGNITIVE_PROFILE_CONFIG as CFG } from "./config";
import { linearSlope, windowMean, windowStdDev } from "./seriesBuilder";
import type { GameSeriesPoint } from "./types";
import type { CognitiveTimelineEvent, CognitiveTimelineEventType } from "./types";

function evt(
  partial: Omit<CognitiveTimelineEvent, "importanceScore"> & {
    importanceScore?: number;
  }
): CognitiveTimelineEvent {
  const type = partial.type;
  const boost = CFG.importanceWeightByType[type] ?? 1;
  const importanceScore =
    partial.importanceScore ??
    Math.round(
      Math.min(100, partial.confidence * 0.6 + Math.abs(partial.evidence[0]?.change ?? 0) * boost)
    );
  return { ...partial, importanceScore };
}

function detectPhenotypeWindows(series: GameSeriesPoint[]): CognitiveTimelineEvent[] {
  const events: CognitiveTimelineEvent[] = [];
  const w = CFG.windowShort;

  const axes: IntelligencePhenotypeKey[] = [
    "aggression",
    "positionalDiscipline",
    "tacticalSharpness",
    "endgameDiscipline",
    "openingConfidence",
    "timePressureResilience",
    "confidence",
    "tiltTendency",
  ];

  for (const key of axes) {
    const values = series.map((p) => p.phenotype[key]);
    for (let i = w; i < series.length; i++) {
      const prev = values.slice(i - w, i);
      const curr = values.slice(i, Math.min(series.length, i + w));
      if (curr.length < w) continue;

      const prevMean = windowMean(prev);
      const currMean = windowMean(curr);
      const delta = Math.round(currMean - prevMean);
      const invert = getAxisMeta(key).invertScale;
      const effectiveDelta = invert ? -delta : delta;

      const from = series[i - w]!;
      const to = series[Math.min(series.length - 1, i + w - 1)]!;

      if (effectiveDelta >= CFG.phenotypeBreakthroughDelta) {
        events.push(
          evt({
            id: `ph-break-${key}-${to.gameId}`,
            timestamp: to.at,
            type: "breakthrough",
            title: `${getAxisMeta(key).label} lifted`,
            explanation: `Between games ${from.index}–${to.index}, ${getAxisMeta(key).label.toLowerCase()} rose by ~${effectiveDelta} points in your phenotype model.`,
            confidence: Math.min(88, 55 + series.length * 2),
            evidence: [
              {
                metric: key,
                change: effectiveDelta,
                explanation: `Window mean ${Math.round(prevMean)} → ${Math.round(currMean)}.`,
              },
            ],
            relatedPhenotypes: [key],
            gameRange: { from: from.index, to: to.index },
          })
        );
      } else if (effectiveDelta <= CFG.phenotypeCollapseDelta) {
        events.push(
          evt({
            id: `ph-collapse-${key}-${to.gameId}`,
            timestamp: to.at,
            type: "collapse",
            title: `${getAxisMeta(key).label} declined`,
            explanation: `Games ${from.index}–${to.index}: sustained drop in ${getAxisMeta(key).label.toLowerCase()} (~${effectiveDelta} pts).`,
            confidence: Math.min(85, 52 + series.length * 2),
            evidence: [
              {
                metric: key,
                change: effectiveDelta,
                explanation: `Window mean ${Math.round(prevMean)} → ${Math.round(currMean)}.`,
              },
            ],
            relatedPhenotypes: [key],
            gameRange: { from: from.index, to: to.index },
          })
        );
      }
    }
  }
  return events;
}

function detectPerformanceWindows(series: GameSeriesPoint[]): CognitiveTimelineEvent[] {
  const events: CognitiveTimelineEvent[] = [];
  const acc = series.map((p) => p.accuracy);
  const w = CFG.windowShort;

  for (let i = w; i < series.length; i++) {
    const prev = acc.slice(i - w, i);
    const curr = acc.slice(i, Math.min(series.length, i + w));
    if (curr.length < w) continue;
    const delta = Math.round(windowMean(curr) - windowMean(prev));
    const from = series[i - w]!;
    const to = series[Math.min(series.length - 1, i + w - 1)]!;

    if (delta >= CFG.accuracyBreakthroughDelta) {
      events.push(
        evt({
          id: `acc-break-${to.gameId}`,
          timestamp: to.at,
          type: "breakthrough",
          title: "Accuracy band shifted up",
          explanation: `Accuracy improved ~${delta}% between games ${from.index}–${to.index}.`,
          confidence: 70,
          evidence: [{ metric: "accuracy", change: delta, explanation: "Rolling window mean." }],
          gameRange: { from: from.index, to: to.index },
        })
      );
    } else if (delta <= CFG.accuracyCollapseDelta) {
      events.push(
        evt({
          id: `acc-collapse-${to.gameId}`,
          timestamp: to.at,
          type: "collapse",
          title: "Accuracy compression",
          explanation: `Accuracy fell ~${Math.abs(delta)}% across games ${from.index}–${to.index}.`,
          confidence: 68,
          evidence: [{ metric: "accuracy", change: delta, explanation: "Rolling window mean." }],
          gameRange: { from: from.index, to: to.index },
        })
      );
    }
  }

  const std = windowStdDev(acc);
  if (series.length >= CFG.minGamesForMaturity && std >= CFG.volatilityStdDevMin) {
    const last = series[series.length - 1]!;
    events.push(
      evt({
        id: `vol-${last.gameId}`,
        timestamp: last.at,
        type: "volatility",
        title: "High performance volatility",
        explanation: `Accuracy std dev ~${std.toFixed(1)}% over ${series.length} reviewed games — outcomes swing more than your baseline.`,
        confidence: 62,
        importanceScore: 55,
        evidence: [
          {
            metric: "accuracy_std",
            change: std,
            explanation: "Elevated variance in decision quality.",
          },
        ],
        gameRange: { from: 1, to: series.length },
      })
    );
  }

  const slope = linearSlope(acc);
  if (series.length >= 8 && Math.abs(slope) < 0.3 && std <= CFG.plateauStdDevMax) {
    const last = series[series.length - 1]!;
    events.push(
      evt({
        id: `plateau-${last.gameId}`,
        timestamp: last.at,
        type: "plateau",
        title: "Performance plateau",
        explanation: `Accuracy held in a narrow band (σ≈${std.toFixed(1)}%) — marginal gains likely need targeted training, not volume alone.`,
        confidence: 58,
        importanceScore: 48,
        evidence: [
          { metric: "accuracy_slope", change: slope, explanation: "Near-flat trend." },
        ],
        gameRange: { from: Math.max(1, series.length - 10), to: series.length },
      })
    );
  }

  return events;
}

function detectRecoveries(series: GameSeriesPoint[]): CognitiveTimelineEvent[] {
  const events: CognitiveTimelineEvent[] = [];
  const key: IntelligencePhenotypeKey = "endgameDiscipline";
  const values = series.map((p) => p.phenotype[key]);

  let declineRun = 0;
  for (let i = 1; i < values.length; i++) {
    const d = values[i]! - values[i - 1]!;
    if (d < -2) declineRun++;
    else if (d > 2 && declineRun >= CFG.recoveryMinDeclineGames) {
      const pt = series[i]!;
      events.push(
        evt({
          id: `recovery-${key}-${pt.gameId}`,
          timestamp: pt.at,
          type: "recovery",
          title: "Endgame discipline recovered",
          explanation: `A ${declineRun}-game decline in endgame discipline ended — technique scores are climbing again.`,
          confidence: 65,
          evidence: [
            {
              metric: key,
              change: d,
              explanation: `Rebound at game ${pt.index}.`,
            },
          ],
          relatedPhenotypes: [key],
          gameRange: { from: Math.max(1, pt.index - declineRun - 2), to: pt.index },
        })
      );
      declineRun = 0;
    } else if (d >= 0) {
      declineRun = Math.max(0, declineRun - 1);
    }
  }
  return events;
}

function detectOpeningGrowth(series: GameSeriesPoint[]): CognitiveTimelineEvent[] {
  const events: CognitiveTimelineEvent[] = [];
  const opening = series.map((p) => p.openingAccuracy);
  const slope = linearSlope(opening);
  if (series.length >= 6 && slope > 1.2) {
    const last = series[series.length - 1]!;
    events.push(
      evt({
        id: `opening-growth-${last.gameId}`,
        timestamp: last.at,
        type: "opening_growth",
        title: "Opening-phase accuracy trending up",
        explanation: `Early-game accuracy slope +${slope.toFixed(1)}% per game — repertoire trust or preparation is compounding.`,
        confidence: 64,
        evidence: [
          {
            metric: "openingAccuracy",
            change: slope,
            explanation: "Linear trend over reviewed games.",
          },
        ],
        relatedPhenotypes: ["openingConfidence"],
        gameRange: { from: 1, to: series.length },
      })
    );
  }
  return events;
}

function detectTimePressure(series: GameSeriesPoint[]): CognitiveTimelineEvent[] {
  const events: CognitiveTimelineEvent[] = [];
  const clk = series.map((p) => p.phenotype.timePressureResilience);
  const slope = linearSlope(clk);
  const withTime = series.filter((p) => p.avgMoveTimeMs !== undefined);
  if (series.length >= 6 && slope > 1) {
    const last = series[series.length - 1]!;
    events.push(
      evt({
        id: `clk-${last.gameId}`,
        timestamp: last.at,
        type: "time_pressure_change",
        title: "Clock resilience improved",
        explanation: `Time-pressure resilience rose steadily — decision quality under faster move times is stabilizing.`,
        confidence: 60,
        evidence: [
          {
            metric: "timePressureResilience",
            change: slope,
            explanation: "Phenotype slope over series.",
          },
        ],
        relatedPhenotypes: ["timePressureResilience"],
        gameRange: { from: 1, to: series.length },
      })
    );
  }
  if (withTime.length >= 5) {
    const fast = withTime.filter((p) => (p.avgMoveTimeMs ?? 99999) < 4000);
    const slow = withTime.filter((p) => (p.avgMoveTimeMs ?? 0) >= 4000);
    if (fast.length >= 3 && slow.length >= 3) {
      const fastAcc = windowMean(fast.map((p) => p.accuracy));
      const slowAcc = windowMean(slow.map((p) => p.accuracy));
      if (slowAcc - fastAcc > 8) {
        const last = series[series.length - 1]!;
        events.push(
          evt({
            id: `clk-fast-${last.gameId}`,
            timestamp: last.at,
            type: "time_pressure_change",
            title: "Fast moves cost accuracy",
            explanation: `Games with sub-4s average think time average ${Math.round(fastAcc)}% accuracy vs ${Math.round(slowAcc)}% when slower — clock management is a leverage point.`,
            confidence: 62,
            evidence: [
              {
                metric: "avgMoveTimeMs",
                change: slowAcc - fastAcc,
                explanation: "Fast vs slow bucket accuracy gap.",
              },
            ],
            relatedPhenotypes: ["timePressureResilience"],
          })
        );
      }
    }
  }
  return events;
}

function detectMistakePatterns(
  families: MistakePatternFamily[]
): CognitiveTimelineEvent[] {
  const events: CognitiveTimelineEvent[] = [];
  for (const f of families) {
    if (f.occurrences < 3) continue;
    events.push(
      evt({
        id: `mistake-fam-${f.id}`,
        timestamp: f.lastSeenAt,
        type: "mistake_pattern",
        title: `Recurring: ${f.label}`,
        explanation: `Detected ${f.occurrences} times across your archive — "${f.sampleHeadline}".`,
        confidence: Math.min(90, 50 + f.occurrences * 8),
        evidence: [
          {
            metric: f.id,
            change: f.occurrences,
            explanation: "Cross-game mistake family counter.",
          },
        ],
        relatedMistakes: [f.id],
      })
    );
  }
  return events;
}

function dedupeEvents(events: CognitiveTimelineEvent[]): CognitiveTimelineEvent[] {
  const seen = new Set<string>();
  const out: CognitiveTimelineEvent[] = [];
  for (const e of events.sort((a, b) => b.importanceScore - a.importanceScore)) {
    const key = `${e.type}:${e.relatedPhenotypes?.[0] ?? e.title}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out.sort((a, b) => b.timestamp - a.timestamp);
}

export function detectCognitiveTimeline(
  series: GameSeriesPoint[],
  mistakeFamilies: MistakePatternFamily[] = []
): CognitiveTimelineEvent[] {
  if (series.length < CFG.minGamesForTimeline) return [];

  const all = [
    ...detectPhenotypeWindows(series),
    ...detectPerformanceWindows(series),
    ...detectRecoveries(series),
    ...detectOpeningGrowth(series),
    ...detectTimePressure(series),
    ...detectMistakePatterns(mistakeFamilies),
  ];

  return dedupeEvents(all).slice(0, CFG.maxTimelineEvents);
}

export function filterTimeline(
  events: CognitiveTimelineEvent[],
  type: CognitiveTimelineEventType | "all"
): CognitiveTimelineEvent[] {
  if (type === "all") return events;
  return events.filter((e) => e.type === type);
}
