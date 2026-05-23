import { scheduleSync } from "../api/chimeraBackend";
import { setDisplayName } from "../components/profile/profileUtils";
import type {
  DataCollectionStore,
  DataConsents,
  UserAccount,
} from "./types";
import {
  ACCOUNT_EVENT,
  ACCOUNT_STORAGE_KEY,
  DATA_EVENTS_KEY,
} from "./types";

function emitAccountUpdate(): void {
  window.dispatchEvent(new Event(ACCOUNT_EVENT));
}

export function loadAccount(): UserAccount | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as UserAccount;
    if (!parsed?.email || !parsed.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveAccount(account: UserAccount): void {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  setDisplayName(account.displayName);
  emitAccountUpdate();
}

export function signOut(): void {
  const account = loadAccount();
  if (account) {
    saveAccount({ ...account, isLoggedIn: false });
  }
  emitAccountUpdate();
}

export function registerAccount(input: {
  email: string;
  phone: string | null;
  displayName: string;
  consents: DataConsents;
}): UserAccount {
  const now = Date.now();
  const account: UserAccount = {
    id: crypto.randomUUID(),
    email: input.email,
    phone: input.phone,
    displayName: input.displayName.trim() || "Player",
    createdAt: now,
    lastLoginAt: now,
    consents: input.consents,
    isLoggedIn: true,
  };
  saveAccount(account);
  scheduleSync(500);
  return account;
}

export function signInAccount(email: string): UserAccount | null {
  const existing = loadAccount();
  if (!existing || existing.email !== email) return null;
  const updated: UserAccount = {
    ...existing,
    lastLoginAt: Date.now(),
    isLoggedIn: true,
  };
  saveAccount(updated);
  scheduleSync(500);
  return updated;
}

export function updateAccount(
  patch: Partial<Pick<UserAccount, "phone" | "displayName" | "consents">>
): UserAccount | null {
  const account = loadAccount();
  if (!account) return null;
  const updated: UserAccount = {
    ...account,
    ...patch,
    consents: patch.consents ?? account.consents,
  };
  saveAccount(updated);
  scheduleSync(500);
  return updated;
}

export function isLoggedIn(): boolean {
  const a = loadAccount();
  return !!a?.isLoggedIn;
}

export function hasAnalyticsConsent(): boolean {
  const a = loadAccount();
  return !!a?.isLoggedIn && a.consents.analytics;
}

export function loadDataEvents(): DataCollectionStore {
  try {
    const raw = localStorage.getItem(DATA_EVENTS_KEY);
    if (!raw) {
      return { version: 1, events: [], lastSyncedAt: null };
    }
    const parsed = JSON.parse(raw) as DataCollectionStore;
    if (parsed.version !== 1 || !Array.isArray(parsed.events)) {
      return { version: 1, events: [], lastSyncedAt: null };
    }
    return parsed;
  } catch {
    return { version: 1, events: [], lastSyncedAt: null };
  }
}

export function saveDataEvents(store: DataCollectionStore): void {
  const trimmed: DataCollectionStore = {
    ...store,
    events: store.events.slice(-500),
  };
  localStorage.setItem(DATA_EVENTS_KEY, JSON.stringify(trimmed));
}

export function clearDataEvents(): void {
  saveDataEvents({ version: 1, events: [], lastSyncedAt: null });
}
