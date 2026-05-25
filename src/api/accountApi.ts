import type { DataConsents, UserAccount } from "../account/types";
import type { ChimeraSaveBundle } from "../chimeraSetup/types";
import { resolveApiBase } from "../config/productionApi";
import { clearSessionToken, setSessionToken } from "./session";

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

function apiUrl(path: string): string {
  const base = resolveApiBase();
  return base ? `${base}${path}` : path;
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

/** Cloud sign-in with email + password (new device or after local register). */
export async function loginRemote(
  email: string,
  password: string
): Promise<LoginLookupResult | null> {
  try {
    const res = await fetch(apiUrl("/api/chimera/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await parseBody<{
      ok?: boolean;
      account?: RemoteAccount;
      save?: ChimeraSaveBundle;
      sessionToken?: string;
    }>(res);
    if (!res.ok || !data?.ok || !data.account?.id) return null;
    if (data.sessionToken) setSessionToken(data.sessionToken);
    return { account: data.account, save: data.save ?? null };
  } catch {
    return null;
  }
}

export async function registerAccountRemote(
  account: Pick<
    UserAccount,
    | "id"
    | "email"
    | "phone"
    | "displayName"
    | "createdAt"
    | "lastLoginAt"
    | "consents"
    | "chimeraSetupComplete"
  >,
  password: string
): Promise<{ ok: boolean; sessionToken?: string; error?: string }> {
  try {
    const res = await fetch(apiUrl("/api/chimera/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    const data = await parseBody<{
      ok?: boolean;
      sessionToken?: string;
      error?: string;
    }>(res);
    if (!res.ok || !data?.ok) {
      return { ok: false, error: data?.error ?? `HTTP ${res.status}` };
    }
    if (data.sessionToken) setSessionToken(data.sessionToken);
    return { ok: true, sessionToken: data.sessionToken };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Network error",
    };
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

/** Clear cloud session (sign-out). */
export function revokeCloudSession(): void {
  clearSessionToken();
}
