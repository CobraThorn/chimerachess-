import { chimeraFetch } from "./client";

const STORAGE_KEY = "chimera-openai-api-key";

let serverCoachEnabled: boolean | null = null;

/** User-provided key (device only). Never use VITE_* — keys must not ship in the client bundle. */
export function getByokOpenAiKey(): string | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored?.trim() || null;
  } catch {
    return null;
  }
}

/** @deprecated Use getByokOpenAiKey — kept for call sites */
export function getOpenAiApiKey(): string | null {
  return getByokOpenAiKey();
}

export function setOpenAiApiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, trimmed);
}

export async function probeServerOpenAiCoach(): Promise<boolean> {
  try {
    const res = await chimeraFetch("/health", { method: "GET" });
    if (!res.ok) {
      serverCoachEnabled = false;
      return false;
    }
    const data = (await res.json()) as {
      features?: { openai?: boolean };
    };
    serverCoachEnabled = data.features?.openai === true;
    return serverCoachEnabled;
  } catch {
    serverCoachEnabled = false;
    return false;
  }
}

export function hasOpenAiApiKey(): boolean {
  if (getByokOpenAiKey()) return true;
  return serverCoachEnabled === true;
}

export function usesServerOpenAiCoach(): boolean {
  return serverCoachEnabled === true && !getByokOpenAiKey();
}
