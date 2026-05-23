import type { PrimaryArchetypeId, SubdivisionId } from "../cognition/archetypes";

/** How CHIMERA chooses to counter your habits */
export type CounterStyleId = "solid" | "tactical" | "squeeze" | "chaotic";

/** Random starting cognitive phenotype — unique per browser profile */
export interface ChimeraPhenotype {
  primary: PrimaryArchetypeId;
  subdivision: SubdivisionId;
  seed: string;
  /** One of 400 MBTI-style types (16 bases × 25 facets) */
  personalityId?: string;
  /** e.g. INTJ-FC */
  typeCode?: string;
}

export interface LearnedLesson {
  id: string;
  text: string;
  /** habit | weakness | counter */
  kind: "habit" | "weakness" | "counter";
  strength: number;
  learnedAt: number;
  /** Optional FEN key if tied to a position habit */
  positionKey?: string;
}

export interface AdaptiveLearningState {
  gamesAnalyzed: number;
  /** Full adaptation passes completed (every ADAPTATION_INTERVAL_GAMES) */
  adaptationCycles: number;
  /** 0–100 — how deeply CHIMERA has modelled you */
  adaptationScore: number;
  counterStyle: CounterStyleId;
  focusWeakness: string | null;
  lessons: LearnedLesson[];
  /** Shown once after the latest game */
  lastLesson: string | null;
  /** Top habit labels for UI */
  habitTags: string[];
  /** Starting random phenotype for this player's CHIMERA */
  phenotype: ChimeraPhenotype | null;
  /** Trait drift + type evolution over time */
  evolution?: PhenotypeEvolution;
}

import type { TraitVector } from "../cognition/personalityMatch";
import type { PhenotypeRadarSnapshot } from "../cognition/personalityRadar";

export interface PhenotypeEvolution {
  baselinePersonalityId: string;
  currentPersonalityId: string;
  traitBaseline: TraitVector;
  traitCurrent: TraitVector;
  history: {
    at: number;
    message: string;
    personalityId: string;
    cycle: number;
  }[];
  lastEvolutionAt: number | null;
  /** Morphing radar fingerprint over time */
  radarTimeline?: PhenotypeRadarSnapshot[];
}

export interface LearningPlayBias {
  exploitBoost: number;
  blunderRateDelta: number;
  extraDepth: number;
  counterStyle: CounterStyleId;
  thinkTimeMult: number;
}
