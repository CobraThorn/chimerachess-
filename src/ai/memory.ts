import {
  createPersonaPlayStyle,
  ensureDistinctChimeraPersonalities,
} from "./cognition/chimeraPersonas";
import {
  refreshMirrorCognitiveIdentities,
  refreshOpponentCognitiveIdentity,
  refreshUserCognitiveIdentity,
} from "./cognition/identity";
import { clampElo, calculateEloChange, resultToScore } from "./elo";
import { adjustElo, createPlayStyleProfile } from "./playStyle";
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
  return {
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
    chimeraOpponent: createPersonaPlayStyle("opponent"),
    chimera1: createPersonaPlayStyle("mirror-white"),
    chimera2: createPersonaPlayStyle("mirror-black"),
  };
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
    return ensureDistinctChimeraPersonalities(
      refreshOpponentCognitiveIdentity(
        refreshMirrorCognitiveIdentities(migrateLegacyChimeraElo(parsed))
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
  game: StoredGame
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

  const adaptation = Math.min(
    100,
    memory.adaptation + 4 + game.mistakes.length * 2
  );

  let userStyle = memory.userStyle ?? createPlayStyleProfile(INITIAL_USER_ELO);
  const chimeraEloBefore = memory.chimeraElo ?? INITIAL_CHIMERA_ELO;
  const userEloBefore = userStyle.elo;
  const userScore = resultToScore(game.result, true);
  const chimeraScore = resultToScore(game.result, false);
  const userDelta = calculateEloChange(userEloBefore, chimeraEloBefore, userScore);
  const chimeraDelta = calculateEloChange(chimeraEloBefore, userEloBefore, chimeraScore);
  userStyle = adjustElo(userStyle, userDelta);
  userStyle = {
    ...userStyle,
    elo: clampElo(userStyle.elo),
    games: userStyle.games + 1,
  };
  const chimeraElo = clampElo(chimeraEloBefore + chimeraDelta);

  const stats = { ...memory.stats };
  stats.totalGames += 1;
  stats.totalMoves += game.moves.length;
  if (game.result === "user-win") stats.userWins += 1;
  else if (game.result === "chimera-win") stats.chimeraWins += 1;
  else stats.draws += 1;

  return refreshOpponentCognitiveIdentity(refreshUserCognitiveIdentity({
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
    lastEloChange: userDelta,
    lastChimeraEloChange: chimeraDelta,
    chimeraOpponent: memory.chimeraOpponent,
    chimeraOpponentIdentity: memory.chimeraOpponentIdentity,
  }));
}

export function getTopPatterns(memory: ChimeraMemory, n = 5): UserPattern[] {
  return [...memory.patterns]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, n);
}
