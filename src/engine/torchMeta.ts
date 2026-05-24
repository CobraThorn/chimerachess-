export type TorchEngineKind = "torch" | "shim" | "unknown";

export interface TorchEngineMeta {
  kind: TorchEngineKind;
  label: string;
  version: number;
}

let metaCache: TorchEngineMeta | null = null;

export async function fetchTorchMeta(): Promise<TorchEngineMeta | null> {
  if (metaCache) return metaCache;
  try {
    const res = await fetch("/torch/engine.json");
    if (!res.ok) return null;
    metaCache = (await res.json()) as TorchEngineMeta;
    return metaCache;
  } catch {
    return null;
  }
}

export function torchDisplayName(meta: TorchEngineMeta | null): string {
  if (!meta) return "Torch 4";
  if (meta.kind === "shim") return "Dual engine";
  return "Torch 4";
}
