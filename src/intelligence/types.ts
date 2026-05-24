import type { Color } from "../chess";
import type { GameReviewReport, ReviewMode } from "../review/types";
import type { StoredGame } from "../ai/types";
import type { CrsPostGameSummary } from "../crs/types";
import type { ChimeraMemory } from "../ai/types";
import type {
  MistakeIntelligenceReport,
  MistakePatternFamily,
} from "../mistakeIntel/types";

/** Performance-lab phenotype axes (coaching-facing). */
export type IntelligencePhenotypeKey =
  | "confidence"
  | "aggression"
  | "positionalDiscipline"
  | "tacticalSharpness"
  | "timePressureResilience"
  | "tiltTendency"
  | "riskAppetite"
  | "adaptability"
  | "endgameDiscipline"
  | "openingConfidence";

export interface PhenotypeAxisMeta {
  key: IntelligencePhenotypeKey;
  label: string;
  short: string;
  description: string;
  /** Higher is better except tiltTendency */
  invertScale?: boolean;
}

export interface PhenotypeState {
  score: number;
  momentum: number;
  confidence: number;
  lastDelta: number;
  updatedAt: number;
  gamesSampled: number;
  history: PhenotypeHistoryPoint[];
}

export interface PhenotypeHistoryPoint {
  at: number;
  gameId: string;
  score: number;
  delta: number;
}

export interface PhenotypeMovement {
  key: IntelligencePhenotypeKey;
  label: string;
  before: number;
  after: number;
  delta: number;
  direction: "up" | "down" | "flat";
  confidence: number;
  interpretation: string;
}

export interface BehavioralObservation {
  id: string;
  category: "time" | "emotion" | "decision" | "opening" | "endgame" | "tactics";
  severity: "info" | "watch" | "focus";
  title: string;
  detail: string;
  evidence?: string;
}

export interface TacticalObservation {
  id: string;
  ply?: number;
  title: string;
  detail: string;
  cpLoss?: number;
}

export interface CoachingNote {
  id: string;
  priority: 1 | 2 | 3;
  focusArea: string;
  prescription: string;
  rationale: string;
  timeframe: "next-game" | "this-week" | "long-term";
}

export interface TrendMetric {
  key: string;
  label: string;
  current: number;
  previousAvg: number;
  delta: number;
  direction: "improving" | "declining" | "stable";
}

export interface PerformanceTrends {
  accuracy: TrendMetric;
  acpl: TrendMetric;
  blunderRate: TrendMetric;
  winRate: TrendMetric;
  streakLabel: string;
}

export interface ConfidenceScores {
  overall: number;
  phenotype: number;
  trends: number;
  coaching: number;
  sampleGames: number;
  dataQuality: "low" | "medium" | "high";
}

export interface GameAnalysisSnapshot {
  gameId: string;
  mode: ReviewMode;
  result: StoredGame["result"];
  userColor: Color;
  accuracy: number;
  acpl: number;
  playQuality: string;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  brilliantMoves: number;
  openingAccuracy: number;
  middlegameAccuracy: number;
  endgameAccuracy: number;
  totalPlies: number;
  userMoves: number;
  criticalMoments: number;
  maxCpLoss: number;
  openingLine: string;
  durationMs: number;
}

/** Full post-game intelligence artifact (JSON-serializable). */
export interface PostGameIntelligenceReport {
  version: 1;
  id: string;
  gameId: string;
  generatedAt: number;
  summary: string;
  headline: string;
  strengths: string[];
  weaknesses: string[];
  phenotypeMovement: PhenotypeMovement[];
  performanceTrends: PerformanceTrends;
  recommendedFocus: string[];
  confidence: ConfidenceScores;
  coachingNotes: CoachingNote[];
  tacticalObservations: TacticalObservation[];
  behavioralObservations: BehavioralObservation[];
  gameAnalysis: GameAnalysisSnapshot;
  /** Optional deep review when Stockfish report exists */
  reviewId?: string;
  compareToPrevious?: {
    accuracyDelta: number;
    acplDelta: number;
    message: string;
  };
  /** Deep coach-style mistake breakdowns (requires Stockfish review) */
  mistakeIntelligence?: MistakeIntelligenceReport;
}

export interface IntelligenceArchive {
  version: 1;
  phenotype: Record<IntelligencePhenotypeKey, PhenotypeState>;
  reports: PostGameIntelligenceReport[];
  /** Cross-game recurring mistake families */
  mistakeFamilies?: MistakePatternFamily[];
  /** Longitudinal timeline, identity mixture, maturity index */
  cognitiveProfile?: import("../cognitiveProfile/types").CognitivePlayerProfile;
  updatedAt: number;
}

export interface PostGameIntelligenceInput {
  game: StoredGame;
  memory: ChimeraMemory;
  reviewReport?: GameReviewReport | null;
  crsSummary?: CrsPostGameSummary | null;
  mode: ReviewMode;
  opponentLabel?: string;
  timeControlLabel?: string;
  /** Per user-move ms; optional until clock export exists */
  moveTimesMs?: number[];
  /** Session tilt score 0–100 from cognition layer */
  sessionTiltScore?: number;
}

export interface PostGameIntelligenceResult {
  report: PostGameIntelligenceReport;
  memory: ChimeraMemory;
  archive: IntelligenceArchive;
}

export interface GameAnalysisServiceInput {
  game: StoredGame;
  reviewReport?: GameReviewReport | null;
  moveTimesMs?: number[];
}

export interface PhenotypeUpdateInput {
  archive: IntelligenceArchive;
  signals: GameAnalysisSnapshot;
  sessionTiltScore?: number;
  memory: ChimeraMemory;
}

export interface PhenotypeUpdateResult {
  phenotype: Record<IntelligencePhenotypeKey, PhenotypeState>;
  movements: PhenotypeMovement[];
}

export interface BehavioralPatternInput {
  game: StoredGame;
  signals: GameAnalysisSnapshot;
  reviewReport?: GameReviewReport | null;
  memory: ChimeraMemory;
  sessionTiltScore?: number;
  moveTimesMs?: number[];
}

export interface TrendAnalysisInput {
  archive: IntelligenceArchive;
  current: GameAnalysisSnapshot;
  memory: ChimeraMemory;
}

export interface CoachingGeneratorInput {
  signals: GameAnalysisSnapshot;
  movements: PhenotypeMovement[];
  behavioral: BehavioralObservation[];
  tactical: TacticalObservation[];
  trends: PerformanceTrends;
  memory: ChimeraMemory;
  reviewReport?: GameReviewReport | null;
}
