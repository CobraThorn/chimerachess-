import { INITIAL_USER_ELO } from "../ai/types";
import type { ChimeraMemory, StoredGame } from "../ai/types";
import type { PlayStyleProfile } from "../ai/playStyle";
import { derivePlayerArchetype } from "./archetype";
import { applyCrsUpdate } from "./formula";
import type {
  ChimeraRatingState,
  CrsMode,
  CrsUpdateInput,
} from "./types";

const DEFAULT_MODES: CrsMode[] = [
  "bullet",
  "blitz",
  "rapid",
  "classical",
  "puzzle",
  "chimera",
];

function emptyModeRecord(defaultRating: number): Record<CrsMode, number> {
  return Object.fromEntries(
    DEFAULT_MODES.map((m) => [m, defaultRating])
  ) as Record<CrsMode, number>;
}

function emptyGamesRecord(): Record<CrsMode, number> {
  return Object.fromEntries(DEFAULT_MODES.map((m) => [m, 0])) as Record<
    CrsMode,
    number
  >;
}

export function createInitialCrsState(
  seedRating = INITIAL_USER_ELO,
  style?: PlayStyleProfile
): ChimeraRatingState {
  const r = Math.round(seedRating);
  return {
    chimeraRating: r,
    peakRating: r,
    ratingDeviation: 320,
    modeRatings: emptyModeRecord(r),
    gamesByMode: emptyGamesRecord(),
    totalRatedGames: 0,
    winStreak: 0,
    bestStreak: 0,
    recentScores: [],
    ratingHistory: [],
    lastPostGame: null,
    pendingPromotion: null,
    playerArchetype: style
      ? derivePlayerArchetype(style)
      : "Adaptive Strategist",
  };
}

export function ensureCrsState(memory: ChimeraMemory): ChimeraRatingState {
  if (memory.crs) {
    return {
      ...createInitialCrsState(memory.userStyle?.elo ?? INITIAL_USER_ELO),
      ...memory.crs,
      modeRatings: {
        ...emptyModeRecord(memory.crs.chimeraRating),
        ...memory.crs.modeRatings,
      },
      gamesByMode: {
        ...emptyGamesRecord(),
        ...memory.crs.gamesByMode,
      },
    };
  }
  return createInitialCrsState(
    memory.userStyle?.elo ?? INITIAL_USER_ELO,
    memory.userStyle
  );
}

export function estimateGameMetrics(game: StoredGame): {
  accuracy: number;
  performanceScore: number;
  avgCpLoss: number;
  blunders: number;
  mistakes: number;
  brilliantMoves: number;
} {
  const userMoves = game.moves.filter((m) => m.by === "user").length;
  const blunders = game.mistakes.filter((m) => m.category === "blunder").length;
  const mistakes = game.mistakes.filter(
    (m) => m.category === "mistake" || m.category === "inaccuracy"
  ).length;
  const avgCpLoss =
    game.mistakes.length > 0
      ? Math.round(
          game.mistakes.reduce((s, m) => s + m.cpLoss, 0) /
            game.mistakes.length
        )
      : 12;
  const accuracy = Math.max(
    45,
    Math.min(99, 94 - blunders * 12 - mistakes * 4)
  );
  const performanceScore = Math.max(
    40,
    Math.min(
      98,
      accuracy - avgCpLoss * 0.15 + (game.result === "user-win" ? 6 : 0)
    )
  );
  const brilliantMoves =
    userMoves > 0 && blunders === 0 && accuracy >= 90 ? 1 : 0;

  return {
    accuracy,
    performanceScore: Math.round(performanceScore),
    avgCpLoss,
    blunders,
    mistakes,
    brilliantMoves,
  };
}

export function applyCrsForStoredGame(
  memory: ChimeraMemory,
  game: StoredGame,
  mode: CrsMode = "chimera",
  opponentRating?: number
): ChimeraMemory {
  const crs = ensureCrsState(memory);
  const metrics = estimateGameMetrics(game);
  const userStyle = memory.userStyle!;
  const opp =
    opponentRating ??
    (mode === "chimera" ? (memory.chimeraElo ?? 250) : 1200);

  let score: 0 | 0.5 | 1 = 0.5;
  if (game.result === "user-win") score = 1;
  else if (game.result === "chimera-win") score = 0;

  const input: CrsUpdateInput = {
    mode,
    playerRating: crs.modeRatings[mode] ?? crs.chimeraRating,
    opponentRating: opp,
    score,
    ...metrics,
    gamesPlayed: crs.totalRatedGames,
    ratingDeviation: crs.ratingDeviation,
    recentScores: crs.recentScores,
  };

  const { state: nextCrs } = applyCrsUpdate(crs, input);
  const archetype = derivePlayerArchetype(userStyle);

  return {
    ...memory,
    crs: { ...nextCrs, playerArchetype: archetype },
    userStyle: {
      ...userStyle,
      elo: nextCrs.chimeraRating,
    },
    lastEloChange: nextCrs.lastPostGame?.delta,
  };
}

export function clearCrsPostGame(memory: ChimeraMemory): ChimeraMemory {
  if (!memory.crs) return memory;
  return {
    ...memory,
    crs: {
      ...memory.crs,
      lastPostGame: null,
      pendingPromotion: null,
    },
  };
}

/** Map online time control → CRS mode bucket. */
export function tcToCrsMode(tc: string): CrsMode {
  if (tc === "bullet") return "bullet";
  if (tc === "blitz") return "blitz";
  if (tc === "rapid") return "rapid";
  return "rapid";
}

export function computeBlunderRateFromMemory(memory: ChimeraMemory): number {
  if (memory.games.length === 0) return 0.2;
  const blunders = memory.games.reduce(
    (s, g) => s + g.mistakes.filter((m) => m.category === "blunder").length,
    0
  );
  return Math.min(1, blunders / Math.max(1, memory.games.length * 0.8));
}

export function computeAvgAccuracyFromMemory(memory: ChimeraMemory): number {
  if (memory.games.length === 0) return 78;
  let sum = 0;
  for (const g of memory.games) {
    sum += estimateGameMetrics(g).accuracy;
  }
  return Math.round(sum / memory.games.length);
}
