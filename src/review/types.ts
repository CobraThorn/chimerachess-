import type { Color } from "../chess";
import type { GameMoveRecord, MistakeCategory, MistakeRecord } from "../ai/types";
import type { GameResult } from "../online/types";

export type ReviewMode = "chimera" | "online";

export type MoveGrade =
  | "brilliant"
  | "great"
  | "good"
  | "book"
  | "inaccuracy"
  | "mistake"
  | "blunder";

export interface ReviewMoveAnalysis {
  ply: number;
  uci: string;
  san?: string;
  fenBefore: string;
  fenAfter: string;
  grade: MoveGrade;
  cpLoss: number;
  bestUci: string;
  evalBeforeWhite: number;
  evalAfterWhite: number;
  swingCp: number;
  category: MistakeCategory | null;
  isCritical: boolean;
  insight: string;
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
  averageCpLoss: number;
  brilliant: number;
  great: number;
  good: number;
  inaccuracies: number;
  mistakes: number;
  blunders: number;
  openingLine: string;
  phases: GamePhaseStats[];
  evalTimeline: EvalPoint[];
  userMoves: ReviewMoveAnalysis[];
  criticalMoments: ReviewMoveAnalysis[];
  narrative: string[];
  liveMistakes: MistakeRecord[];
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
