import type { ChimeraUserSetup } from "./types";
import { CHIMERA_SETUP_STORAGE_KEY } from "./types";

export function loadChimeraSetup(): ChimeraUserSetup | null {
  try {
    const raw = localStorage.getItem(CHIMERA_SETUP_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChimeraUserSetup;
    if (parsed?.version !== 1 || !parsed.phenotype?.primary) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveChimeraSetup(setup: ChimeraUserSetup): void {
  localStorage.setItem(CHIMERA_SETUP_STORAGE_KEY, JSON.stringify(setup));
}

export function clearChimeraSetup(): void {
  localStorage.removeItem(CHIMERA_SETUP_STORAGE_KEY);
}
