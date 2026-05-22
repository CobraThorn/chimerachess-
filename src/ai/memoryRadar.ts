import { createPlayStyleProfile, styleToRadar } from "./playStyle";
import type { PlayStyleProfile } from "./playStyle";
import type { ChimeraMemory } from "./types";

export interface RadarAxis {
  label: string;
  short: string;
  value: number;
}

export function profileToRadar(profile: PlayStyleProfile): RadarAxis[] {
  return styleToRadar(profile);
}

/** User style radar from stored play fingerprint. */
export function userStyleToRadar(memory: ChimeraMemory): RadarAxis[] {
  const profile = memory.userStyle ?? createPlayStyleProfile(memory.chimeraElo);
  return styleToRadar(profile);
}
