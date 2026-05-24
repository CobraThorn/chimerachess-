import type { Color } from "../chess";

export type WeakpointTheme = "tactical" | "positional" | "cognitive" | "phase";

export interface DetectedWeakpoint {
  id: string;
  label: string;
  theme: WeakpointTheme;
  /** Higher = drill first */
  priority: number;
  occurrences: number;
  insight: string;
}

export interface PersonalPuzzle {
  id: string;
  weakpointId: string;
  weakpointLabel: string;
  theme: WeakpointTheme;
  fen: string;
  /** User to move */
  sideToMove: Color;
  solutionUci: string;
  playedUci?: string;
  headline: string;
  coachingLine: string;
  gameId: string;
  moveLabel: string;
  cpLoss: number;
  severity: "inaccuracy" | "mistake" | "blunder" | "critical";
  createdAt: number;
}

export interface PersonalPuzzleDeck {
  version: 1;
  unlocked: boolean;
  gamesRequired: number;
  gamesSampled: number;
  weakpoints: DetectedWeakpoint[];
  puzzles: PersonalPuzzle[];
  updatedAt: number;
  summary: string;
}
