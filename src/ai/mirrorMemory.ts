import { createPersonaPlayStyle } from "./cognition/chimeraPersonas";
import { refreshMirrorCognitiveIdentities } from "./cognition/identity";
import { createEmptyMemory } from "./memory";
import { adjustElo } from "./playStyle";
import type { ChimeraMemory } from "./types";
import { INITIAL_CHIMERA_ELO } from "./types";

/** Neutral CHIMERA minds for AI vs AI (no user-pattern exploits). */
export function createMirrorMemory(base?: ChimeraMemory): ChimeraMemory {
  const seed = base ?? createEmptyMemory();
  return {
    ...seed,
    patterns: [],
    adaptation: Math.min(35, seed.adaptation),
    chimeraElo: INITIAL_CHIMERA_ELO,
  };
}

export function recordMirrorResult(
  memory: ChimeraMemory,
  winner: "w" | "b" | "draw"
): ChimeraMemory {
  const ms = memory.mirrorStats ?? {
    total: 0,
    whiteWins: 0,
    blackWins: 0,
    draws: 0,
  };
  const next = { ...ms, total: ms.total + 1 };
  if (winner === "w") next.whiteWins += 1;
  else if (winner === "b") next.blackWins += 1;
  else next.draws += 1;

  let chimera1 = memory.chimera1 ?? createPersonaPlayStyle("mirror-white");
  let chimera2 = memory.chimera2 ?? createPersonaPlayStyle("mirror-black");
  chimera1 = { ...chimera1, games: chimera1.games + 1 };
  chimera2 = { ...chimera2, games: chimera2.games + 1 };

  if (winner === "w") {
    chimera1 = adjustElo(chimera1, 10);
    chimera2 = adjustElo(chimera2, -6);
  } else if (winner === "b") {
    chimera2 = adjustElo(chimera2, 10);
    chimera1 = adjustElo(chimera1, -6);
  } else {
    chimera1 = adjustElo(chimera1, 2);
    chimera2 = adjustElo(chimera2, 2);
  }

  return refreshMirrorCognitiveIdentities({
    ...memory,
    mirrorStats: next,
    chimera1,
    chimera2,
  });
}

/** Mirror duel context for one side — uses that CHIMERA's Elo, not the user opponent rating. */
export function mirrorMemoryForColor(
  memory: ChimeraMemory,
  color: "w" | "b"
): ChimeraMemory {
  const profile =
    color === "w"
      ? memory.chimera1 ?? createPersonaPlayStyle("mirror-white")
      : memory.chimera2 ?? createPersonaPlayStyle("mirror-black");
  return {
    ...createMirrorMemory(memory),
    chimeraElo: profile.elo,
  };
}
