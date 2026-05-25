import type { ChimeraSaveBundle } from "../chimeraSetup/types";
import type { UserAccount } from "../account/types";
import { chimeraFetch, parseJsonResponse } from "./client";
import { sessionHeaders } from "./session";

export async function fetchUserBackup(
  accountId: string
): Promise<ChimeraSaveBundle | null> {
  try {
    const res = await chimeraFetch(
      "/backup",
      { method: "GET", headers: sessionHeaders() },
      { accountId }
    );
    const data = await parseJsonResponse<{ ok?: boolean; save?: ChimeraSaveBundle }>(
      res
    );
    if (!res.ok || !data?.ok || !data.save) return null;
    return data.save;
  } catch {
    return null;
  }
}

export async function uploadUserBackup(
  accountId: string,
  save: ChimeraSaveBundle,
  account?: Pick<
    UserAccount,
    | "id"
    | "email"
    | "phone"
    | "displayName"
    | "createdAt"
    | "lastLoginAt"
    | "consents"
    | "chimeraSetupComplete"
  >
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await chimeraFetch("/backup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...sessionHeaders(),
      },
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
    const data = await parseJsonResponse<{ ok?: boolean; error?: string }>(res);
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
