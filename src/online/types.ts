import type { Color } from "../chess";
import type { TimeControlId } from "./timeControls";

export type OnlinePhase = "idle" | "connecting" | "queued" | "playing" | "ended";

export interface OnlineOpponent {
  id: string;
  name: string;
}

export interface OnlineClock {
  w: number;
  b: number;
}

export interface OnlineMoveRecord {
  ply: number;
  uci: string;
  san?: string;
  fen: string;
  by: "user" | "opponent";
}

export interface OnlineMatchInfo {
  gameId: string;
  tc: TimeControlId;
  tcLabel: string;
  color: Color;
  opponent: OnlineOpponent;
  fen: string;
  incrementMs: number;
  clock: OnlineClock;
  turnStartedAt: number;
  moveHistory: OnlineMoveRecord[];
}

export type GameResult =
  | "white-win"
  | "black-win"
  | "draw";
