import {
  enqueueForSync,
  scheduleSync,
} from "../api/chimeraBackend";
import { hasAnalyticsConsent, loadDataEvents, saveDataEvents } from "./storage";
import { ACCOUNT_STORAGE_KEY, type DataCollectionEvent, type DataEventType } from "./types";

const ALWAYS_LOG: DataEventType[] = [
  "sign_up",
  "sign_in",
  "sign_out",
  "consent_update",
  "session_start",
];

export function logDataEvent(
  type: DataEventType,
  payload?: Record<string, string | number | boolean>
): void {
  if (!hasAnalyticsConsent() && !ALWAYS_LOG.includes(type)) {
    return;
  }

  const store = loadDataEvents();
  const event: DataCollectionEvent = {
    id: crypto.randomUUID(),
    type,
    at: Date.now(),
    payload,
  };
  saveDataEvents({
    ...store,
    events: [...store.events, event],
  });

  enqueueForSync(event);
  scheduleSync();
}

export function exportDataEventsJson(): string {
  const store = loadDataEvents();
  const account = localStorage.getItem(ACCOUNT_STORAGE_KEY);
  return JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      account: account ? JSON.parse(account) : null,
      events: store.events,
    },
    null,
    2
  );
}
