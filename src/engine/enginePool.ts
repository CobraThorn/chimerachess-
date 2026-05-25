import { createTorchEngine, probeTorchAvailable, waitForEngineReady } from "./torch";
import type { ChessEngine } from "./types";

let sharedTorch: ChessEngine | null = null;
let torchInit: Promise<ChessEngine | null> | null = null;
let torchMutex: Promise<void> = Promise.resolve();

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

/**
 * Run one Torch job at a time (CHIMERA play vs post-game review share one worker).
 */
export async function runWithSharedTorch<T>(
  fn: (engine: ChessEngine) => Promise<T>
): Promise<T | null> {
  const prev = torchMutex;
  let release!: () => void;
  torchMutex = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    const engine = await acquireSharedTorch();
    if (!engine) return null;
    try {
      return await fn(engine);
    } finally {
      engine.stop();
    }
  } finally {
    release();
  }
}

export function releaseSharedTorch(): void {
  sharedTorch?.quit();
  sharedTorch = null;
  torchInit = null;
  torchMutex = Promise.resolve();
}
