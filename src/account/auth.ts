import {
  fetchAccountByEmail,
  registerAccountRemote,
  remoteToUserAccount,
} from "../api/accountApi";
import { scheduleSync } from "../api/chimeraBackend";
import { fetchUserBackup } from "../api/saveBackup";
import { restoreSaveForAccount } from "../chimeraSetup/backup";
import type { ChimeraSaveBundle } from "../chimeraSetup/types";
import { isValidEmail, normalizeEmail } from "./validation";
import {
  loadAccount,
  registerAccount as createLocalAccount,
  saveAccount,
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

async function restoreCloudSave(
  accountId: string,
  bundleFromLogin?: ChimeraSaveBundle | null
): Promise<void> {
  const bundle = bundleFromLogin ?? (await fetchUserBackup(accountId));
  restoreSaveForAccount(accountId, bundle);
}

/**
 * Sign in: this device first, then cloud (same email on phone / new browser).
 */
export async function loginByEmail(email: string): Promise<AuthResult> {
  const norm = normalizeEmail(email);
  if (!isValidEmail(norm)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  const local = loadAccount();
  if (local && normalizeEmail(local.email) === norm) {
    const account = activeSession(local);
    saveAccount(account);
    const cloud = await fetchAccountByEmail(norm);
    if (!cloud) {
      await registerAccountRemote(account);
    }
    await restoreCloudSave(account.id, cloud?.save);
    scheduleSync(800);
    return {
      ok: true,
      account,
      message: "Signed in on this device.",
    };
  }

  if (local && normalizeEmail(local.email) !== norm) {
    return {
      ok: false,
      error:
        "This device is saved under a different email. Sign out first, or use that email to sign in.",
    };
  }

  const lookup = await fetchAccountByEmail(norm);
  if (lookup) {
    const account = activeSession(remoteToUserAccount(lookup.account));
    saveAccount(account);
    await restoreCloudSave(account.id, lookup.save);
    scheduleSync(800);
    return {
      ok: true,
      account,
      message: "Signed in — account restored from the cloud.",
    };
  }

  return {
    ok: false,
    error:
      "No account found for this email. Use Register to create one (only takes a moment).",
  };
}

/**
 * Register: merge with cloud if email already exists, otherwise create locally + sync.
 */
export async function registerUser(input: {
  email: string;
  phone: string | null;
  displayName: string;
  consents: DataConsents;
}): Promise<AuthResult> {
  const norm = normalizeEmail(input.email);
  if (!isValidEmail(norm)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (!input.consents.analytics) {
    return {
      ok: false,
      error: "Enable gameplay & training data to create an account.",
    };
  }

  const lookup = await fetchAccountByEmail(norm);
  if (lookup) {
    const account = activeSession({
      ...remoteToUserAccount(lookup.account),
      phone: input.phone,
      displayName:
        input.displayName.trim() || lookup.account.displayName || "Player",
      consents: input.consents,
    });
    saveAccount(account);
    await restoreCloudSave(account.id, lookup.save);
    scheduleSync(800);
    return {
      ok: true,
      account,
      message: "Welcome back — we found your account in the cloud and signed you in.",
    };
  }

  const local = loadAccount();
  if (local && normalizeEmail(local.email) === norm) {
    const account = activeSession({
      ...local,
      phone: input.phone,
      displayName: input.displayName.trim() || local.displayName,
      consents: input.consents,
    });
    saveAccount(account);
    await restoreCloudSave(account.id);
    scheduleSync(800);
    return {
      ok: true,
      account,
      message: "Account updated and signed in.",
    };
  }

  if (local && normalizeEmail(local.email) !== norm) {
    return {
      ok: false,
      error:
        "This device already has another account. Sign out before registering a new email.",
    };
  }

  const account = createLocalAccount({
    email: norm,
    phone: input.phone,
    displayName: input.displayName,
    consents: input.consents,
  });
  await registerAccountRemote(account);
  return {
    ok: true,
    account,
    message: "Account created — customise your CHIMERA next.",
  };
}

/** Signed out but account still on device — show sign-in again */
export function hasStoredAccount(): boolean {
  return !!loadAccount();
}

export function storedAccountEmail(): string | null {
  return loadAccount()?.email ?? null;
}
