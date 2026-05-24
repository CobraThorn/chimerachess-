/** Tunable thresholds for mistake intelligence (no hardcoded copy in services). */
export const MISTAKE_INTEL_CONFIG = {
  openingPlyMax: 16,
  middlegamePlyMax: 44,
  criticalCpLoss: 200,
  blunderCpLoss: 300,
  mistakeCpLoss: 100,
  inaccuracyCpLoss: 50,
  maxMistakesPerReport: 24,
  maxPatternFamilies: 32,
  maxGamesPerFamily: 12,
  /** Confidence caps */
  baseConfidenceWithReview: 72,
  baseConfidenceHeuristic: 48,
} as const;

export const COGNITIVE_FAILURE_LABELS = {
  clock_pressure: "Clock-pressure collapse",
  tunnel_vision: "Tunnel vision",
  over_aggression: "Over-aggression / greed",
  threat_blindness: "Threat blindness",
  fixation: "Fixation on one idea",
  defensive_panic: "Defensive panic",
  shallow_calculation: "Shallow calculation depth",
  opening_unfamiliarity: "Opening unfamiliarity",
  endgame_gap: "Endgame technique gap",
  king_safety_neglect: "King safety neglect",
} as const;

export type CognitiveFailureKey = keyof typeof COGNITIVE_FAILURE_LABELS;
