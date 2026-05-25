import { loadAccount } from "../account/storage";
import { buildSaveBundle, saveLocalBackup } from "../chimeraSetup/backup";
import { getSessionToken } from "./session";
import { uploadUserBackup } from "./saveBackup";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/** Debounced upload of full save bundle (games, CRS, setup) to cloud. */
export function scheduleCloudBackup(delayMs = 2500): void {
  if (typeof window === "undefined") return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void pushCloudBackup();
  }, delayMs);
}

export async function pushCloudBackup(): Promise<boolean> {
  const account = loadAccount();
  if (!account?.isLoggedIn || !getSessionToken()) return false;

  const bundle = buildSaveBundle();
  saveLocalBackup(account.id, bundle);
  const result = await uploadUserBackup(account.id, bundle, account);
  return result.ok;
}
