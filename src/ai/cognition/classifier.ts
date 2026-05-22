import {
  PRIMARY_ARCHETYPES,
  type PrimaryArchetypeDef,
  type PrimaryArchetypeId,
  type SubdivisionId,
} from "./archetypes";
import {
  deriveCognitiveMetrics,
  enrichMetricsWithMemory,
  flattenMetrics,
} from "./metrics";
import type { ChimeraMemory } from "../types";
import type { PlayStyleProfile } from "../playStyle";

export interface ArchetypeInfluence {
  id: PrimaryArchetypeId;
  weight: number;
}

export interface CognitiveClassification {
  primary: PrimaryArchetypeId;
  subdivision: SubdivisionId;
  secondary: ArchetypeInfluence[];
  primaryScore: number;
  subdivisionScore: number;
  /** Blended 0–100 scores per primary for evolution UI */
  primaryScores: Record<PrimaryArchetypeId, number>;
  metricsSnapshot: Record<string, number>;
  confidence: number;
  nascent: boolean;
}

const MIN_MOVES = 12;

function scoreWeights(
  flat: Record<string, number>,
  weights: Record<string, number>
): number {
  let sum = 0;
  let wSum = 0;
  for (const [key, w] of Object.entries(weights)) {
    const v = flat[key];
    if (v === undefined) continue;
    if (w >= 0) {
      sum += (v / 100) * w;
      wSum += w;
    } else {
      sum += ((100 - v) / 100) * Math.abs(w);
      wSum += Math.abs(w);
    }
  }
  if (wSum === 0) return 0;
  return (sum / wSum) * 100;
}

function isSovereignCandidate(flat: Record<string, number>): boolean {
  const keys = [
    "calculationDepth",
    "initiativeValuation",
    "structureQuality",
    "conversionStyle",
    "emotionalRecovery",
    "tacticSpotting",
    "strategicPatience",
  ];
  const vals = keys.map((k) => flat[k] ?? 50);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance =
    vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  const std = Math.sqrt(variance);
  return mean >= 52 && std <= 14 && (flat.panicFrequency ?? 50) < 45;
}

function scorePrimary(
  flat: Record<string, number>,
  def: PrimaryArchetypeDef
): number {
  let score = scoreWeights(flat, def.weights);
  if (def.id === "sovereign" && !isSovereignCandidate(flat)) {
    score *= 0.55;
  }
  return Math.round(score);
}

function scoreSubdivision(
  flat: Record<string, number>,
  def: PrimaryArchetypeDef,
  subId: SubdivisionId
): number {
  const sub = def.subdivisions.find((s) => s.id === subId);
  if (!sub) return 0;
  const merged = { ...def.weights, ...sub.weightAdjust };
  return scoreWeights(flat, merged);
}

export function classifyCognition(
  profile: PlayStyleProfile,
  memory?: Pick<ChimeraMemory, "patterns">
): CognitiveClassification {
  const metrics = deriveCognitiveMetrics(profile);
  let flat = flattenMetrics(metrics);
  flat = enrichMetricsWithMemory(flat, memory);

  const nascent = profile.moves < MIN_MOVES;
  const primaryScores = {} as Record<PrimaryArchetypeId, number>;

  for (const def of PRIMARY_ARCHETYPES) {
    primaryScores[def.id] = scorePrimary(flat, def);
  }

  const ranked = [...PRIMARY_ARCHETYPES]
    .map((d) => ({ id: d.id, score: primaryScores[d.id] }))
    .sort((a, b) => b.score - a.score);

  const primary = ranked[0].id;
  const primaryDef = PRIMARY_ARCHETYPES.find((d) => d.id === primary)!;

  let bestSub = primaryDef.subdivisions[0].id;
  let bestSubScore = 0;
  for (const sub of primaryDef.subdivisions) {
    const s = scoreSubdivision(flat, primaryDef, sub.id);
    if (s > bestSubScore) {
      bestSubScore = s;
      bestSub = sub.id;
    }
  }

  const secondary: ArchetypeInfluence[] = ranked
    .slice(1, 4)
    .filter((r) => r.score >= 35 && r.id !== primary)
    .map((r) => ({
      id: r.id,
      weight: Math.round((r.score / Math.max(1, ranked[0].score)) * 100),
    }))
    .slice(0, 2);

  const confidence = Math.min(
    100,
    Math.round(
      profile.moves * 2 +
        (ranked[0].score - (ranked[1]?.score ?? 0)) * 0.8
    )
  );

  return {
    primary,
    subdivision: bestSub,
    secondary,
    primaryScore: ranked[0].score,
    subdivisionScore: bestSubScore,
    primaryScores,
    metricsSnapshot: flat,
    confidence: nascent ? Math.min(confidence, 40) : confidence,
    nascent,
  };
}
