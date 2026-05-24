import { createUciWorkerEngine } from "./uciWorkerEngine";
import type { ChessEngine } from "./types";

export const TORCH_VERSION = 4;
export const TORCH_SCRIPT_URL = "/torch/torch-4.js";

let probeCache: boolean | null = null;

/** True when Torch worker assets are deployed under /public/torch/. */
export async function probeTorchAvailable(): Promise<boolean> {
  if (probeCache !== null) return probeCache;
  try {
    const res = await fetch(TORCH_SCRIPT_URL, { method: "HEAD" });
    probeCache = res.ok;
  } catch {
    probeCache = false;
  }
  return probeCache;
}

export function createTorchEngine(): ChessEngine {
  return createUciWorkerEngine(TORCH_SCRIPT_URL);
}

export async function waitForEngineReady(
  engine: ChessEngine,
  timeoutMs: number
): Promise<boolean> {
  if (engine.ready) return true;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (engine.ready) return true;
    if (engine.loadFailed) return false;
    await new Promise((r) => setTimeout(r, 80));
  }
  return engine.ready;
}
