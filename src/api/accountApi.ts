import type { DataConsents, UserAccount } from "../account/types";
import type { ChimeraSaveBundle } from "../chimeraSetup/types";
import { chimeraFetch, isHtmlResponseText } from "./client";
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

export interface LoginLookupResult {
  account: RemoteAccount;
  save: ChimeraSaveBundle | null;
}

async function readApiJson<T>(res: Response): Promise<{
  data: T | null;
  html: boolean;
}> {
  const text = await res.text();
  if (!text.trim()) return { data: null, html: false };
  if (isHtmlResponseText(text)) return { data: null, html: true };
  try {
    return { data: JSON.parse(text) as T, html: false };
  } catch {
    return { data: null, html: isHtmlResponseText(text) };
  }
}

function apiErrorMessage(
  res: Response,
  data: { error?: string } | null,
  html = false
): string {
  if (html) {
    return "Could not reach the account server. Wait 30 seconds and try again.";
  }
  if (data?.error) return data.error;
  if (res.status >= 500) {
    return "Server is waking up — wait a moment and try again.";
  }
  if (res.status === 404) {
    return "Account service not found. Try again in a moment.";
  }
  return "Could not create account. Try again.";
}

/** Cloud sign-in with email + password (new device or after local register). */
export async function loginRemote(
  email: string,
  password: string
): Promise<LoginLookupResult | null> {
  try {
    const res = await chimeraFetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const { data, html } = await readApiJson<{
      ok?: boolean;
      account?: RemoteAccount;
      save?: ChimeraSaveBundle;
      sessionToken?: string;
    }>(res);
    if (html || !res.ok || !data?.ok || !data.account?.id) return null;
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
): Promise<{
  ok: boolean;
  sessionToken?: string;
  account?: RemoteAccount;
  error?: string;
}> {
  try {
    const res = await chimeraFetch("/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ account, password }),
    });
    const { data, html } = await readApiJson<{
      ok?: boolean;
      sessionToken?: string;
      account?: RemoteAccount;
      error?: string;
    }>(res);
    if (!res.ok || !data?.ok) {
      return { ok: false, error: apiErrorMessage(res, data, html) };
    }
    if (data.sessionToken) setSessionToken(data.sessionToken);
    return {
      ok: true,
      sessionToken: data.sessionToken,
      account: data.account,
    };
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
