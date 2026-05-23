import { classifyCognition, type CognitiveClassification } from "./classifier";
import {
  anchorIdentityToPersona,
  createPersonaIdentity,
} from "./chimeraPersonas";
import {
  getPrimaryDef,
  getSubdivisionDef,
  type PrimaryArchetypeId,
  type SubdivisionId,
} from "./archetypes";
import type { ArchetypeInfluence } from "./classifier";
import type { ChimeraMemory } from "../types";
import type { PlayStyleProfile } from "../playStyle";
import { buildIdentityFromPhenotype } from "../learning/phenotype";

const BLEND = 0.38;

export interface CognitiveIdentity {
  primary: PrimaryArchetypeId;
  subdivision: SubdivisionId;
  secondary: ArchetypeInfluence[];
  /** Smoothed primary scores for evolution */
  blendedScores: Record<PrimaryArchetypeId, number>;
  confidence: number;
  nascent: boolean;
  updatedAt: number;
  previousPrimary?: PrimaryArchetypeId;
  previousSubdivision?: SubdivisionId;
  evolutionNote?: string;
  /** Which CHIMERA mind this identity belongs to */
  entityId?: import("./chimeraPersonas").ChimeraEntityId;
  seedPrimary?: PrimaryArchetypeId;
  personaLabel?: string;
  personaCodename?: string;
  personaTagline?: string;
}

function evolutionMessage(
  prev: PrimaryArchetypeId | undefined,
  next: PrimaryArchetypeId,
  prevSub: SubdivisionId | undefined,
  nextSub: SubdivisionId
): string | undefined {
  if (!prev || prev === next) {
    if (prevSub && prevSub !== nextSub) {
      const sub = getSubdivisionDef(nextSub);
      return `Refining within ${getPrimaryDef(next).name} → ${sub?.label ?? nextSub}`;
    }
    return undefined;
  }
  return `Evolving ${getPrimaryDef(prev).name} → ${getPrimaryDef(next).name}`;
}

function blendScores(
  prev: Record<PrimaryArchetypeId, number> | undefined,
  next: Record<PrimaryArchetypeId, number>
): Record<PrimaryArchetypeId, number> {
  const out = { ...next };
  if (!prev) return out;
  for (const k of Object.keys(next) as PrimaryArchetypeId[]) {
    out[k] = Math.round(prev[k] * (1 - BLEND) + next[k] * BLEND);
  }
  return out;
}

function pickFromBlended(
  blended: Record<PrimaryArchetypeId, number>
): PrimaryArchetypeId {
  let best: PrimaryArchetypeId = "architect";
  let bestScore = -1;
  for (const [id, score] of Object.entries(blended) as [PrimaryArchetypeId, number][]) {
    if (score > bestScore) {
      bestScore = score;
      best = id;
    }
  }
  return best;
}

export function buildCognitiveIdentity(
  profile: PlayStyleProfile,
  opts?: {
    previousIdentity?: CognitiveIdentity;
    fresh?: CognitiveClassification;
  }
): CognitiveIdentity {
  const classification =
    opts?.fresh ?? classifyCognition(profile);

  const blendedScores = blendScores(
    opts?.previousIdentity?.blendedScores,
    classification.primaryScores
  );

  const primary = pickFromBlended(blendedScores);
  const primaryDef = getPrimaryDef(primary);

  let subdivision = classification.subdivision;
  if (primary !== classification.primary) {
    const flat = classification.metricsSnapshot;
    let bestSub = primaryDef.subdivisions[0].id;
    let best = -1;
    for (const sub of primaryDef.subdivisions) {
      const merged = { ...primaryDef.weights, ...sub.weightAdjust };
      let sum = 0;
      let wSum = 0;
      for (const [key, w] of Object.entries(merged)) {
        const v = flat[key];
        if (v === undefined) continue;
        if (w >= 0) {
          sum += (v / 100) * w;
          wSum += w;
        } else {
          sum += ((100 - v) / 100) * Math.abs(w);
          wSum += Math.abs(w);
        }
      }
      const s = wSum ? (sum / wSum) * 100 : 0;
      if (s > best) {
        best = s;
        bestSub = sub.id;
      }
    }
    subdivision = bestSub;
  }

  const prev = opts?.previousIdentity;
  const evolutionNote = evolutionMessage(
    prev?.primary,
    primary,
    prev?.subdivision,
    subdivision
  );

  const secondary = classification.secondary.filter((s) => s.id !== primary);

  return {
    primary,
    subdivision,
    secondary,
    blendedScores,
    confidence: classification.confidence,
    nascent: classification.nascent,
    updatedAt: Date.now(),
    previousPrimary:
      prev && prev.primary !== primary ? prev.primary : prev?.previousPrimary,
    previousSubdivision:
      prev && prev.subdivision !== subdivision
        ? prev.subdivision
        : prev?.previousSubdivision,
    evolutionNote,
  };
}

export function refreshUserCognitiveIdentity(
  memory: ChimeraMemory
): ChimeraMemory {
  const profile = memory.userStyle;
  if (!profile) return memory;
  const cognitiveIdentity = buildCognitiveIdentity(profile, {
    previousIdentity: memory.cognitiveIdentity,
  });
  return { ...memory, cognitiveIdentity };
}

export function refreshMirrorCognitiveIdentities(
  memory: ChimeraMemory
): ChimeraMemory {
  const c1 = memory.chimera1;
  const c2 = memory.chimera2;
  return {
    ...memory,
    chimera1Identity: c1
      ? anchorIdentityToPersona(
          buildCognitiveIdentity(c1, { previousIdentity: memory.chimera1Identity }),
          "mirror-white"
        )
      : memory.chimera1Identity ?? createPersonaIdentity("mirror-white"),
    chimera2Identity: c2
      ? anchorIdentityToPersona(
          buildCognitiveIdentity(c2, { previousIdentity: memory.chimera2Identity }),
          "mirror-black"
        )
      : memory.chimera2Identity ?? createPersonaIdentity("mirror-black"),
  };
}

export function refreshOpponentCognitiveIdentity(
  memory: ChimeraMemory
): ChimeraMemory {
  const profile = memory.chimeraOpponent;
  if (!profile) {
    return memory;
  }
  const phenotype = memory.learning?.phenotype;
  if (phenotype) {
    return {
      ...memory,
      chimeraOpponentIdentity: buildIdentityFromPhenotype(
        phenotype,
        memory.chimeraOpponentIdentity
      ),
    };
  }
  return {
    ...memory,
    chimeraOpponentIdentity: anchorIdentityToPersona(
      buildCognitiveIdentity(profile, {
        previousIdentity: memory.chimeraOpponentIdentity,
      }),
      "opponent"
    ),
  };
}

export function getMirrorArchetype(
  memory: ChimeraMemory,
  side: "w" | "b"
): CognitiveIdentity | undefined {
  return side === "w" ? memory.chimera1Identity : memory.chimera2Identity;
}

export function identityFromProfile(
  profile: PlayStyleProfile,
  previous?: CognitiveIdentity
): CognitiveIdentity {
  return buildCognitiveIdentity(profile, { previousIdentity: previous });
}
