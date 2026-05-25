import { createStockfishEngine, type StockfishEngine } from "./stockfish";

let shared: StockfishEngine | null = null;
let init: Promise<StockfishEngine> | null = null;
let refCount = 0;

/** One Stockfish worker shared by analyze + legends (desktop) to cap WASM memory. */
export function acquireSharedStockfish(): Promise<StockfishEngine> {
  refCount += 1;
  if (!init) {
    init = (async () => {
      if (!shared) shared = createStockfishEngine();
      const deadline = Date.now() + 22_000;
      while (!shared.ready && !shared.loadFailed && Date.now() < deadline) {
        await new Promise((r) => setTimeout(r, 80));
      }
      if (!shared.ready || shared.loadFailed) {
        shared.quit();
        shared = null;
        init = null;
        throw new Error("Shared Stockfish failed to load");
      }
      return shared;
    })();
  }
  return init;
}

export function releaseSharedStockfish(): void {
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    shared?.stop();
  }
}

export function disposeSharedStockfish(): void {
  refCount = 0;
  shared?.quit();
  shared = null;
  init = null;
}
