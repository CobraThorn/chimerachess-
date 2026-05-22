const STORAGE_KEY = "chimera-openai-api-key";

export function getOpenAiApiKey(): string | null {
  const fromEnv = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
  if (fromEnv?.trim()) return fromEnv.trim();
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored?.trim() || null;
  } catch {
    return null;
  }
}

export function setOpenAiApiKey(key: string): void {
  const trimmed = key.trim();
  if (!trimmed) {
    localStorage.removeItem(STORAGE_KEY);
    return;
  }
  localStorage.setItem(STORAGE_KEY, trimmed);
}

export function hasOpenAiApiKey(): boolean {
  return !!getOpenAiApiKey();
}
