import type { IntelligenceArchive, IntelligencePhenotypeKey } from "../intelligence/types";
import { getAxisMeta } from "../intelligence/config";
import { IDENTITY_ARCHETYPES, COGNITIVE_PROFILE_CONFIG as CFG } from "./config";
import type { GameSeriesPoint } from "./types";
import type {
  IdentityProfile,
  IdentityShift,
  PlayerIdentityModel,
} from "./types";

function currentPhenotype(
  archive: IntelligenceArchive
): Record<IntelligencePhenotypeKey, number> {
  const out = {} as Record<IntelligencePhenotypeKey, number>;
  for (const key of Object.keys(archive.phenotype) as IntelligencePhenotypeKey[]) {
    out[key] = archive.phenotype[key]?.score ?? 50;
  }
  return out;
}

function scoreArchetype(
  phenotype: Record<IntelligencePhenotypeKey, number>,
  archetype: (typeof IDENTITY_ARCHETYPES)[0]
): number {
  let sum = 0;
  let wSum = 0;
  for (const [key, w] of Object.entries(archetype.weights)) {
    const k = key as IntelligencePhenotypeKey;
    const val = phenotype[k] ?? 50;
    const adjusted = getAxisMeta(k).invertScale ? 100 - val : val;
    sum += adjusted * (w ?? 1);
    wSum += w ?? 1;
  }
  return wSum > 0 ? sum / wSum : 50;
}

function toDistribution(
  scores: { id: string; label: string; description: string; raw: number }[]
): IdentityProfile[] {
  const exp = scores.map((s) => Math.exp((s.raw - 50) / 18));
  const total = exp.reduce((a, b) => a + b, 0) || 1;
  return scores
    .map((s, i) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      weight: Math.round((exp[i]! / total) * 100),
    }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 4);
}

function normalizeWeights(profiles: IdentityProfile[]): IdentityProfile[] {
  const sum = profiles.reduce((s, p) => s + p.weight, 0) || 1;
  return profiles.map((p) => ({
    ...p,
    weight: Math.round((p.weight / sum) * 100),
  }));
}

function detectShifts(
  series: GameSeriesPoint[],
  currentTop: IdentityProfile,
  prevTopLabel: string | null
): IdentityShift[] {
  const shifts: IdentityShift[] = [];
  if (!prevTopLabel || prevTopLabel === currentTop.label) return shifts;

  const last = series[series.length - 1];
  if (!last) return shifts;

  shifts.push({
    at: last.at,
    fromLabel: prevTopLabel,
    toLabel: currentTop.label,
    message: `Primary identity shifted from ${prevTopLabel} to ${currentTop.label}.`,
    confidence: Math.min(82, 45 + series.length * 3),
  });
  return shifts;
}

export function buildPlayerIdentity(
  archive: IntelligenceArchive,
  series: GameSeriesPoint[],
  previousIdentity?: PlayerIdentityModel
): PlayerIdentityModel {
  const phenotype = currentPhenotype(archive);
  const rawScores = IDENTITY_ARCHETYPES.map((a) => ({
    id: a.id,
    label: a.label,
    description: a.description,
    raw: scoreArchetype(phenotype, a),
  }));

  let currentIdentity = normalizeWeights(toDistribution(rawScores));
  if (currentIdentity[0]!.weight < 35 && currentIdentity[1]) {
    currentIdentity = currentIdentity.map((p, i) =>
      i === 0 ? { ...p, weight: 40 } : p
    );
    currentIdentity = normalizeWeights(currentIdentity);
  }

  const prevTop = previousIdentity?.currentIdentity[0]?.label ?? null;
  const newShifts = detectShifts(series, currentIdentity[0]!, prevTop);
  const historicalShifts = [
    ...newShifts,
    ...(previousIdentity?.historicalShifts ?? []),
  ].slice(0, CFG.maxIdentityShifts);

  const confidence = Math.min(
    88,
    30 + series.length * 5 + (archive.reports.length >= 10 ? 15 : 0)
  );

  let driftSummary: string | undefined;
  if (series.length >= CFG.minGamesForIdentity) {
    const agSlope = series.map((p) => p.phenotype.aggression);
    const first = agSlope.slice(0, Math.ceil(agSlope.length / 3));
    const last = agSlope.slice(-Math.ceil(agSlope.length / 3));
    const agDelta =
      last.reduce((a, b) => a + b, 0) / last.length -
      first.reduce((a, b) => a + b, 0) / first.length;
    if (agDelta > 6) {
      driftSummary =
        "Trajectory: initiative and aggression rising — you are taking more ownership of the game.";
    } else if (agDelta < -6) {
      driftSummary =
        "Trajectory: play is compressing toward solidity — fewer speculative swings, more reactive stabilization.";
    } else if (historicalShifts.length > 0) {
      driftSummary = historicalShifts[0]!.message;
    }
  }

  const identityShiftEvent =
    newShifts.length > 0
      ? {
          type: "identity_shift" as const,
          note: newShifts[0]!.message,
        }
      : null;

  if (identityShiftEvent && !driftSummary) {
    driftSummary = identityShiftEvent.note;
  }

  return {
    currentIdentity,
    historicalShifts,
    confidence,
    driftSummary,
  };
}
