/** Bump when all browsers must drop prior local user state. */
export const CHIMERA_STORAGE_GENERATION = 4;

const GENERATION_KEY = "chimera-storage-generation";

/**
 * One-time per browser: remove every CHIMERA localStorage entry.
 * Call before React mounts (see main.tsx).
 */
export function applyStorageGenerationReset(): void {
  if (typeof localStorage === "undefined") return;

  const current = localStorage.getItem(GENERATION_KEY);
  if (current === String(CHIMERA_STORAGE_GENERATION)) return;

  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || key === GENERATION_KEY) continue;
    if (key.startsWith("chimera-")) toRemove.push(key);
  }
  for (const key of toRemove) {
    localStorage.removeItem(key);
  }

  localStorage.setItem(GENERATION_KEY, String(CHIMERA_STORAGE_GENERATION));
}
