import type { DataConsents, UserAccount } from "../account/types";
import type { ChimeraSaveBundle } from "../chimeraSetup/types";
import { resolveApiBase } from "../config/productionApi";

export interface RemoteAccount {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  createdAt: number;
  lastLoginAt: number;
  consents: DataConsents;
  chimeraSetupComplete?: boolean;
}

function loginEndpoint(): string {
  const base = resolveApiBase();
  return base ? `${base}/api/chimera/login` : "/api/chimera/login";
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

export interface LoginLookupResult {
  account: RemoteAccount;
  save: ChimeraSaveBundle | null;
}

/** Look up account on the server by email (for sign-in on a new device). */
export async function fetchAccountByEmail(
  email: string
): Promise<LoginLookupResult | null> {
  try {
    const res = await fetch(loginEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await parseBody<{
      ok?: boolean;
      account?: RemoteAccount;
      save?: ChimeraSaveBundle;
    }>(res);
    if (!res.ok || !data?.ok || !data.account?.id) return null;
    return { account: data.account, save: data.save ?? null };
  } catch {
    return null;
  }
}

export function remoteToUserAccount(
  remote: RemoteAccount,
  loggedIn = true
): UserAccount {
  return {
    id: remote.id,
    email: remote.email,
    phone: remote.phone ?? null,
    displayName: remote.displayName || "Player",
    createdAt: remote.createdAt ?? Date.now(),
    lastLoginAt: Date.now(),
    consents: remote.consents ?? {
      analytics: true,
      marketing: false,
      cognitiveResearch: false,
    },
    isLoggedIn: loggedIn,
    chimeraSetupComplete: remote.chimeraSetupComplete === true,
  };
}
