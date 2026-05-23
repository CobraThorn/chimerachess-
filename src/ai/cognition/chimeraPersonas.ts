import type { PrimaryArchetypeId, SubdivisionId } from "./archetypes";
import { getPrimaryDef, getSubdivisionDef, PRIMARY_ARCHETYPES } from "./archetypes";
import type { CognitiveIdentity } from "./identity";
import type { ChimeraMemory } from "../types";
import { INITIAL_CHIMERA_ELO } from "../types";
import { applyOpponentPhenotype } from "../learning/phenotype";
import { createPlayStyleProfile, type PlayStyleProfile } from "../playStyle";

/** Every CHIMERA mind has a distinct seeded cognition — not cloned defaults. */
export type ChimeraEntityId = "opponent" | "mirror-white" | "mirror-black";

export interface ChimeraPersonaDef {
  entityId: ChimeraEntityId;
  displayName: string;
  codename: string;
  primary: PrimaryArchetypeId;
  subdivision: SubdivisionId;
  profileSeed: Partial<
    Omit<PlayStyleProfile, "elo" | "games" | "moves">
  >;
}

export const CHIMERA_PERSONAS: Record<ChimeraEntityId, ChimeraPersonaDef> = {
  opponent: {
    entityId: "opponent",
    displayName: "CHIMERA",
    codename: "Scandinavian",
    primary: "architect",
    subdivision: "architect-machine",
    profileSeed: {
      quietMoves: 11,
      prophylaxis: 6,
      castles: 3,
      checks: 2,
      captures: 4,
      sacrifices: 1,
      development: 5,
      evalSwingUp: 5,
      evalSwingDown: 2,
      blunders: 1,
      mistakes: 2,
      cpLossSum: 520,
      cpLossSamples: 18,
      pawnAdvances: 4,
      endgameMoves: 3,
    },
  },
  "mirror-white": {
    entityId: "mirror-white",
    displayName: "CHIMERA I",
    codename: "White",
    primary: "warlord",
    subdivision: "warlord-tyrant",
    profileSeed: {
      checks: 9,
      captures: 11,
      sacrifices: 5,
      earlyQueen: 1,
      pawnAdvances: 7,
      quietMoves: 4,
      castles: 2,
      prophylaxis: 1,
      development: 4,
      evalSwingUp: 4,
      evalSwingDown: 5,
      blunders: 3,
      mistakes: 4,
      cpLossSum: 780,
      cpLossSamples: 20,
      endgameMoves: 2,
    },
  },
  "mirror-black": {
    entityId: "mirror-black",
    displayName: "CHIMERA II",
    codename: "Black",
    primary: "phantom",
    subdivision: "phantom-assassin",
    profileSeed: {
      checks: 5,
      captures: 8,
      sacrifices: 6,
      quietMoves: 7,
      prophylaxis: 4,
      castles: 2,
      development: 3,
      evalSwingUp: 7,
      evalSwingDown: 3,
      blunders: 2,
      mistakes: 3,
      cpLossSum: 640,
      cpLossSamples: 19,
      pawnAdvances: 3,
      endgameMoves: 4,
      earlyQueen: 0,
    },
  },
};

function blankPrimaryScores(low = 28): Record<PrimaryArchetypeId, number> {
  const scores = {} as Record<PrimaryArchetypeId, number>;
  for (const p of PRIMARY_ARCHETYPES) {
    scores[p.id] = low;
  }
  return scores;
}

export function createPersonaPlayStyle(
  entity: ChimeraEntityId,
  elo = INITIAL_CHIMERA_ELO
): PlayStyleProfile {
  const persona = CHIMERA_PERSONAS[entity];
  const moves = 26;
  return {
    ...createPlayStyleProfile(elo),
    moves,
    games: 1,
    ...persona.profileSeed,
  };
}

export function createPersonaIdentity(
  entity: ChimeraEntityId
): CognitiveIdentity {
  const persona = CHIMERA_PERSONAS[entity];
  const primaryDef = getPrimaryDef(persona.primary);
  const subDef = getSubdivisionDef(persona.subdivision)!;
  const blendedScores = blankPrimaryScores(22);
  blendedScores[persona.primary] = 78;
  const secondary = PRIMARY_ARCHETYPES.map((p) => p.id)
    .filter((id) => id !== persona.primary)
    .slice(0, 2)
    .map((id, i) => ({
      id,
      weight: 28 - i * 8,
    }));

  return {
    primary: persona.primary,
    subdivision: persona.subdivision,
    secondary,
    blendedScores,
    confidence: 72,
    nascent: false,
    updatedAt: Date.now(),
    entityId: entity,
    seedPrimary: persona.primary,
    personaLabel: `${persona.displayName} · ${primaryDef.name}`,
    personaCodename: persona.codename,
    personaTagline: subDef.tagline,
  };
}

export function personaForSide(side: "w" | "b"): ChimeraEntityId {
  return side === "w" ? "mirror-white" : "mirror-black";
}

export function anchorIdentityToPersona(
  identity: CognitiveIdentity,
  entity: ChimeraEntityId
): CognitiveIdentity {
  const persona = CHIMERA_PERSONAS[entity];
  const subDef = getSubdivisionDef(persona.subdivision);
  const blended = { ...identity.blendedScores };
  blended[persona.primary] = Math.max(blended[persona.primary] ?? 0, 58);

  const keepEvolvedPrimary =
    identity.confidence >= 62 && identity.primary !== persona.primary;
  const activePrimary = keepEvolvedPrimary ? identity.primary : persona.primary;

  return {
    ...identity,
    primary: activePrimary,
    subdivision: keepEvolvedPrimary ? identity.subdivision : persona.subdivision,
    blendedScores: blended,
    entityId: entity,
    seedPrimary: persona.primary,
    personaLabel: `${persona.displayName} · ${getPrimaryDef(activePrimary).name}`,
    personaCodename: persona.codename,
    personaTagline: subDef?.tagline,
    nascent: false,
  };
}

export function chimeraIdentitiesMatch(
  a?: CognitiveIdentity,
  b?: CognitiveIdentity
): boolean {
  if (!a || !b) return false;
  return a.primary === b.primary && a.subdivision === b.subdivision;
}

export function seedAllChimeraPersonalities(memory: ChimeraMemory): ChimeraMemory {
  if (memory.learning?.phenotype && !memory.chimeraOpponent) {
    return applyOpponentPhenotype(memory, memory.learning.phenotype);
  }
  return {
    ...memory,
    chimeraOpponent:
      memory.chimeraOpponent ?? createPersonaPlayStyle("opponent"),
    chimeraOpponentIdentity:
      memory.chimeraOpponentIdentity ?? createPersonaIdentity("opponent"),
    chimera1: memory.chimera1 ?? createPersonaPlayStyle("mirror-white"),
    chimera1Identity:
      memory.chimera1Identity ?? createPersonaIdentity("mirror-white"),
    chimera2: memory.chimera2 ?? createPersonaPlayStyle("mirror-black"),
    chimera2Identity:
      memory.chimera2Identity ?? createPersonaIdentity("mirror-black"),
  };
}

export function ensureDistinctChimeraPersonalities(
  memory: ChimeraMemory
): ChimeraMemory {
  let next = seedAllChimeraPersonalities(memory);

  if (
    chimeraIdentitiesMatch(next.chimera1Identity, next.chimera2Identity) ||
    !next.chimera1Identity?.entityId
  ) {
    next = {
      ...next,
      chimera1: createPersonaPlayStyle("mirror-white", next.chimera1?.elo ?? INITIAL_CHIMERA_ELO),
      chimera1Identity: createPersonaIdentity("mirror-white"),
      chimera2: createPersonaPlayStyle("mirror-black", next.chimera2?.elo ?? INITIAL_CHIMERA_ELO),
      chimera2Identity: createPersonaIdentity("mirror-black"),
    };
  }

  if (!next.chimeraOpponentIdentity?.entityId && !next.learning?.phenotype) {
    next = {
      ...next,
      chimeraOpponent: createPersonaPlayStyle("opponent", next.chimeraOpponent?.elo ?? INITIAL_CHIMERA_ELO),
      chimeraOpponentIdentity: createPersonaIdentity("opponent"),
    };
  }

  return next;
}
