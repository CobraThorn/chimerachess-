import { resolveApiBase } from "../config/productionApi";
import type { ChimeraSaveBundle } from "../chimeraSetup/types";
import type { UserAccount } from "../account/types";

function backupEndpoint(): string {
  const base = resolveApiBase();
  return base ? `${base}/api/chimera/backup` : "/api/chimera/backup";
}

async function parseBody<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function fetchUserBackup(
  accountId: string
): Promise<ChimeraSaveBundle | null> {
  try {
    const res = await fetch(
      `${backupEndpoint()}?accountId=${encodeURIComponent(accountId)}`,
      { method: "GET" }
    );
    const data = await parseBody<{ ok?: boolean; save?: ChimeraSaveBundle }>(res);
    if (!res.ok || !data?.ok || !data.save) return null;
    return data.save;
  } catch {
    return null;
  }
}

export async function uploadUserBackup(
  accountId: string,
  save: ChimeraSaveBundle,
  account?: Pick<UserAccount, "id" | "email" | "phone" | "displayName" | "createdAt" | "lastLoginAt" | "consents" | "chimeraSetupComplete">
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(backupEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accountId,
        save,
        account: account
          ? {
              ...account,
              chimeraSetupComplete: true,
            }
          : undefined,
      }),
    });
    const data = await parseBody<{ ok?: boolean; error?: string }>(res);
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
  }
}
