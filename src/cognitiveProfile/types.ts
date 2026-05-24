import type { IntelligencePhenotypeKey } from "../intelligence/types";

export type CognitiveTimelineEventType =
  | "breakthrough"
  | "collapse"
  | "adaptation"
  | "recovery"
  | "plateau"
  | "identity_shift"
  | "volatility"
  | "opening_growth"
  | "mistake_pattern"
  | "time_pressure_change";

export interface TimelineEvidence {
  metric: string;
  change: number;
  explanation: string;
}

export interface CognitiveTimelineEvent {
  id: string;
  timestamp: number;
  type: CognitiveTimelineEventType;
  title: string;
  explanation: string;
  confidence: number;
  importanceScore: number;
  evidence: TimelineEvidence[];
  relatedPhenotypes?: string[];
  relatedMistakes?: string[];
  /** Inclusive game index range in archive reports (1-based display) */
  gameRange?: { from: number; to: number };
}

export interface IdentityProfile {
  id: string;
  label: string;
  /** 0–100 weight in mixture */
  weight: number;
  description: string;
}

export interface IdentityShift {
  at: number;
  fromLabel: string;
  toLabel: string;
  message: string;
  confidence: number;
}

export interface PlayerIdentityModel {
  currentIdentity: IdentityProfile[];
  historicalShifts: IdentityShift[];
  confidence: number;
  driftSummary?: string;
}

export type MaturityDimensionKey =
  | "stability"
  | "consistency"
  | "emotionalControl"
  | "positionalUnderstanding"
  | "tacticalReliability"
  | "decisionDiscipline";

export interface MaturityDimension {
  key: MaturityDimensionKey;
  label: string;
  score: number;
  trend: "rising" | "falling" | "stable" | "volatile";
  analyticalNote: string;
}

export interface ChessMaturityModel {
  overallIndex: number;
  confidence: number;
  dimensions: MaturityDimension[];
  headline: string;
}

export interface InsightBullet {
  id: string;
  title: string;
  detail: string;
  metric?: string;
  confidence: number;
}

export interface OpeningPersonalitySlice {
  label: string;
  share: number;
  avgOpeningAccuracy: number;
  trend: "up" | "down" | "flat";
}

export interface ProfileInsightsSnapshot {
  biggestImprovements: InsightBullet[];
  biggestWeaknessCycles: InsightBullet[];
  longTermTrends: InsightBullet[];
  openingPersonality: OpeningPersonalitySlice[];
  mistakeFamilyEvolution: InsightBullet[];
  heatmapTrends: InsightBullet[];
}

export type TimelineFilterType = CognitiveTimelineEventType | "all";

export interface CognitivePlayerProfile {
  version: 1;
  timeline: CognitiveTimelineEvent[];
  identity: PlayerIdentityModel;
  maturity: ChessMaturityModel;
  insights: ProfileInsightsSnapshot;
  updatedAt: number;
  gamesAnalyzed: number;
  gptSummary?: string;
}

export interface GameSeriesPoint {
  index: number;
  gameId: string;
  at: number;
  accuracy: number;
  acpl: number;
  blunders: number;
  openingAccuracy: number;
  endgameAccuracy: number;
  openingLine: string;
  phenotype: Record<IntelligencePhenotypeKey, number>;
  avgMoveTimeMs?: number;
}
