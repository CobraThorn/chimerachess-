import { createPlayStyleProfile, styleToRadar } from "../playStyle";
import type { ChimeraMemory } from "../types";
import type { PersonalityTypeDef } from "./personality400";
import { getRichProfile } from "./personality400";
import type { PhenotypeEvolution } from "../learning/types";

/** Ten-axis cognitive fingerprint — shared by phenotypes, users, and elite references */
export type PhenotypeRadarKey =
  | "tacticalVision"
  | "positionalUnderstanding"
  | "aggression"
  | "riskTolerance"
  | "endgamePrecision"
  | "openingPreparation"
  | "timeManagement"
  | "consistencyUnderPressure"
  | "patternRecognition"
  | "conversionAbility";

export type PhenotypeRadarValues = Record<PhenotypeRadarKey, number>;

export interface PhenotypeRadarAxisMeta {
  key: PhenotypeRadarKey;
  label: string;
  short: string;
  description: string;
  /** Shown when this axis is a relative weakness */
  trainingHint: string;
}

export const PHENOTYPE_RADAR_AXES: PhenotypeRadarAxisMeta[] = [
  {
    key: "tacticalVision",
    label: "Tactical Vision",
    short: "TAC",
    description: "Spotting combinations, sacrifices, and forcing lines under pressure.",
    trainingHint: "Tactical puzzles · calculation drills · sharp model games",
  },
  {
    key: "positionalUnderstanding",
    label: "Positional Understanding",
    short: "POS",
    description: "Long-term structure, prophylaxis, and quiet improvement of pieces.",
    trainingHint: "Pawn-structure studies · strategic planning · Karpov-style squeezes",
  },
  {
    key: "aggression",
    label: "Aggression",
    short: "ATK",
    description: "Willingness to attack, seize initiative, and punish passivity.",
    trainingHint: "Attacking motifs · king safety when pushing · initiative exercises",
  },
  {
    key: "riskTolerance",
    label: "Risk Tolerance",
    short: "RISK",
    description: "Comfort with unclear positions, gambits, and material imbalance.",
    trainingHint: "Gambit repertoires · imbalance studies · blitz risk calibration",
  },
  {
    key: "endgamePrecision",
    label: "Endgame Precision",
    short: "END",
    description: "Technique when the board simplifies — conversion and defence.",
    trainingHint: "Endgame fundamentals · tablebase themes · rook-pawn technique",
  },
  {
    key: "openingPreparation",
    label: "Opening Preparation",
    short: "OPN",
    description: "Opening knowledge depth and ability to reach playable middlegames.",
    trainingHint: "Repertoire review · opening traps to avoid · model games in your lines",
  },
  {
    key: "timeManagement",
    label: "Time Management",
    short: "CLK",
    description: "Clock discipline — when to think, when to blitz, when to bail out.",
    trainingHint: "Increment training · pre-move habits · critical-moment clock drills",
  },
  {
    key: "consistencyUnderPressure",
    label: "Consistency Under Pressure",
    short: "CON",
    description: "Staying accurate when behind, low on time, or emotionally tilted.",
    trainingHint: "Defence puzzles · blitz under fatigue · emotional reset routines",
  },
  {
    key: "patternRecognition",
    label: "Pattern Recognition",
    short: "PAT",
    description: "Recognising recurring structures and motifs without full calculation.",
    trainingHint: "Theme puzzles · spaced repetition · annotated master games",
  },
  {
    key: "conversionAbility",
    label: "Conversion Ability",
    short: "CV",
    description: "Turning advantages into wins without unnecessary drama.",
    trainingHint: "Winning technique · simplification choices · prophylactic conversion",
  },
];

export interface PhenotypeRadarSnapshot {
  at: number;
  label: string;
  values: PhenotypeRadarValues;
}

export interface ElitePlayerReference {
  id: string;
  name: string;
  era: string;
  values: PhenotypeRadarValues;
  note: string;
}

export interface RadarComparisonInsight {
  similarityPercent: number;
  sharedStrengths: string[];
  missingAreas: { axis: string; gap: number; hint: string }[];
  summary: string;
}

function clamp(v: number): number {
  return Math.round(Math.min(100, Math.max(0, v)));
}

function w(def: PersonalityTypeDef, key: string, scale = 100): number {
  const raw = def.weightAdjust[key] ?? 0;
  return clamp(50 + raw * scale);
}

const MIND_TIME: Record<string, number> = {
  Focused: 72,
  Curious: 58,
  Steady: 78,
  Restless: 42,
  Visionary: 55,
};

const SOUL_PRESSURE: Record<string, number> = {
  Calm: 82,
  Bold: 62,
  Warm: 70,
  Cool: 85,
  Wild: 48,
};

/** Ideal fingerprint for a personality type — the “DNA shape” */
export function radarFingerprintFromPersonality(
  def: PersonalityTypeDef
): PhenotypeRadarValues {
  const ind = Object.fromEntries(
    getRichProfile(def).playstyleIndicators.map((i) => [i.label, i.value])
  );
  const atk = ind.Aggression ?? 50;
  const pos = ind.Positional ?? 50;
  const tac = ind.Tactical ?? 50;
  const risk = ind["Risk appetite"] ?? 50;
  const calc = ind.Calculation ?? 50;

  const struct = w(def, "structureQuality", 90);
  const proph = w(def, "prophylaxis", 85);
  const prec = w(def, "precision", 95);
  const init = w(def, "initiativeValuation", 88);
  const chaos = w(def, "chaosTolerance", 70);

  return {
    tacticalVision: clamp(tac * 0.55 + chaos * 0.25 + calc * 0.2),
    positionalUnderstanding: clamp(pos * 0.5 + struct * 0.35 + proph * 0.15),
    aggression: clamp(atk * 0.65 + init * 0.35),
    riskTolerance: clamp(risk * 0.7 + chaos * 0.3),
    endgamePrecision: clamp(struct * 0.4 + prec * 0.45 + pos * 0.15),
    openingPreparation: clamp(calc * 0.45 + struct * 0.35 + pos * 0.2),
    timeManagement: clamp(MIND_TIME[def.mind] ?? 60),
    consistencyUnderPressure: clamp(
      SOUL_PRESSURE[def.soul] ?? 65 * 0.5 + prec * 0.5
    ),
    patternRecognition: clamp(tac * 0.35 + calc * 0.45 + prec * 0.2),
    conversionAbility: clamp(init * 0.4 + prec * 0.35 + struct * 0.25),
  };
}

function playStyleToPhenotypeRadar(memory: ChimeraMemory): PhenotypeRadarValues | null {
  const profile = memory.userStyle ?? createPlayStyleProfile(memory.chimeraElo);
  if ((profile.moves ?? 0) < 8) return null;

  const by = Object.fromEntries(styleToRadar(profile).map((a) => [a.short, a.value]));
  const atk = by.ATK ?? 50;
  const pos = by.POS ?? 50;
  const tac = by.TAC ?? 50;
  const risk = by.RISK ?? 50;
  const end = by.END ?? 50;
  const pre = by.PRE ?? 50;
  const init = by.INIT ?? 50;
  const def = by.DEF ?? 50;

  return {
    tacticalVision: clamp(tac * 0.85 + init * 0.15),
    positionalUnderstanding: clamp(pos * 0.9 + def * 0.1),
    aggression: atk,
    riskTolerance: risk,
    endgamePrecision: end,
    openingPreparation: clamp(pos * 0.4 + pre * 0.35 + tac * 0.25),
    timeManagement: clamp(100 - risk * 0.25 - (100 - pre) * 0.2 + def * 0.15),
    consistencyUnderPressure: clamp(pre * 0.55 + def * 0.45),
    patternRecognition: clamp(tac * 0.5 + pre * 0.5),
    conversionAbility: clamp(init * 0.45 + pre * 0.35 + end * 0.2),
  };
}

/** Blended “current you” — observed play when available, else phenotype DNA */
export function radarCurrentFromMemory(
  memory: ChimeraMemory,
  def?: PersonalityTypeDef
): PhenotypeRadarValues {
  const dna = def ? radarFingerprintFromPersonality(def) : neutralRadar();
  const observed = playStyleToPhenotypeRadar(memory);
  if (!observed) return dna;

  const blend = 0.52;
  const out = {} as PhenotypeRadarValues;
  for (const axis of PHENOTYPE_RADAR_AXES) {
    const k = axis.key;
    out[k] = clamp(dna[k] * (1 - blend) + observed[k] * blend);
  }
  return out;
}

/** “Potential you” — phenotype ideal nudged by evolution trait gains */
export function radarPotentialFromMemory(
  memory: ChimeraMemory,
  def: PersonalityTypeDef
): PhenotypeRadarValues {
  const ideal = radarFingerprintFromPersonality(def);
  const current = radarCurrentFromMemory(memory, def);
  const evo = memory.learning?.evolution;
  const out = { ...ideal };

  for (const axis of PHENOTYPE_RADAR_AXES) {
    const k = axis.key;
    const gap = ideal[k] - current[k];
    if (gap > 8) {
      out[k] = clamp(current[k] + gap * 0.65);
    }
  }

  if (evo?.traitCurrent && evo.traitBaseline) {
    const tacBoost = (evo.traitCurrent.tactical - evo.traitBaseline.tactical) * 0.35;
    const posBoost =
      (evo.traitCurrent.positional - evo.traitBaseline.positional) * 0.35;
    out.tacticalVision = clamp(out.tacticalVision + tacBoost);
    out.positionalUnderstanding = clamp(
      out.positionalUnderstanding + posBoost
    );
    out.aggression = clamp(
      out.aggression +
        (evo.traitCurrent.aggression - evo.traitBaseline.aggression) * 0.3
    );
  }

  return out;
}

function neutralRadar(): PhenotypeRadarValues {
  return Object.fromEntries(
    PHENOTYPE_RADAR_AXES.map((a) => [a.key, 50])
  ) as PhenotypeRadarValues;
}

export const ELITE_PLAYER_REFERENCES: ElitePlayerReference[] = [
  {
    id: "carlsen",
    name: "Magnus Carlsen",
    era: "2010s–present",
    note: "Endgame resilience, conversion, and practical grinding — not a play-style clone claim.",
    values: {
      tacticalVision: 88,
      positionalUnderstanding: 94,
      aggression: 62,
      riskTolerance: 55,
      endgamePrecision: 98,
      openingPreparation: 82,
      timeManagement: 92,
      consistencyUnderPressure: 96,
      patternRecognition: 91,
      conversionAbility: 97,
    },
  },
  {
    id: "kasparov",
    name: "Garry Kasparov",
    era: "1985–2005",
    note: "Dynamic calculation and initiative — reference profile for comparison only.",
    values: {
      tacticalVision: 97,
      positionalUnderstanding: 90,
      aggression: 92,
      riskTolerance: 78,
      endgamePrecision: 88,
      openingPreparation: 95,
      timeManagement: 85,
      consistencyUnderPressure: 88,
      patternRecognition: 94,
      conversionAbility: 91,
    },
  },
  {
    id: "nakamura",
    name: "Hikaru Nakamura",
    era: "2000s–present",
    note: "Speed chess instincts and tactical resourcefulness — analytical benchmark.",
    values: {
      tacticalVision: 93,
      positionalUnderstanding: 78,
      aggression: 85,
      riskTolerance: 82,
      endgamePrecision: 80,
      openingPreparation: 76,
      timeManagement: 88,
      consistencyUnderPressure: 75,
      patternRecognition: 90,
      conversionAbility: 84,
    },
  },
];

export function valuesToRadarAxes(values: PhenotypeRadarValues) {
  return PHENOTYPE_RADAR_AXES.map((meta) => ({
    key: meta.key,
    label: meta.label,
    short: meta.short,
    value: values[meta.key],
    description: meta.description,
    trainingHint: meta.trainingHint,
  }));
}

export function compareRadarProfiles(
  user: PhenotypeRadarValues,
  reference: PhenotypeRadarValues,
  referenceName: string
): RadarComparisonInsight {
  let sumDiff = 0;
  const shared: string[] = [];
  const missing: RadarComparisonInsight["missingAreas"] = [];

  for (const axis of PHENOTYPE_RADAR_AXES) {
    const u = user[axis.key];
    const r = reference[axis.key];
    sumDiff += Math.abs(u - r) / 100;
    if (u >= 65 && r >= 65 && Math.abs(u - r) <= 18) {
      shared.push(axis.label);
    }
    const gap = r - u;
    if (gap >= 18) {
      missing.push({
        axis: axis.label,
        gap: Math.round(gap),
        hint: axis.trainingHint,
      });
    }
  }

  const avgDiff = sumDiff / PHENOTYPE_RADAR_AXES.length;
  const similarityPercent = Math.round(
    Math.max(8, Math.min(72, 72 - avgDiff * 95))
  );

  missing.sort((a, b) => b.gap - a.gap);

  const summary =
    shared.length > 0
      ? `${similarityPercent}% profile overlap with ${referenceName} — shared tendencies in ${shared.slice(0, 3).join(", ")}.`
      : `${similarityPercent}% overlap — different shape; use gaps as training targets, not identity.`;

  return {
    similarityPercent,
    sharedStrengths: shared.slice(0, 4),
    missingAreas: missing.slice(0, 4),
    summary,
  };
}

export function snapshotLabel(at: number): string {
  const d = new Date(at);
  return d.toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

export function appendRadarSnapshot(
  evolution: PhenotypeEvolution,
  values: PhenotypeRadarValues,
  at = Date.now()
): PhenotypeEvolution {
  const timeline = [...(evolution.radarTimeline ?? [])];
  const last = timeline[timeline.length - 1];
  const changed =
    !last ||
    PHENOTYPE_RADAR_AXES.some(
      (a) => Math.abs(last.values[a.key] - values[a.key]) >= 4
    );

  if (changed) {
    timeline.push({ at, label: snapshotLabel(at), values: { ...values } });
  }

  return {
    ...evolution,
    radarTimeline: timeline.slice(-12),
  };
}

export function ensureRadarTimeline(
  evolution: PhenotypeEvolution,
  values: PhenotypeRadarValues
): PhenotypeEvolution {
  if (evolution.radarTimeline?.length) return evolution;
  return {
    ...evolution,
    radarTimeline: [
      {
        at: Date.now(),
        label: snapshotLabel(Date.now()),
        values: { ...values },
      },
    ],
  };
}

export function interpolateRadarSnapshots(
  a: PhenotypeRadarValues,
  b: PhenotypeRadarValues,
  t: number
): PhenotypeRadarValues {
  const out = {} as PhenotypeRadarValues;
  for (const axis of PHENOTYPE_RADAR_AXES) {
    const k = axis.key;
    out[k] = clamp(a[k] + (b[k] - a[k]) * t);
  }
  return out;
}

export function weakestAxes(
  values: PhenotypeRadarValues,
  n = 2
): PhenotypeRadarAxisMeta[] {
  return [...PHENOTYPE_RADAR_AXES]
    .sort((a, b) => values[a.key] - values[b.key])
    .slice(0, n);
}
