import type { ChessEngine } from "./types";
import { createTorchEngine, probeTorchAvailable, waitForEngineReady } from "./torch";

let sharedTorch: ChessEngine | null = null;
let torchInit: Promise<ChessEngine | null> | null = null;

/** Lazy singleton Torch 4 instance for review + high-Elo CHIMERA. */
export function acquireSharedTorch(): Promise<ChessEngine | null> {
  if (torchInit) return torchInit;
  torchInit = (async () => {
    if (!(await probeTorchAvailable())) return null;
    if (!sharedTorch) {
      sharedTorch = createTorchEngine();
      const ok = await waitForEngineReady(sharedTorch, 22_000);
      if (!ok || sharedTorch.loadFailed) {
        sharedTorch?.quit();
        sharedTorch = null;
        return null;
      }
    }
    return sharedTorch;
  })();
  return torchInit;
}

export function releaseSharedTorch(): void {
  sharedTorch?.quit();
  sharedTorch = null;
  torchInit = null;
}
