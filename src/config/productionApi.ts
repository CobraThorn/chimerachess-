const CHIMERA_API_PREFIX = "/api/chimera";

/**
 * API base URL for fetch() calls.
 * - Empty string → same-origin `/api/chimera/*` (Netlify/Vite proxy). Preferred in production.
 * - Set VITE_CHIMERA_API_URL only when the browser must call Render directly (then set CORS on Render).
 *   Use the host origin only (e.g. https://chimerachess-0so2.onrender.com), not …/api/chimera.
 */
export function resolveApiBase(): string {
  const env = import.meta.env.VITE_CHIMERA_API_URL as string | undefined;
  if (!env?.trim()) return "";
  let base = env.trim().replace(/\/+$/, "");
  if (base.endsWith(CHIMERA_API_PREFIX)) {
    base = base.slice(0, -CHIMERA_API_PREFIX.length).replace(/\/+$/, "");
  }
  return base;
}

/** Build a CHIMERA API URL (register, login, sync, …). */
export function chimeraApiUrl(path: string): string {
  const base = resolveApiBase();
  return base ? `${base}${path}` : path;
}
