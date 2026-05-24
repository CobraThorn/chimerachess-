import type { IntelligencePhenotypeKey } from "./types";

/** Global tuning — adjust without code changes to scoring functions. */
export const INTELLIGENCE_CONFIG = {
  version: 1 as const,
  maxStoredReports: 40,
  maxPhenotypeHistoryPerAxis: 24,
  /** EMA learning rate base; divided by sqrt(gamesSampled) for stability */
  phenotypeLearningRate: 0.22,
  phenotypeMomentumDecay: 0.65,
  /** Minimum games before phenotype confidence reaches "medium" */
  confidenceGamesMedium: 5,
  confidenceGamesHigh: 15,
  /** Phase ply boundaries (user move ply) */
  openingPlyMax: 16,
  middlegamePlyMax: 44,
  trendWindowGames: 8,
  /** Grade → signal weights */
  blunderCpThreshold: 300,
  mistakeCpThreshold: 100,
  /** Tilt: blunders after accuracy drop in same game */
  tiltBlunderClusterThreshold: 2,
} as const;

export const PHENOTYPE_AXIS_META: {
  key: IntelligencePhenotypeKey;
  label: string;
  short: string;
  description: string;
  invertScale?: boolean;
}[] = [
  {
    key: "confidence",
    label: "Competitive Confidence",
    short: "CONF",
    description: "Belief in your decisions when positions are balanced or worse.",
  },
  {
    key: "aggression",
    label: "Aggression",
    short: "ATK",
    description: "Initiative, attacking volume, and willingness to press.",
  },
  {
    key: "positionalDiscipline",
    label: "Positional Discipline",
    short: "POS",
    description: "Structural patience, prophylaxis, and quiet improvements.",
  },
  {
    key: "tacticalSharpness",
    label: "Tactical Sharpness",
    short: "TAC",
    description: "Calculation accuracy in forcing positions.",
  },
  {
    key: "timePressureResilience",
    label: "Time-Pressure Resilience",
    short: "CLK",
    description: "Quality retained when the clock is low or moves are fast.",
  },
  {
    key: "tiltTendency",
    label: "Tilt Tendency",
    short: "TILT",
    description: "Emotional leakage after mistakes — lower is better.",
    invertScale: true,
  },
  {
    key: "riskAppetite",
    label: "Risk Appetite",
    short: "RISK",
    description: "Comfort with unclear, imbalanced, or sacrificial play.",
  },
  {
    key: "adaptability",
    label: "Adaptability",
    short: "ADP",
    description: "Adjustment when the opponent changes pace or style.",
  },
  {
    key: "endgameDiscipline",
    label: "Endgame Discipline",
    short: "END",
    description: "Technique and focus when simplifying.",
  },
  {
    key: "openingConfidence",
    label: "Opening Confidence",
    short: "OPN",
    description: "Early-game accuracy and preparation trust.",
  },
];

export function getAxisMeta(key: IntelligencePhenotypeKey) {
  return PHENOTYPE_AXIS_META.find((a) => a.key === key)!;
}
