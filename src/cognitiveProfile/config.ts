import type { IntelligencePhenotypeKey } from "../intelligence/types";

export const COGNITIVE_PROFILE_CONFIG = {
  minGamesForTimeline: 4,
  minGamesForIdentity: 6,
  minGamesForMaturity: 8,
  windowShort: 5,
  windowLong: 10,
  maxTimelineEvents: 24,
  maxIdentityShifts: 12,
  phenotypeBreakthroughDelta: 8,
  phenotypeCollapseDelta: -8,
  accuracyBreakthroughDelta: 6,
  accuracyCollapseDelta: -6,
  plateauStdDevMax: 4.5,
  volatilityStdDevMin: 12,
  recoveryMinDeclineGames: 3,
  importanceWeightByType: {
    breakthrough: 1.2,
    collapse: 1.15,
    recovery: 1.1,
    identity_shift: 1.25,
    volatility: 0.9,
    plateau: 0.75,
    adaptation: 1.0,
    opening_growth: 1.05,
    mistake_pattern: 1.0,
    time_pressure_change: 1.05,
  } as Record<string, number>,
} as const;

/** Identity archetypes — weights derived from phenotype axis alignment */
export const IDENTITY_ARCHETYPES: {
  id: string;
  label: string;
  description: string;
  weights: Partial<Record<IntelligencePhenotypeKey, number>>;
}[] = [
  {
    id: "tactical_aggressor",
    label: "Tactical aggressor",
    description: "Initiative-first; thrives in forcing lines and sharp complications.",
    weights: {
      aggression: 1.2,
      tacticalSharpness: 1.15,
      riskAppetite: 0.9,
      confidence: 0.7,
    },
  },
  {
    id: "controlled_aggressor",
    label: "Controlled aggressor",
    description: "Presses when justified; balances attack with structure.",
    weights: {
      aggression: 0.9,
      positionalDiscipline: 0.85,
      tacticalSharpness: 0.8,
      confidence: 0.75,
    },
  },
  {
    id: "positional_grinder",
    label: "Calculation-heavy positional player",
    description: "Quiet improvements, file pressure, and long-horizon planning.",
    weights: {
      positionalDiscipline: 1.2,
      endgameDiscipline: 0.9,
      tacticalSharpness: 0.6,
      adaptability: 0.7,
    },
  },
  {
    id: "volatile_attacker",
    label: "Volatile attacker",
    description: "High ceiling with variance — peaks and collapses cluster.",
    weights: {
      aggression: 1.0,
      riskAppetite: 1.1,
      tiltTendency: 0.85,
      tacticalSharpness: 0.75,
    },
  },
  {
    id: "time_survivor",
    label: "Time-pressure survivor",
    description: "Quality under clock stress; pragmatism when time is low.",
    weights: {
      timePressureResilience: 1.25,
      adaptability: 0.8,
      endgameDiscipline: 0.7,
    },
  },
  {
    id: "reactive_defender",
    label: "Reactive defender",
    description: "Solidifies under pressure; prefers resolution over initiative.",
    weights: {
      positionalDiscipline: 0.85,
      confidence: 0.5,
      aggression: 0.35,
      tiltTendency: 0.6,
    },
  },
  {
    id: "opening_specialist",
    label: "Opening-phase specialist",
    description: "Theory trust high; middlegame conversion is the growth edge.",
    weights: {
      openingConfidence: 1.25,
      adaptability: 0.65,
      positionalDiscipline: 0.7,
    },
  },
];
