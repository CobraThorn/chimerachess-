const SESSION_KEY = "chimera-session-token-v1";

export function getSessionToken(): string | null {
  try {
    const t = localStorage.getItem(SESSION_KEY);
    return t?.trim() || null;
  } catch {
    return null;
  }
}

export function setSessionToken(token: string): void {
  localStorage.setItem(SESSION_KEY, token.trim());
}

export function clearSessionToken(): void {
  localStorage.removeItem(SESSION_KEY);
}

export function sessionHeaders(): Record<string, string> {
  const token = getSessionToken();
  return token ? { "X-Chimera-Session": token } : {};
}
