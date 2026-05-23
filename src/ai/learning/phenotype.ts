import type { PrimaryArchetypeId } from "../cognition/archetypes";
import {
  getPrimaryDef,
  getSubdivisionDef,
} from "../cognition/archetypes";
import {
  getPersonalityById,
  rollRandomPersonality,
  type PersonalityTypeDef,
} from "../cognition/personality400";
import { displayNameForPersonality } from "../cognition/personalityNarrative";
import type { CognitiveIdentity } from "../cognition/identity";
import { createPlayStyleProfile, type PlayStyleProfile } from "../playStyle";
import type { ChimeraMemory } from "../types";
import { INITIAL_CHIMERA_ELO } from "../types";
import type { ChimeraPhenotype } from "./types";
import { emptyLearningState } from "./learn";
import { loadChimeraSetup } from "../../chimeraSetup/storage";

function jitter(n: number, spread: number): number {
  return Math.max(0, Math.round(n + (Math.random() * 2 - 1) * spread));
}

function profileSeedFromPersonality(personality: PersonalityTypeDef): Partial<PlayStyleProfile> {
  const w = {
    ...getPrimaryDef(personality.primary).weights,
    ...personality.weightAdjust,
  };
  const atk = Math.max(0, (w.initiativeValuation ?? 0) + (w.attackSpeed ?? 0));
  const defensive = Math.max(0, (w.prophylaxis ?? 0) + (w.structureQuality ?? 0));
  const chaos = Math.max(0, w.chaosTolerance ?? 0);
  const risk = Math.max(0, w.riskAppetite ?? 0);

  return {
    quietMoves: jitter(6 + defensive * 20, 3),
    prophylaxis: jitter(2 + defensive * 12, 2),
    castles: jitter(2 + defensive * 8, 1),
    checks: jitter(2 + atk * 14, 2),
    captures: jitter(4 + atk * 10, 2),
    sacrifices: jitter(1 + risk * 8 + chaos * 6, 1),
    development: jitter(4 + atk * 6, 2),
    pawnAdvances: jitter(3 + atk * 8, 2),
    evalSwingUp: jitter(3 + atk * 8, 2),
    evalSwingDown: jitter(2 + chaos * 6, 1),
    blunders: jitter(1 + chaos * 4, 1),
    mistakes: jitter(2, 1),
    cpLossSum: jitter(480 + defensive * 120, 80),
    cpLossSamples: jitter(16 + atk * 4, 3),
    endgameMoves: jitter(2 + defensive * 6, 1),
    earlyQueen: risk > 0.08 && Math.random() > 0.65 ? 1 : 0,
  };
}

/** Legacy fallback when no personality id */
function profileSeedForPrimary(primary: PrimaryArchetypeId): Partial<PlayStyleProfile> {
  const w = getPrimaryDef(primary).weights;
  const atk = Math.max(0, (w.initiativeValuation ?? 0) + (w.attackSpeed ?? 0));
  const def = Math.max(0, (w.prophylaxis ?? 0) + (w.structureQuality ?? 0));
  const chaos = Math.max(0, w.chaosTolerance ?? 0);
  const risk = Math.max(0, w.riskAppetite ?? 0);

  return {
    quietMoves: jitter(6 + def * 20, 3),
    prophylaxis: jitter(2 + def * 12, 2),
    castles: jitter(2 + def * 8, 1),
    checks: jitter(2 + atk * 14, 2),
    captures: jitter(4 + atk * 10, 2),
    sacrifices: jitter(1 + risk * 8 + chaos * 6, 1),
    development: jitter(4 + atk * 6, 2),
    pawnAdvances: jitter(3 + atk * 8, 2),
    evalSwingUp: jitter(3 + atk * 8, 2),
    evalSwingDown: jitter(2 + chaos * 6, 1),
    blunders: jitter(1 + chaos * 4, 1),
    mistakes: jitter(2, 1),
    cpLossSum: jitter(480 + def * 120, 80),
    cpLossSamples: jitter(16 + atk * 4, 3),
    endgameMoves: jitter(2 + def * 6, 1),
    earlyQueen: risk > 0.08 && Math.random() > 0.65 ? 1 : 0,
  };
}

export function personalityToPhenotype(def: PersonalityTypeDef): ChimeraPhenotype {
  return {
    personalityId: def.id,
    typeCode: def.typeCode,
    primary: def.primary,
    subdivision: def.subdivision,
    seed: def.id,
  };
}

export function resolvePersonalityDef(
  phenotype: ChimeraPhenotype
): PersonalityTypeDef | undefined {
  if (phenotype.personalityId) {
    return getPersonalityById(phenotype.personalityId);
  }
  return undefined;
}

export function normalizePhenotype(phenotype: ChimeraPhenotype): ChimeraPhenotype {
  const def = resolvePersonalityDef(phenotype);
  if (def) return personalityToPhenotype(def);
  if (!phenotype.personalityId) {
    const rolled = rollRandomPersonality();
    return personalityToPhenotype(rolled);
  }
  return phenotype;
}

export function rollRandomPhenotype(): ChimeraPhenotype {
  return personalityToPhenotype(rollRandomPersonality());
}

function blankPrimaryScores(low = 28): Record<PrimaryArchetypeId, number> {
  const scores = {} as Record<PrimaryArchetypeId, number>;
  const primaries: PrimaryArchetypeId[] = [
    "architect",
    "warlord",
    "oracle",
    "phantom",
    "titan",
    "alchemist",
    "sovereign",
  ];
  for (const p of primaries) {
    scores[p] = low;
  }
  return scores;
}

export function phenotypeDisplayName(phenotype: ChimeraPhenotype): string {
  const def = resolvePersonalityDef(phenotype);
  if (def) return displayNameForPersonality(def, def.fineIndex);
  const primary = getPrimaryDef(phenotype.primary);
  const sub = getSubdivisionDef(phenotype.subdivision);
  return `${primary.name} · ${sub?.label ?? phenotype.subdivision}`;
}

export function buildIdentityFromPhenotype(
  phenotype: ChimeraPhenotype,
  previous?: CognitiveIdentity
): CognitiveIdentity {
  const def = resolvePersonalityDef(phenotype);
  const primaryDef = getPrimaryDef(phenotype.primary);
  const subDef = getSubdivisionDef(phenotype.subdivision)!;
  const blendedScores = blankPrimaryScores(22);
  blendedScores[phenotype.primary] = 76;

  const secondary = (
    [
      "architect",
      "warlord",
      "oracle",
      "phantom",
      "titan",
      "alchemist",
      "sovereign",
    ] as PrimaryArchetypeId[]
  )
    .filter((id) => id !== phenotype.primary)
    .slice(0, 2)
    .map((id, i) => ({
      id,
      weight: 26 - i * 8,
    }));

  return {
    primary: phenotype.primary,
    subdivision: phenotype.subdivision,
    secondary,
    blendedScores,
    confidence: previous?.confidence ?? 68,
    nascent: false,
    updatedAt: Date.now(),
    entityId: "opponent",
    seedPrimary: phenotype.primary,
    personaLabel: def
      ? `CHIMERA · ${def.title}`
      : `CHIMERA · ${primaryDef.name}`,
    personaCodename: def
      ? `${def.typeCode} · ${def.mind}/${def.soul}`
      : subDef.label,
    personaTagline: def?.tagline ?? subDef.tagline,
  };
}

export function buildPlayStyleFromPhenotype(
  phenotype: ChimeraPhenotype,
  elo = INITIAL_CHIMERA_ELO
): PlayStyleProfile {
  const def = resolvePersonalityDef(phenotype);
  const seed = def
    ? profileSeedFromPersonality(def)
    : profileSeedForPrimary(phenotype.primary);
  return {
    ...createPlayStyleProfile(elo),
    moves: 24,
    games: 1,
    ...seed,
  };
}

/** Apply a rolled phenotype to the main opponent CHIMERA (arena + solo). */
export function applyOpponentPhenotype(
  memory: ChimeraMemory,
  phenotype: ChimeraPhenotype
): ChimeraMemory {
  const normalized = normalizePhenotype(phenotype);
  const elo = memory.chimeraOpponent?.elo ?? memory.chimeraElo ?? INITIAL_CHIMERA_ELO;
  const learning = {
    ...emptyLearningState(),
    ...memory.learning,
    phenotype: normalized,
  };

  return {
    ...memory,
    learning,
    chimeraOpponent: buildPlayStyleFromPhenotype(normalized, elo),
    chimeraOpponentIdentity: buildIdentityFromPhenotype(
      normalized,
      memory.chimeraOpponentIdentity
    ),
  };
}

export function ensureOpponentPhenotype(memory: ChimeraMemory): ChimeraMemory {
  const fromSetup = loadChimeraSetup()?.phenotype;
  if (fromSetup) {
    return applyOpponentPhenotype(memory, fromSetup);
  }
  const L = memory.learning;
  if (L?.phenotype) {
    if (
      memory.chimeraOpponentIdentity?.primary !== L.phenotype.primary ||
      memory.chimeraOpponentIdentity?.subdivision !== L.phenotype.subdivision
    ) {
      return applyOpponentPhenotype(memory, L.phenotype);
    }
    return memory;
  }
  return applyOpponentPhenotype(memory, rollRandomPhenotype());
}
