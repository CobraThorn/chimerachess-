import { loadAccount, loadDataEvents, saveDataEvents } from "../account/storage";
import type { DataCollectionEvent, UserAccount } from "../account/types";
import { ACCOUNT_EVENT } from "../account/types";
import { resolveApiBase } from "../config/productionApi";
import { friendlyCloudError } from "../utils/userFacingError";

const SYNC_QUEUE_KEY = "chimera-sync-queue-v1";
const SYNC_META_KEY = "chimera-sync-meta-v1";

export interface SyncMeta {
  lastSyncedAt: number | null;
  lastError: string | null;
  lastOk: boolean;
  pendingCount: number;
}

export interface SyncResult {
  ok: boolean;
  syncedAt?: number;
  eventsAppended?: number;
  error?: string;
}

function apiBase(): string {
  return resolveApiBase();
}

export function isBackendConfigured(): boolean {
  if (import.meta.env.DEV) return true;
  return !!apiBase();
}

/** In dev, Vite proxies /api/chimera → localhost:8787 */
export function syncEndpoint(): string {
  const base = apiBase();
  return base ? `${base}/api/chimera/sync` : "/api/chimera/sync";
}

export function healthEndpoint(): string {
  const base = apiBase();
  return base ? `${base}/api/chimera/health` : "/api/chimera/health";
}

function loadQueue(): DataCollectionEvent[] {
  try {
    const raw = localStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DataCollectionEvent[];
  } catch {
    return [];
  }
}

function saveQueue(events: DataCollectionEvent[]): void {
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(events.slice(-200)));
}

function loadSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY);
    if (!raw) {
      return {
        lastSyncedAt: null,
        lastError: null,
        lastOk: false,
        pendingCount: 0,
      };
    }
    return JSON.parse(raw) as SyncMeta;
  } catch {
    return {
      lastSyncedAt: null,
      lastError: null,
      lastOk: false,
      pendingCount: 0,
    };
  }
}

function saveSyncMeta(meta: SyncMeta): void {
  localStorage.setItem(SYNC_META_KEY, JSON.stringify(meta));
  window.dispatchEvent(new Event(ACCOUNT_EVENT));
}

export function getSyncMeta(): SyncMeta {
  const meta = loadSyncMeta();
  return { ...meta, pendingCount: loadQueue().length };
}

function accountPayload(account: UserAccount) {
  return {
    id: account.id,
    email: account.email,
    phone: account.phone,
    displayName: account.displayName,
    createdAt: account.createdAt,
    lastLoginAt: account.lastLoginAt,
    consents: account.consents,
    chimeraSetupComplete: account.chimeraSetupComplete === true,
  };
}

async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(healthEndpoint(), { method: "GET" });
    if (!res.ok) return false;
    const data = await parseJsonResponse<{ ok?: boolean }>(res);
    return !!data?.ok;
  } catch {
    return false;
  }
}

export async function syncToBackend(): Promise<SyncResult> {
  const account = loadAccount();
  if (!account) {
    return { ok: false, error: "No account — register first." };
  }

  const store = loadDataEvents();
  const queue = loadQueue();
  const lastSynced = store.lastSyncedAt ?? 0;
  const unsynced = store.events.filter((e) => e.at > lastSynced);
  const toSend = [...queue, ...unsynced];
  const unique = new Map<string, DataCollectionEvent>();
  for (const e of toSend) {
    unique.set(e.id, e);
  }
  const events = [...unique.values()];

  try {
    const res = await fetch(syncEndpoint(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        account: accountPayload(account),
        events,
      }),
    });

    const data = await parseJsonResponse<{
      ok?: boolean;
      error?: string;
      syncedAt?: number;
      eventsAppended?: number;
    }>(res);

    if (!data) {
      const err = friendlyCloudError("API returned HTML, not JSON");
      saveSyncMeta({
        ...loadSyncMeta(),
        lastError: err,
        lastOk: false,
        pendingCount: events.length,
      });
      return { ok: false, error: err };
    }

    if (!res.ok || !data.ok) {
      const err = data.error ?? `HTTP ${res.status}`;
      saveSyncMeta({
        ...loadSyncMeta(),
        lastError: err,
        lastOk: false,
        pendingCount: events.length,
      });
      return { ok: false, error: err };
    }

    const syncedAt = data.syncedAt ?? Date.now();
    saveDataEvents({
      ...store,
      lastSyncedAt: syncedAt,
    });
    saveQueue([]);
    saveSyncMeta({
      lastSyncedAt: syncedAt,
      lastError: null,
      lastOk: true,
      pendingCount: 0,
    });

    return {
      ok: true,
      syncedAt,
      eventsAppended: data.eventsAppended,
    };
  } catch (e) {
    const err = e instanceof Error ? e.message : "Network error";
    saveQueue(events);
    saveSyncMeta({
      ...loadSyncMeta(),
      lastError: err,
      lastOk: false,
      pendingCount: events.length,
    });
    return { ok: false, error: err };
  }
}

export function enqueueForSync(event: DataCollectionEvent): void {
  const queue = loadQueue();
  queue.push(event);
  saveQueue(queue);
  saveSyncMeta({
    ...loadSyncMeta(),
    pendingCount: queue.length,
  });
}

let flushTimer: ReturnType<typeof setTimeout> | null = null;

export function scheduleSync(delayMs = 2000): void {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void syncToBackend();
  }, delayMs);
}
