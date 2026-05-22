import type { PrimaryArchetypeId, SubdivisionId } from "./archetypes";
import type { CognitiveIdentity } from "./identity";

/** Subtle move-selection biases from cognitive archetype (mirror / CHIMERA minds). */
export interface ArchetypePlayBias {
  blunderRateDelta: number;
  depthDelta: number;
  randomTopMoveChance: number;
}

const SUB_BIAS: Partial<Record<SubdivisionId, ArchetypePlayBias>> = {
  "warlord-berserker": { blunderRateDelta: 0.06, depthDelta: 0, randomTopMoveChance: 0.12 },
  "warlord-predator": { blunderRateDelta: -0.04, depthDelta: 1, randomTopMoveChance: 0.05 },
  "architect-fortress": { blunderRateDelta: -0.08, depthDelta: 0, randomTopMoveChance: 0.02 },
  "architect-machine": { blunderRateDelta: -0.1, depthDelta: 1, randomTopMoveChance: 0.02 },
  "alchemist-madman": { blunderRateDelta: 0.1, depthDelta: -1, randomTopMoveChance: 0.18 },
  "alchemist-gambler": { blunderRateDelta: 0.08, depthDelta: 0, randomTopMoveChance: 0.15 },
  "phantom-assassin": { blunderRateDelta: 0.02, depthDelta: 1, randomTopMoveChance: 0.08 },
  "titan-bastion": { blunderRateDelta: -0.07, depthDelta: 0, randomTopMoveChance: 0.03 },
};

const PRIMARY_BIAS: Record<PrimaryArchetypeId, ArchetypePlayBias> = {
  architect: { blunderRateDelta: -0.05, depthDelta: 0, randomTopMoveChance: 0.04 },
  warlord: { blunderRateDelta: 0.04, depthDelta: 1, randomTopMoveChance: 0.1 },
  oracle: { blunderRateDelta: -0.03, depthDelta: 1, randomTopMoveChance: 0.06 },
  phantom: { blunderRateDelta: 0.02, depthDelta: 1, randomTopMoveChance: 0.09 },
  titan: { blunderRateDelta: -0.06, depthDelta: 0, randomTopMoveChance: 0.03 },
  alchemist: { blunderRateDelta: 0.07, depthDelta: -1, randomTopMoveChance: 0.14 },
  sovereign: { blunderRateDelta: -0.04, depthDelta: 1, randomTopMoveChance: 0.05 },
};

export function archetypePlayBias(
  identity?: CognitiveIdentity
): ArchetypePlayBias {
  if (!identity || identity.nascent) {
    return { blunderRateDelta: 0, depthDelta: 0, randomTopMoveChance: 0.35 };
  }
  const sub = SUB_BIAS[identity.subdivision];
  const primary = PRIMARY_BIAS[identity.primary];
  return {
    blunderRateDelta: (sub?.blunderRateDelta ?? 0) + primary.blunderRateDelta * 0.5,
    depthDelta: (sub?.depthDelta ?? 0) + primary.depthDelta,
    randomTopMoveChance:
      sub?.randomTopMoveChance ?? primary.randomTopMoveChance,
  };
}
