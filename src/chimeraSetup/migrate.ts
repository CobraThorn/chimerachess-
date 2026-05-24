import { CHIMERA_STORAGE_KEY } from "../ai/types";
import { loadChimeraSetup } from "./storage";

/** Existing players before setup gate — don't trap them in onboarding */
export function hasLegacyChimeraUsage(): boolean {
  const setup = loadChimeraSetup();
  if (setup?.completedAt) return true;
  try {
    const raw = localStorage.getItem(CHIMERA_STORAGE_KEY);
    if (!raw) return false;
    const mem = JSON.parse(raw) as {
      games?: unknown[];
      userStyle?: { moves?: number };
      learning?: { gamesAnalyzed?: number };
    };
    if ((mem.games?.length ?? 0) > 0) return true;
    if ((mem.userStyle?.moves ?? 0) > 8) return true;
    if ((mem.learning?.gamesAnalyzed ?? 0) > 0) return true;
  } catch {
    /* ignore */
  }
  return false;
}
