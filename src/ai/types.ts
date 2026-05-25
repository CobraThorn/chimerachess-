import type { Color } from "../chess";
import type { ChimeraRatingState } from "../crs/types";
import type { CognitiveIdentity } from "./cognition/identity";
import type { PlayStyleProfile } from "./playStyle";
import type { AdaptiveLearningState } from "./learning/types";

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
  /** Milliseconds spent on each user move, in order */
  userMoveTimesMs?: number[];
}

/** Last game's Elo math (shown to players). */
export interface CalibrationMathSnapshot {
  at: number;
  userRating: number;
  chimeraPlayedElo: number;
  chimeraStoredBefore: number;
  chimeraStoredAfter: number;
  resultScore: number;
  efficiencyFactor: number;
  mistakePenalty: number;
  performanceScore: number;
  expectedScore: number;
  surprise: number;
  kFactor: number;
  chimeraDelta: number;
  perceivedUserDelta: number;
  fullMoves: number;
  ratingDeviation: number;
}

/** Per-player estimate of human strength + how settled CHIMERA Elo is. */
export interface ChimeraCalibrationState {
  perceivedUserElo: number;
  /** 0–1 — low = still finding the right CHIMERA level */
  confidence: number;
  calibrationGames: number;
  /** Rating deviation σ (lower = more certain). */
  ratingDeviation?: number;
  lastPlayedElo?: number;
  lastSnapshot?: CalibrationMathSnapshot;
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
  /** CHIMERA opponent rating (starts ~250, calibrates per player) */
  chimeraElo: number;
  /** Adaptive calibration — perceived you + settled CHIMERA strength */
  chimeraCalibration?: ChimeraCalibrationState;
  /** Last vs-CHIMERA game Elo math (player-facing breakdown) */
  lastCalibrationMath?: CalibrationMathSnapshot;
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
  /** Chimera Rating System — skill, modes, history, hidden confidence */
  crs?: ChimeraRatingState;
  /** Custom adaptive learning model — habits, counters, lessons */
  learning?: AdaptiveLearningState;
  /** Post-game intelligence archive (phenotype lab + reports) */
  intelligence?: import("../intelligence/types").IntelligenceArchive;
}

export const INITIAL_USER_ELO = 100;
export const INITIAL_CHIMERA_ELO = 250;
/** Legacy default before CHIMERA start was raised to 250 */
export const LEGACY_CHIMERA_ELO = 100;
export const CHIMERA_STORAGE_KEY = "chimera-memory-v3";
/** Fired on `window` after memory is saved or reset (same tab). */
export const CHIMERA_MEMORY_EVENT = "chimera-memory-update";
