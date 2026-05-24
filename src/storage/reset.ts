/** Bump when all browsers must drop prior local user state. */
export const CHIMERA_STORAGE_GENERATION = 2;

const GENERATION_KEY = "chimera-storage-generation";

/** Exact keys from pre-generation-2 builds */
const LEGACY_EXACT_KEYS = [
  "chimera-memory-v1",
  "chimera-account-v1",
  "chimera-data-events-v1",
  "chimera-sync-queue-v1",
  "chimera-sync-meta-v1",
  "chimera-customisation-v1",
  "chimera-user-setup-v1",
  "chimera-profile-name",
  "chimera-online-player-id",
  "chimera-openai-api-key",
];

/** Prefixes for dynamic keys (cloud saves, coach caches, etc.) */
const LEGACY_PREFIXES = [
  "chimera-cloud-save-",
  "chimera-review-coach-v1:",
  "chimera-review-coach-v2:",
  "chimera-coach-v1:",
  "chimera-coach-v2:",
];

/**
 * One-time per browser: remove all prior CHIMERA local user data.
 * Call before React mounts (see main.tsx).
 */
export function applyStorageGenerationReset(): void {
  if (typeof localStorage === "undefined") return;

  const current = localStorage.getItem(GENERATION_KEY);
  if (current === String(CHIMERA_STORAGE_GENERATION)) return;

  for (const key of LEGACY_EXACT_KEYS) {
    localStorage.removeItem(key);
  }

  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    if (LEGACY_PREFIXES.some((prefix) => key.startsWith(prefix))) {
      toRemove.push(key);
    }
  }
  for (const key of toRemove) {
    localStorage.removeItem(key);
  }

  localStorage.setItem(GENERATION_KEY, String(CHIMERA_STORAGE_GENERATION));
}
