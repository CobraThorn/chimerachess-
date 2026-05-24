import { loadMemory, saveMemory } from "../ai/memory";
import { CHIMERA_STORAGE_KEY } from "../ai/types";
import { loadAccount, markChimeraSetupComplete } from "../account/storage";
import { loadCustomisation, saveCustomisation } from "../customisation/storage";
import type { CustomisationPrefs } from "../customisation/types";
import { applyChimeraSetup } from "./applySetup";
import { loadChimeraSetup, saveChimeraSetup } from "./storage";
import type { ChimeraSaveBundle, ChimeraUserSetup } from "./types";

export function buildSaveBundle(): ChimeraSaveBundle {
  let memory: unknown;
  try {
    const raw = localStorage.getItem(CHIMERA_STORAGE_KEY);
    if (raw) memory = JSON.parse(raw);
  } catch {
    memory = undefined;
  }

  return {
    version: 2,
    savedAt: Date.now(),
    setup: loadChimeraSetup(),
    customisation: loadCustomisation(),
    memory,
  };
}

export function applySaveBundle(bundle: ChimeraSaveBundle): void {
  if (bundle.customisation) {
    saveCustomisation(bundle.customisation);
  }
  if (bundle.setup) {
    saveChimeraSetup(bundle.setup);
    applyChimeraSetup(bundle.setup);
    if (bundle.setup.completedAt) {
      markChimeraSetupComplete();
    }
  } else if (bundle.memory) {
    try {
      localStorage.setItem(CHIMERA_STORAGE_KEY, JSON.stringify(bundle.memory));
      saveMemory(loadMemory());
    } catch {
      /* ignore corrupt backup */
    }
  }
}

export function localBackupKey(accountId: string): string {
  return `chimera-cloud-save-v2-${accountId}`;
}

export function saveLocalBackup(accountId: string, bundle: ChimeraSaveBundle): void {
  localStorage.setItem(localBackupKey(accountId), JSON.stringify(bundle));
}

export function loadLocalBackup(accountId: string): ChimeraSaveBundle | null {
  try {
    const raw = localStorage.getItem(localBackupKey(accountId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChimeraSaveBundle;
    if (parsed?.version !== 2) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Restore cloud or local backup after sign-in / register */
export function restoreSaveForAccount(accountId: string, remote?: ChimeraSaveBundle | null): void {
  const bundle = remote ?? loadLocalBackup(accountId);
  if (!bundle) return;
  applySaveBundle(bundle);
  saveLocalBackup(accountId, bundle);
}

export function persistBackupAfterSetup(
  accountId: string,
  setup: ChimeraUserSetup,
  customisation: CustomisationPrefs
): ChimeraSaveBundle {
  let memory: unknown;
  try {
    const raw = localStorage.getItem(CHIMERA_STORAGE_KEY);
    if (raw) memory = JSON.parse(raw);
  } catch {
    memory = undefined;
  }
  const bundle: ChimeraSaveBundle = {
    version: 2,
    savedAt: Date.now(),
    setup,
    customisation,
    memory,
  };
  saveLocalBackup(accountId, bundle);
  return bundle;
}

export function hasCompletedSetup(): boolean {
  const account = loadAccount();
  if (!account?.chimeraSetupComplete) return false;
  return !!loadChimeraSetup()?.completedAt;
}
