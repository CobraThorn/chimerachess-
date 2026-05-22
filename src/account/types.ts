export interface DataConsents {
  /** Gameplay, cognitive map, and performance telemetry */
  analytics: boolean;
  /** Product updates and training tips */
  marketing: boolean;
  /** Anonymised cognitive research aggregates */
  cognitiveResearch: boolean;
}

export interface UserAccount {
  id: string;
  email: string;
  phone: string | null;
  displayName: string;
  createdAt: number;
  lastLoginAt: number;
  consents: DataConsents;
  /** Local session — no server auth yet */
  isLoggedIn: boolean;
}

export type DataEventType =
  | "session_start"
  | "sign_in"
  | "sign_up"
  | "sign_out"
  | "consent_update"
  | "page_view"
  | "game_complete"
  | "opening_drill"
  | "online_match_start"
  | "online_match_end"
  | "analyze_use"
  | "profile_view";

export interface DataCollectionEvent {
  id: string;
  type: DataEventType;
  at: number;
  /** No PII in payload — ids and enums only */
  payload?: Record<string, string | number | boolean>;
}

export interface DataCollectionStore {
  version: 1;
  events: DataCollectionEvent[];
  /** Last successful export/sync timestamp (future API) */
  lastSyncedAt: number | null;
}

export const ACCOUNT_STORAGE_KEY = "chimera-account-v1";
export const DATA_EVENTS_KEY = "chimera-data-events-v1";
export const ACCOUNT_EVENT = "chimera-account-update";

export const EMPTY_CONSENTS: DataConsents = {
  analytics: false,
  marketing: false,
  cognitiveResearch: false,
};
