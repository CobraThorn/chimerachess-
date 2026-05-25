import {
  loginRemote,
  registerAccountRemote,
  remoteToUserAccount,
  revokeCloudSession,
} from "../api/accountApi";
import { scheduleSync } from "../api/chimeraBackend";
import { fetchUserBackup } from "../api/saveBackup";
import { restoreSaveForAccount } from "../chimeraSetup/backup";
import type { ChimeraSaveBundle } from "../chimeraSetup/types";
import { isValidEmail, isValidPassword, normalizeEmail } from "./validation";
import {
  clearLocalAccount,
  loadAccount,
  saveAccount,
  signOut,
} from "./storage";
import type { DataConsents, UserAccount } from "./types";

export type AuthResult =
  | { ok: true; account: UserAccount; message: string }
  | { ok: false; error: string };

function activeSession(account: UserAccount): UserAccount {
  return {
    ...account,
    isLoggedIn: true,
    lastLoginAt: Date.now(),
  };
}

function newAccountId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `u${Date.now()}${Math.random().toString(36).slice(2, 11)}`;
}

function buildAccountRecord(input: {
  email: string;
  phone: string | null;
  displayName: string;
  consents: DataConsents;
  id?: string;
  createdAt?: number;
  chimeraSetupComplete?: boolean;
}): UserAccount {
  const now = Date.now();
  return {
    id: input.id ?? newAccountId(),
    email: input.email,
    phone: input.phone,
    displayName: input.displayName.trim() || "Player",
    createdAt: input.createdAt ?? now,
    lastLoginAt: now,
    consents: input.consents,
    isLoggedIn: false,
    chimeraSetupComplete: input.chimeraSetupComplete === true,
  };
}

function commitSession(
  account: UserAccount,
  cloudSave?: ChimeraSaveBundle | null
): UserAccount {
  const session = activeSession(account);
  saveAccount(session);
  if (cloudSave) {
    restoreSaveForAccount(account.id, cloudSave);
  } else {
    void fetchUserBackup(account.id).then((remote) => {
      if (remote) restoreSaveForAccount(account.id, remote);
    });
  }
  scheduleSync(800);
  return session;
}

/**
 * Sign in with email + password (local device or cloud restore).
 */
export async function loginWithPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  const norm = normalizeEmail(email);
  if (!isValidEmail(norm)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const pw = isValidPassword(password);
  if (!pw.ok) {
    return { ok: false, error: pw.error };
  }

  const local = loadAccount();
  if (local && normalizeEmail(local.email) !== norm) {
    return {
      ok: false,
      error:
        "This device is saved under a different email. Sign out first, or use that email to sign in.",
    };
  }

  if (local) {
    const account = { ...local, email: norm };
    const cloud = await loginRemote(norm, pw.password);
    if (!cloud) {
      const reg = await registerAccountRemote(account, pw.password);
      if (!reg.ok) {
        signOut();
        return {
          ok: false,
          error:
            reg.error ??
            "Invalid email or password. Register if this is a new account.",
        };
      }
      const session = commitSession(account);
      return {
        ok: true,
        account: session,
        message: "Signed in on this device.",
      };
    }
    const session = commitSession(
      {
        ...remoteToUserAccount(cloud.account),
        ...account,
        email: norm,
        displayName: cloud.account.displayName || account.displayName,
        consents: account.consents,
      },
      cloud.save
    );
    return {
      ok: true,
      account: session,
      message: "Signed in on this device.",
    };
  }

  const cloud = await loginRemote(norm, pw.password);
  if (!cloud) {
    return {
      ok: false,
      error:
        "Invalid email or password, or no cloud account. Register if you are new.",
    };
  }

  const session = commitSession(remoteToUserAccount(cloud.account), cloud.save);
  return {
    ok: true,
    account: session,
    message: "Signed in — account restored from the cloud.",
  };
}

/**
 * Register: merge with cloud if email already exists, otherwise create locally + sync.
 */
export async function registerUser(input: {
  email: string;
  password: string;
  phone: string | null;
  displayName: string;
  consents: DataConsents;
}): Promise<AuthResult> {
  const norm = normalizeEmail(input.email);
  if (!isValidEmail(norm)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  const pw = isValidPassword(input.password);
  if (!pw.ok) {
    return { ok: false, error: pw.error };
  }
  if (!input.consents.analytics) {
    return {
      ok: false,
      error: "Enable gameplay & training data to create an account.",
    };
  }

  const local = loadAccount();
  if (local && normalizeEmail(local.email) !== norm) {
    return {
      ok: false,
      error:
        "This device already has another account. Sign out before registering a new email.",
    };
  }

  const account = local
    ? {
        ...local,
        phone: input.phone,
        displayName: input.displayName.trim() || local.displayName,
        consents: input.consents,
        isLoggedIn: false,
      }
    : buildAccountRecord({
        email: norm,
        phone: input.phone,
        displayName: input.displayName,
        consents: input.consents,
      });

  const cloud = await registerAccountRemote(account, pw.password);
  if (!cloud.ok) {
    revokeCloudSession();
    if (local) signOut();
    else clearLocalAccount();
    return {
      ok: false,
      error: cloud.error ?? "Could not create cloud account. Try again.",
    };
  }

  const registered = cloud.account
    ? {
        ...account,
        ...remoteToUserAccount(cloud.account, false),
        phone: input.phone,
        displayName:
          input.displayName.trim() || cloud.account.displayName || "Player",
        consents: input.consents,
      }
    : account;

  const session = commitSession(registered);
  return {
    ok: true,
    account: session,
    message: local
      ? "Account updated and signed in."
      : "Account created — customise your CHIMERA next.",
  };
}

/** Signed out but account still on device — show sign-in again */
export function hasStoredAccount(): boolean {
  return !!loadAccount();
}

export function storedAccountEmail(): string | null {
  return loadAccount()?.email ?? null;
}
