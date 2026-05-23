/** Chimera Rating System — competitive modes (each has independent CRS). */
export type CrsMode =
  | "bullet"
  | "blitz"
  | "rapid"
  | "classical"
  | "puzzle"
  | "chimera";

export type CrsResult = "win" | "loss" | "draw";

export interface RatingHistoryEntry {
  id: string;
  mode: CrsMode;
  previousRating: number;
  newRating: number;
  delta: number;
  result: CrsResult;
  accuracy: number;
  performanceScore: number;
  opponentRating: number;
  createdAt: number;
}

/** Hidden confidence — lower RD = more certain rating (Glicko-inspired scale). */
export interface ChimeraRatingState {
  /** Primary display rating (vs CHIMERA / default). */
  chimeraRating: number;
  peakRating: number;
  /** Rating deviation — internal only, not shown in UI. */
  ratingDeviation: number;
  modeRatings: Record<CrsMode, number>;
  gamesByMode: Record<CrsMode, number>;
  totalRatedGames: number;
  winStreak: number;
  bestStreak: number;
  /** Last 12 game scores (1/0.5/0) for form & consistency. */
  recentScores: number[];
  ratingHistory: RatingHistoryEntry[];
  /** Shown once on post-game screen, cleared on dismiss. */
  lastPostGame: CrsPostGameSummary | null;
  /** Class id promoted this session (for promotion banner). */
  pendingPromotion: string | null;
  playerArchetype: string;
}

export interface CrsPostGameSummary {
  result: CrsResult;
  mode: CrsMode;
  delta: number;
  previousRating: number;
  newRating: number;
  accuracy: number;
  performanceLabel: string;
  decisionGrade: string;
  pressureLabel: string;
  brilliantMoves: number;
  mistakes: number;
  blunders: number;
  className: string;
  classId: string;
  percentileLabel: string;
  promoted: boolean;
  insight: string;
}

export interface CrsUpdateInput {
  mode: CrsMode;
  playerRating: number;
  opponentRating: number;
  score: 0 | 0.5 | 1;
  accuracy: number;
  performanceScore: number;
  avgCpLoss: number;
  blunders: number;
  mistakes: number;
  brilliantMoves: number;
  gamesPlayed: number;
  ratingDeviation: number;
  recentScores: number[];
}

export interface CrsUpdateResult {
  state: ChimeraRatingState;
  summary: CrsPostGameSummary;
}
