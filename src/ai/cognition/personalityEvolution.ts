import type { ChimeraMemory } from "../types";
import {
  getPersonalityById,
  getRichProfile,
  type PersonalityTypeDef,
} from "./personality400";
import {
  topPersonalityMatches,
  traitsFromMemory,
  type TraitVector,
} from "./personalityMatch";
import type { PhenotypeEvolution } from "../learning/types";
import {
  appendRadarSnapshot,
  radarCurrentFromMemory,
} from "./personalityRadar";

function traitDeltas(
  baseline: TraitVector,
  current: TraitVector
): { label: string; delta: number }[] {
  const keys: { key: keyof TraitVector; label: string }[] = [
    { key: "aggression", label: "Aggression" },
    { key: "positional", label: "Positional understanding" },
    { key: "tactical", label: "Tactical sharpness" },
    { key: "calculation", label: "Calculation" },
    { key: "risk", label: "Risk appetite" },
    { key: "patience", label: "Patience" },
  ];
  return keys.map(({ key, label }) => ({
    label,
    delta: current[key] - baseline[key],
  }));
}

export function createInitialEvolution(
  personalityId: string,
  memory: ChimeraMemory
): PhenotypeEvolution {
  const traits = traitsFromMemory(memory);
  const def = getPersonalityById(personalityId);
  const radarValues = radarCurrentFromMemory(memory, def);
  const base: PhenotypeEvolution = {
    baselinePersonalityId: personalityId,
    currentPersonalityId: personalityId,
    traitBaseline: { ...traits },
    traitCurrent: { ...traits },
    history: [],
    lastEvolutionAt: null,
  };
  return appendRadarSnapshot(base, radarValues);
}

export function ensureEvolution(
  memory: ChimeraMemory,
  personalityId: string
): PhenotypeEvolution {
  if (memory.learning?.evolution?.baselinePersonalityId) {
    return memory.learning.evolution;
  }
  return createInitialEvolution(personalityId, memory);
}

/** Call after adaptation cycles — may shift current type within same macro family */
export function evolvePhenotypeAfterAdapt(
  memory: ChimeraMemory,
  adaptationCycle: number
): { evolution: PhenotypeEvolution; evolved: boolean; message: string | null } {
  const pid = memory.learning?.phenotype?.personalityId;
  if (!pid) {
    const traits = traitsFromMemory(memory);
    const stub: PhenotypeEvolution = {
      baselinePersonalityId: "",
      currentPersonalityId: "",
      traitBaseline: { ...traits },
      traitCurrent: { ...traits },
      history: [],
      lastEvolutionAt: null,
    };
    return {
      evolution: memory.learning?.evolution ?? stub,
      evolved: false,
      message: null,
    };
  }

  const currentTraits = traitsFromMemory(memory);
  let evolution = ensureEvolution(memory, pid);
  evolution = {
    ...evolution,
    traitCurrent: { ...currentTraits },
  };

  if (adaptationCycle < 2) {
    return { evolution, evolved: false, message: null };
  }

  const matches = topPersonalityMatches(currentTraits, 1);
  const best = matches[0];
  if (!best || best.def.id === evolution.currentPersonalityId) {
    return { evolution, evolved: false, message: null };
  }

  const prevDef = getPersonalityById(evolution.currentPersonalityId);
  if (prevDef && prevDef.macroId !== best.def.macroId) {
    return { evolution, evolved: false, message: null };
  }

  const prevRich = prevDef ? getRichProfile(prevDef) : null;
  const nextRich = best.profile;
  const message = `You evolved: ${prevRich?.displayTitle ?? "Previous"} → ${nextRich.displayTitle}`;

  const radarValues = radarCurrentFromMemory(memory, best.def);
  evolution = appendRadarSnapshot(
    {
      ...evolution,
      currentPersonalityId: best.def.id,
      lastEvolutionAt: Date.now(),
      history: [
        ...evolution.history,
        {
          at: Date.now(),
          message,
          personalityId: best.def.id,
          cycle: adaptationCycle,
        },
      ].slice(-8),
    },
    radarValues
  );

  return { evolution, evolved: true, message };
}

export function formatTraitProgress(
  evolution: PhenotypeEvolution
): { label: string; delta: number; text: string }[] {
  return traitDeltas(evolution.traitBaseline, evolution.traitCurrent)
    .filter((d) => Math.abs(d.delta) >= 3)
    .map((d) => ({
      ...d,
      text: `${d.delta >= 0 ? "+" : ""}${d.delta}%`,
    }));
}

export function currentPersonalityDef(
  evolution: PhenotypeEvolution
): PersonalityTypeDef | undefined {
  return getPersonalityById(evolution.currentPersonalityId);
}
