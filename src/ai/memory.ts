import {
  createPersonaPlayStyle,
  ensureDistinctChimeraPersonalities,
} from "./cognition/chimeraPersonas";
import {
  refreshMirrorCognitiveIdentities,
  refreshOpponentCognitiveIdentity,
  refreshUserCognitiveIdentity,
} from "./cognition/identity";
import {
  applyCrsForStoredGame,
  createInitialCrsState,
  ensureCrsState,
} from "../crs/profile";
import { nudgeStoredChimeraElo, getUserStrength } from "./chimeraStrength";
import { clampElo, calculateEloChange, resultToScore } from "./elo";
import { learnFromGame, ensureLearning } from "./learning/learn";
import { applyOpponentPhenotype, ensureOpponentPhenotype } from "./learning/phenotype";
import { createPlayStyleProfile } from "./playStyle";
import type { CrsMode } from "../crs/types";
import type { ChimeraMemory, StoredGame, UserPattern } from "./types";
import {
  CHIMERA_MEMORY_EVENT,
  CHIMERA_STORAGE_KEY,
  INITIAL_CHIMERA_ELO,
  INITIAL_USER_ELO,
  LEGACY_CHIMERA_ELO,
} from "./types";

function migrateLegacyChimeraElo(memory: ChimeraMemory): ChimeraMemory {
  if (!memory.chimeraElo || memory.chimeraElo === LEGACY_CHIMERA_ELO) {
    memory.chimeraElo = INITIAL_CHIMERA_ELO;
  }
  for (const key of ["chimera1", "chimera2", "chimeraOpponent"] as const) {
    const profile = memory[key];
    if (profile?.elo === LEGACY_CHIMERA_ELO) {
      memory[key] = { ...profile, elo: INITIAL_CHIMERA_ELO };
    }
  }
  return memory;
}

export function createEmptyMemory(): ChimeraMemory {
  const base: ChimeraMemory = {
    version: 1,
    games: [],
    patterns: [],
    stats: {
      totalGames: 0,
      userWins: 0,
      chimeraWins: 0,
      draws: 0,
      totalMoves: 0,
    },
    adaptation: 0,
    chimeraElo: INITIAL_CHIMERA_ELO,
    mirrorStats: { total: 0, whiteWins: 0, blackWins: 0, draws: 0 },
    userStyle: createPlayStyleProfile(INITIAL_USER_ELO),
    crs: createInitialCrsState(INITIAL_USER_ELO),
    chimera1: createPersonaPlayStyle("mirror-white"),
    chimera2: createPersonaPlayStyle("mirror-black"),
  };
  return ensureOpponentPhenotype(base);
}

export function createEmptyMemorySeeded(): ChimeraMemory {
  return ensureDistinctChimeraPersonalities(createEmptyMemory());
}

export function positionKey(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function loadMemory(): ChimeraMemory {
  try {
    const raw = localStorage.getItem(CHIMERA_STORAGE_KEY);
    if (!raw) return createEmptyMemorySeeded();
    const parsed = JSON.parse(raw) as ChimeraMemory;
    if (parsed.version !== 1 || !Array.isArray(parsed.games)) {
      return createEmptyMemorySeeded();
    }
    if (!parsed.mirrorStats) {
      parsed.mirrorStats = { total: 0, whiteWins: 0, blackWins: 0, draws: 0 };
    }
    if (!parsed.userStyle) {
      parsed.userStyle = createPlayStyleProfile();
    } else {
      parsed.userStyle = {
        ...createPlayStyleProfile(parsed.userStyle.elo),
        ...parsed.userStyle,
      };
    }
    if (!parsed.chimera1) parsed.chimera1 = createPlayStyleProfile(INITIAL_CHIMERA_ELO);
    else {
      parsed.chimera1 = {
        ...createPlayStyleProfile(parsed.chimera1.elo),
        ...parsed.chimera1,
      };
    }
    if (!parsed.chimera2) parsed.chimera2 = createPlayStyleProfile(INITIAL_CHIMERA_ELO);
    else {
      parsed.chimera2 = {
        ...createPlayStyleProfile(parsed.chimera2.elo),
        ...parsed.chimera2,
      };
    }
    const migrated = migrateLegacyChimeraElo(parsed);
    if (!migrated.crs) {
      migrated.crs = ensureCrsState(migrated);
      migrated.userStyle = {
        ...migrated.userStyle!,
        elo: migrated.crs.chimeraRating,
      };
    }
    if (!migrated.learning) {
      migrated.learning = ensureLearning(migrated);
      migrated.adaptation = migrated.learning.adaptationScore;
    } else {
      migrated.adaptation = migrated.learning.adaptationScore;
    }
    const withPhenotype = ensureOpponentPhenotype(migrated);
    return ensureDistinctChimeraPersonalities(
      refreshOpponentCognitiveIdentity(
        refreshMirrorCognitiveIdentities(withPhenotype)
      )
    );
  } catch {
    return createEmptyMemorySeeded();
  }
}

export function saveMemory(memory: ChimeraMemory): void {
  localStorage.setItem(CHIMERA_STORAGE_KEY, JSON.stringify(memory));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHIMERA_MEMORY_EVENT));
  }
}

/** Wipe all stats, games, patterns, Elo, and cognitive profiles. */
export function resetAllStats(): ChimeraMemory {
  const fresh = createEmptyMemorySeeded();
  saveMemory(fresh);
  return fresh;
}

export function upsertPattern(
  patterns: UserPattern[],
  entry: Omit<UserPattern, "occurrences" | "avgCpLoss" | "lastSeen"> & {
    cpLoss: number;
  }
): UserPattern[] {
  const key = entry.positionKey;
  const existing = patterns.find(
    (p) => p.positionKey === key && p.typicalBadMove === entry.typicalBadMove
  );
  if (existing) {
    existing.occurrences += 1;
    existing.avgCpLoss =
      (existing.avgCpLoss * (existing.occurrences - 1) + entry.cpLoss) /
      existing.occurrences;
    existing.lastSeen = Date.now();
    if (entry.refutation) existing.refutation = entry.refutation;
    return patterns;
  }
  return [
    ...patterns,
    {
      ...entry,
      occurrences: 1,
      avgCpLoss: entry.cpLoss,
      lastSeen: Date.now(),
    },
  ];
}

export function finishGame(
  memory: ChimeraMemory,
  game: StoredGame,
  crsOptions?: { mode?: CrsMode; opponentRating?: number }
): ChimeraMemory {
  const games = [...memory.games, game];
  let patterns = [...memory.patterns];

  for (const m of game.mistakes) {
    patterns = upsertPattern(patterns, {
      positionKey: positionKey(m.fenBefore),
      typicalBadMove: m.played,
      refutation: m.best,
      cpLoss: m.cpLoss,
    });
  }

  patterns.sort((a, b) => b.occurrences - a.occurrences);
  if (patterns.length > 200) patterns = patterns.slice(0, 200);

  const learning = learnFromGame(memory, game, patterns);
  const adaptation = learning.adaptationScore;

  let userStyle = memory.userStyle ?? createPlayStyleProfile(INITIAL_USER_ELO);
  const chimeraEloBefore = memory.chimeraElo ?? INITIAL_CHIMERA_ELO;
  const userEloBefore = getUserStrength(memory);
  const chimeraScore = resultToScore(game.result, false);
  const chimeraDelta = calculateEloChange(chimeraEloBefore, userEloBefore, chimeraScore);
  userStyle = {
    ...userStyle,
    games: userStyle.games + 1,
  };
  let chimeraElo = clampElo(chimeraEloBefore + chimeraDelta, 80, 3200);
  chimeraElo = nudgeStoredChimeraElo(memory, chimeraElo);

  const stats = { ...memory.stats };
  stats.totalGames += 1;
  stats.totalMoves += game.moves.length;
  if (game.result === "user-win") stats.userWins += 1;
  else if (game.result === "chimera-win") stats.chimeraWins += 1;
  else stats.draws += 1;

  let withElo = refreshOpponentCognitiveIdentity(
    refreshUserCognitiveIdentity({
      version: 1,
      games,
      patterns,
      stats,
      adaptation,
      chimeraElo,
      userStyle,
      chimera1: memory.chimera1,
      chimera2: memory.chimera2,
      mirrorStats: memory.mirrorStats,
      cognitiveIdentity: memory.cognitiveIdentity,
      lastChimeraEloChange: chimeraDelta,
      chimeraOpponent: memory.chimeraOpponent,
      chimeraOpponentIdentity: memory.chimeraOpponentIdentity,
      crs: memory.crs ?? ensureCrsState(memory),
      learning,
    })
  );

  if (learning.phenotype) {
    const prevPid = memory.learning?.phenotype?.personalityId;
    const nextPid = learning.phenotype.personalityId;
    if (nextPid && nextPid !== prevPid) {
      withElo = applyOpponentPhenotype(withElo, learning.phenotype);
    }
  }

  return applyCrsForStoredGame(
    withElo,
    game,
    crsOptions?.mode ?? "chimera",
    crsOptions?.opponentRating
  );
}

export function getTopPatterns(memory: ChimeraMemory, n = 5): UserPattern[] {
  return [...memory.patterns]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, n);
}
