import type { Color } from "../chess";
import type { CognitiveIdentity } from "./cognition/identity";
import type { PlayStyleProfile } from "./playStyle";

export interface GameMoveRecord {
  uci: string;
  fen: string;
  by: "user" | "chimera";
  san?: string;
}

export interface MistakeRecord {
  fenBefore: string;
  played: string;
  best: string;
  cpLoss: number;
  category: MistakeCategory;
  at: number;
}

export type MistakeCategory =
  | "blunder"
  | "mistake"
  | "inaccuracy"
  | "hangs-piece"
  | "missed-tactic";

export interface UserPattern {
  /** FEN without halfmove / fullmove */
  positionKey: string;
  typicalBadMove: string;
  refutation: string;
  occurrences: number;
  avgCpLoss: number;
  lastSeen: number;
}

export interface StoredGame {
  id: string;
  startedAt: number;
  endedAt: number;
  userColor: Color;
  moves: GameMoveRecord[];
  mistakes: MistakeRecord[];
  result: "user-win" | "chimera-win" | "draw";
  openingLine: string;
}

export interface ChimeraMemory {
  version: 1;
  games: StoredGame[];
  patterns: UserPattern[];
  stats: {
    totalGames: number;
    userWins: number;
    chimeraWins: number;
    draws: number;
    totalMoves: number;
  };
  /** 0–100: how well CHIMERA knows your habits (not raw engine strength) */
  adaptation: number;
  /** CHIMERA opponent rating (starts ~250, updates after rated games) */
  chimeraElo: number;
  /** Vs-you CHIMERA behavioural fingerprint */
  chimeraOpponent?: PlayStyleProfile;
  /** Vs-you CHIMERA cognitive archetype (Oracle Prime, etc.) */
  chimeraOpponentIdentity?: CognitiveIdentity;
  mirrorStats?: {
    total: number;
    whiteWins: number;
    blackWins: number;
    draws: number;
  };
  /** Your playing style fingerprint */
  userStyle?: PlayStyleProfile;
  /** Evolving cognitive archetype (derived from behaviour) */
  cognitiveIdentity?: CognitiveIdentity;
  /** White CHIMERA in mirror duels */
  chimera1?: PlayStyleProfile;
  /** Black CHIMERA in mirror duels */
  chimera2?: PlayStyleProfile;
  /** Cognitive archetype — CHIMERA I (White) */
  chimera1Identity?: CognitiveIdentity;
  /** Cognitive archetype — CHIMERA II (Black) */
  chimera2Identity?: CognitiveIdentity;
  /** Last user Elo change after a rated game */
  lastEloChange?: number;
  /** Last CHIMERA Elo change after a rated game */
  lastChimeraEloChange?: number;
}

export const INITIAL_USER_ELO = 100;
export const INITIAL_CHIMERA_ELO = 250;
/** Legacy default before CHIMERA start was raised to 250 */
export const LEGACY_CHIMERA_ELO = 100;
export const CHIMERA_STORAGE_KEY = "chimera-memory-v1";
/** Fired on `window` after memory is saved or reset (same tab). */
export const CHIMERA_MEMORY_EVENT = "chimera-memory-update";
