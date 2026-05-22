import { resolveApiBase } from "../config/productionApi";

export function onlineWsUrl(): string {
  const base = resolveApiBase();
  if (base) {
    const url = new URL(base);
    url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
    return `${url.origin}/api/chimera/ws`;
  }
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/api/chimera/ws`;
}
