import type { Color } from "../chess";
import type { GameMoveRecord, MistakeCategory, MistakeRecord } from "../ai/types";
import type { GameResult } from "../online/types";

export type ReviewMode = "chimera" | "online";

export type MoveGrade =
  | "brilliant"
  | "best"
  | "excellent"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder";

export interface ReviewMoveAnalysis {
  ply: number;
  uci: string;
  san?: string;
  fenBefore: string;
  fenAfter: string;
  grade: MoveGrade;
  cpLoss: number;
  /** CAPS-style move accuracy 0–100 */
  accuracyPct: number;
  bestUci: string;
  evalBeforeWhite: number;
  evalAfterWhite: number;
  swingCp: number;
  category: MistakeCategory | null;
  isCritical: boolean;
  insight: string;
  position: ReviewPositionInsight;
}

export type HeatKind =
  | "blunder"
  | "best"
  | "open_file"
  | "blind_spot"
  | "weak";

export interface SquareHeat {
  square: number;
  kind: HeatKind;
  intensity: number;
}

export interface ReviewPositionInsight {
  openFiles: string[];
  semiOpenFiles: string[];
  blindSpots: string[];
  findBestMoveSteps: string[];
  futureScanHabits: string[];
  heatSquares: SquareHeat[];
}

/** One frame in the move-by-move recap (ply 0 = starting position). */
export interface ReviewRecapStep {
  ply: number;
  fen: string;
  moveLabel: string;
  mover: "user" | "chimera" | null;
  uci?: string;
  san?: string;
}

export interface ReviewCoachNote {
  ply: number;
  title: string;
  explanation: string;
  teachingPoint: string;
  source: "gpt" | "local";
}

export interface EvalPoint {
  ply: number;
  cpWhite: number;
  label: string;
}

export interface GamePhaseStats {
  phase: "opening" | "middlegame" | "endgame";
  moves: number;
  avgAccuracy: number;
  worstLoss: number;
}

export interface GameReviewReport {
  id: string;
  mode: ReviewMode;
  opponentLabel: string;
  userColor: Color;
  result: "user-win" | "chimera-win" | "draw";
  resultLabel: string;
  durationMs: number;
  totalPlies: number;
  accuracy: number;
  /** Average centipawn loss (internal) — display avgMissLabel instead */
  averageCpLoss: number;
  acpl: number;
  /** Plain-language quality band (Excellent / Strong / …) */
  playQuality: string;
  /** Average mistake size label e.g. "0.3 pawns" */
  avgMissLabel: string;
  brilliant: number;
  best: number;
  excellent: number;
  good: number;
  book: number;
  inaccuracies: number;
  mistakes: number;
  misses: number;
  blunders: number;
  openingLine: string;
  phases: GamePhaseStats[];
  evalTimeline: EvalPoint[];
  userMoves: ReviewMoveAnalysis[];
  criticalMoments: ReviewMoveAnalysis[];
  narrative: string[];
  liveMistakes: MistakeRecord[];
  recapSteps: ReviewRecapStep[];
  moves: GameMoveRecord[];
  coachSummary?: string;
}

export interface GameReviewInput {
  id: string;
  mode: ReviewMode;
  opponentLabel: string;
  userColor: Color;
  result: GameReviewReport["result"];
  startedAt: number;
  endedAt: number;
  moves: GameMoveRecord[];
  liveMistakes?: MistakeRecord[];
}

export type ReviewProgress = {
  step: number;
  total: number;
  label: string;
};

export function onlineResultToReview(
  result: GameResult | null,
  userColor: Color
): GameReviewReport["result"] {
  if (!result || result === "draw") return "draw";
  const userWin =
    (result === "white-win" && userColor === "w") ||
    (result === "black-win" && userColor === "b");
  return userWin ? "user-win" : "chimera-win";
}
