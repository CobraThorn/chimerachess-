export function onlineWsUrl(): string {
  const env = import.meta.env.VITE_CHIMERA_API_URL as string | undefined;
  if (env?.trim()) {
    const base = new URL(env.trim().replace(/\/$/, ""));
    base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
    return `${base.origin}/api/chimera/ws`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/chimera/ws`;
}
