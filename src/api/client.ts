/**
 * Single entry point for CHIMERA backend HTTP and WebSocket URLs.
 * Endpoints are relative to /api/chimera (e.g. "/login", "/register").
 */

export const CHIMERA_API_PREFIX = "/api/chimera";

/** Host origin only, or "" for same-origin /api/chimera (Netlify/Vite proxy). */
export function resolveApiBase(): string {
  const env = import.meta.env?.VITE_CHIMERA_API_URL as string | undefined;
  if (!env?.trim()) return "";
  let base = env.trim().replace(/\/+$/, "");
  if (base.endsWith(CHIMERA_API_PREFIX)) {
    base = base.slice(0, -CHIMERA_API_PREFIX.length).replace(/\/+$/, "");
  }
  return base;
}

/** Normalize an endpoint to "/login" form (never includes /api/chimera). */
export function normalizeChimeraEndpoint(endpoint: string): string {
  let path = endpoint.trim();
  if (!path) return "/";
  if (!path.startsWith("/")) path = `/${path}`;
  while (path.startsWith(CHIMERA_API_PREFIX)) {
    path = path.slice(CHIMERA_API_PREFIX.length) || "/";
    if (!path.startsWith("/")) path = `/${path}`;
  }
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path;
}

export function chimeraApiUrl(
  endpoint: string,
  query?: Record<string, string | number | undefined>
): string {
  const path = `${CHIMERA_API_PREFIX}${normalizeChimeraEndpoint(endpoint)}`;
  const base = resolveApiBase();
  let url = base ? `${base.replace(/\/+$/, "")}${path}` : path;
  url = url.replace(/([^:]\/)\/+/g, "$1");
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += (url.includes("?") ? "&" : "?") + qs;
  }
  return url;
}

export async function parseJsonResponse<T>(res: Response): Promise<T | null> {
  const text = await res.text();
  if (!text.trim()) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

/** All CHIMERA backend HTTP calls must use this (auth, sync, backup, game API, …). */
export async function chimeraFetch(
  endpoint: string,
  init?: RequestInit,
  query?: Record<string, string | number | undefined>
): Promise<Response> {
  return fetch(chimeraApiUrl(endpoint, query), init);
}

export function chimeraWsUrl(): string {
  const path = `${CHIMERA_API_PREFIX}/ws`;
  const base = resolveApiBase();
  if (base) {
    const url = new URL(base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${url.origin}${path}`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}${path}`;
}

/** BYOK OpenAI (not a CHIMERA route). */
export function byokOpenAiUrl(): string {
  return import.meta.env.DEV
    ? "/api/openai/v1/chat/completions"
    : "https://api.openai.com/v1/chat/completions";
}

export async function externalFetch(
  url: string,
  init?: RequestInit
): Promise<Response> {
  return fetch(url, init);
}
