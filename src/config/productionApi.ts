/** Live API on Render — used when VITE_CHIMERA_API_URL is missing on Netlify builds. */
export const CHIMERA_RENDER_API = "https://chimerachess-0so2.onrender.com";

export function resolveApiBase(): string {
  const env = import.meta.env.VITE_CHIMERA_API_URL as string | undefined;
  if (env?.trim()) return env.trim().replace(/\/$/, "");
  if (import.meta.env.PROD) return CHIMERA_RENDER_API;
  return "";
}
