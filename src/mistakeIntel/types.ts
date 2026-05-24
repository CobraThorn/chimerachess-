import type { Color } from "../chess";
import type { GameReviewReport } from "../review/types";

export type MistakeSeverity = "inaccuracy" | "mistake" | "blunder" | "critical";

export interface MistakeExplanationBlock {
  whatHappened: string;
  whyWrong: string;
  violatedConcepts: string[];
  whyBestMoveWorks: string;
  likelyThoughtProcess: string;
  cognitiveFailure: string[];
  boardConsequences: string[];
  preventionAdvice: string;
}

export interface MistakeIntelligence {
  id: string;
  moveNumber: number;
  ply: number;
  severity: MistakeSeverity;
  playerMove: string;
  bestMove: string;
  evaluationSwing: number;
  headline: string;
  explanation: MistakeExplanationBlock;
  tacticalTheme?: string[];
  strategicTheme?: string[];
  openingContext?: string;
  endgameContext?: string;
  confidence: number;
  trainingRecommendation: string[];
  /** Recurring pattern tags from archive + this game */
  patternTags: string[];
  /** Why this moment matters for your rating / game result */
  whyItMatters: string;
  /** GPT coach layer — local engine evidence remains authoritative for moves/evals */
  gpt?: MistakeGptOverlay;
}

export interface MistakeGptOverlay {
  source: "gpt";
  headline?: string;
  whyItMatters?: string;
  explanation?: Partial<MistakeExplanationBlock>;
  trainingRecommendation?: string[];
}

export interface MistakePatternFamily {
  id: string;
  label: string;
  theme: "tactical" | "positional" | "cognitive" | "phase";
  occurrences: number;
  lastSeenAt: number;
  gameIds: string[];
  sampleHeadline: string;
}

export interface MistakeIntelligenceReport {
  version: 1;
  gameId: string;
  reviewId: string;
  generatedAt: number;
  userColor: Color;
  summary: string;
  mistakes: MistakeIntelligence[];
  recurringPatterns: string[];
  families: MistakePatternFamily[];
}

export interface BuildMistakeIntelInput {
  reviewReport: GameReviewReport;
  gameId: string;
  families?: MistakePatternFamily[];
  moveTimesMs?: number[];
}
