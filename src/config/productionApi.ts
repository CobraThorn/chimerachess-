/**
 * API base URL for fetch() calls.
 * - Empty string → same-origin `/api/chimera/*` (Netlify/Vite proxy). Preferred in production.
 * - Set VITE_CHIMERA_API_URL only when the browser must call Render directly (then set CORS on Render).
 */
export function resolveApiBase(): string {
  const env = import.meta.env.VITE_CHIMERA_API_URL as string | undefined;
  if (env?.trim()) return env.trim().replace(/\/$/, "");
  return "";
}
