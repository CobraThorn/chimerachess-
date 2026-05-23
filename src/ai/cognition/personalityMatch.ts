import type { ChimeraMemory } from "../types";
import { userStyleToRadar } from "../memoryRadar";
import type { PersonalityTypeDef } from "./personality400";
import { PERSONALITY_TYPES_400, getRichProfile } from "./personality400";
import type { PersonalityRichProfile } from "./personalityNarrative";

/** 0–100 trait vector for matching */
export interface TraitVector {
  aggression: number;
  positional: number;
  tactical: number;
  calculation: number;
  risk: number;
  patience: number;
}

export interface PersonalityMatchResult {
  def: PersonalityTypeDef;
  profile: PersonalityRichProfile;
  matchPercent: number;
}

export const DEFAULT_TRAIT_VECTOR: TraitVector = {
  aggression: 50,
  positional: 50,
  tactical: 50,
  calculation: 50,
  risk: 50,
  patience: 50,
};

function traitVectorFromDef(def: PersonalityTypeDef): TraitVector {
  const ind = getRichProfile(def).playstyleIndicators;
  const by = Object.fromEntries(ind.map((i) => [i.label, i.value]));
  return {
    aggression: by.Aggression ?? 50,
    positional: by.Positional ?? 50,
    tactical: by.Tactical ?? 50,
    calculation: by.Calculation ?? 50,
    risk: by["Risk appetite"] ?? 50,
    patience: Math.max(0, 100 - (by.Aggression ?? 50) * 0.4 - (by["Risk appetite"] ?? 50) * 0.3),
  };
}

function distance(a: TraitVector, b: TraitVector): number {
  const keys: (keyof TraitVector)[] = [
    "aggression",
    "positional",
    "tactical",
    "calculation",
    "risk",
    "patience",
  ];
  let sum = 0;
  for (const k of keys) {
    const d = (a[k] - b[k]) / 100;
    sum += d * d;
  }
  return Math.sqrt(sum / keys.length);
}

function matchPercent(a: TraitVector, b: TraitVector): number {
  const d = distance(a, b);
  return Math.round(Math.max(62, Math.min(98, 98 - d * 85)));
}

export function traitsFromMemory(memory: ChimeraMemory): TraitVector {
  const radar = userStyleToRadar(memory);
  const by = Object.fromEntries(radar.map((r) => [r.short, r.value]));
  return {
    aggression: by.ATK ?? 50,
    positional: by.PRE ?? 50,
    tactical: by.TAC ?? 50,
    calculation: by.PRE ?? 50,
    risk: by.RISK ?? 50,
    patience: Math.max(0, 100 - (by.ATK ?? 50) * 0.35 - (by.RISK ?? 50) * 0.25),
  };
}

export function traitsFromQuiz(sliders: Partial<TraitVector>): TraitVector {
  return { ...DEFAULT_TRAIT_VECTOR, ...sliders };
}

export function topPersonalityMatches(
  traits: TraitVector,
  limit = 3
): PersonalityMatchResult[] {
  const scored = PERSONALITY_TYPES_400.map((def) => ({
    def,
    profile: getRichProfile(def),
    matchPercent: matchPercent(traits, traitVectorFromDef(def)),
  }));
  scored.sort((a, b) => b.matchPercent - a.matchPercent);

  const result: PersonalityMatchResult[] = [];
  const seenMacro = new Set<string>();
  for (const item of scored) {
    if (result.length >= limit) break;
    if (seenMacro.has(item.def.macroId) && result.length > 0) continue;
    seenMacro.add(item.def.macroId);
    result.push(item);
  }
  for (const item of scored) {
    if (result.length >= limit) break;
    if (!result.some((r) => r.def.id === item.def.id)) result.push(item);
  }
  return result;
}
