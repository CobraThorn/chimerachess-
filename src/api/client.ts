/**
 * Single entry point for CHIMERA backend HTTP and WebSocket URLs.
 * Endpoints are relative to /api/chimera (e.g. "/login", "/register").
 */

export const CHIMERA_API_PREFIX = "/api/chimera";

/** Render API — fallback when same-origin Netlify proxy returns HTML */
export const RENDER_API_ORIGIN = "https://chimerachess-0so2.onrender.com";

/** Host origin only, or "" for same-origin /api/chimera (Netlify/Vite proxy). */
export function resolveApiBase(): string {
  // Production builds always use same-origin proxy (netlify.toml). Ignores mis-set Netlify env.
  if (import.meta.env.PROD) return "";

  const env = import.meta.env?.VITE_CHIMERA_API_URL as string | undefined;
  if (!env?.trim()) return "";
  let base = env.trim().replace(/\/+$/, "");
  if (base.endsWith(CHIMERA_API_PREFIX)) {
    base = base.slice(0, -CHIMERA_API_PREFIX.length).replace(/\/+$/, "");
  }
  if (base.endsWith("/api")) {
    base = base.slice(0, -4).replace(/\/+$/, "");
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
  if (path.startsWith("/api/")) {
    path = path.slice(4) || "/";
    if (!path.startsWith("/")) path = `/${path}`;
  }
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path;
}

function chimeraPath(endpoint: string): string {
  return `${CHIMERA_API_PREFIX}${normalizeChimeraEndpoint(endpoint)}`;
}

/** Candidate URLs in priority order (deduped). */
export function chimeraApiUrls(
  endpoint: string,
  query?: Record<string, string | number | undefined>
): string[] {
  const path = chimeraPath(endpoint);
  const base = resolveApiBase();
  const urls: string[] = [];

  if (base) {
    urls.push(`${base.replace(/\/+$/, "")}${path}`);
  } else if (typeof window !== "undefined") {
    urls.push(new URL(path, window.location.origin).href);
    urls.push(`${RENDER_API_ORIGIN}${path}`);
  } else {
    urls.push(path);
  }

  const withQuery = urls.map((url) => {
    if (!query) return url.replace(/([^:]\/)\/+/g, "$1");
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) params.set(key, String(value));
    }
    const qs = params.toString();
    const clean = url.replace(/([^:]\/)\/+/g, "$1");
    return qs ? `${clean}${clean.includes("?") ? "&" : "?"}${qs}` : clean;
  });

  return [...new Set(withQuery)];
}

export function chimeraApiUrl(
  endpoint: string,
  query?: Record<string, string | number | undefined>
): string {
  return chimeraApiUrls(endpoint, query)[0];
}

export function isHtmlResponseText(text: string): boolean {
  const t = text.trim().toLowerCase();
  return t.startsWith("<!doctype") || t.startsWith("<html");
}

export async function responseLooksLikeHtml(res: Response): Promise<boolean> {
  const ct = (res.headers.get("content-type") ?? "").toLowerCase();
  if (ct.includes("text/html")) return true;
  try {
    const peek = await res.clone().text();
    return isHtmlResponseText(peek);
  } catch {
    return false;
  }
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

const RETRYABLE_STATUS = new Set([502, 503, 504, 429]);
const AUTH_ENDPOINTS = new Set(["/login", "/register"]);

function retryDelayMs(attempt: number): number {
  return 2000 * (attempt + 1);
}

async function fetchWithRetries(
  url: string,
  init: RequestInit | undefined,
  endpointPath: string
): Promise<Response> {
  const maxAttempts = AUTH_ENDPOINTS.has(endpointPath) ? 3 : 1;
  let lastError: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!RETRYABLE_STATUS.has(res.status) || attempt === maxAttempts - 1) {
        return res;
      }
    } catch (e) {
      lastError = e;
      if (attempt === maxAttempts - 1) throw e;
    }
    await new Promise((r) => setTimeout(r, retryDelayMs(attempt)));
  }

  throw lastError instanceof Error ? lastError : new Error("Network error");
}

/** All CHIMERA backend HTTP calls must use this (auth, sync, backup, game API, …). */
export async function chimeraFetch(
  endpoint: string,
  init?: RequestInit,
  query?: Record<string, string | number | undefined>
): Promise<Response> {
  const endpointPath = normalizeChimeraEndpoint(endpoint);
  const urls = chimeraApiUrls(endpoint, query);
  let lastRes: Response | null = null;

  for (const url of urls) {
    const res = await fetchWithRetries(url, init, endpointPath);
    lastRes = res;
    if (!(await responseLooksLikeHtml(res))) {
      return res;
    }
  }

  return lastRes ?? new Response(null, { status: 502, statusText: "Bad Gateway" });
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
