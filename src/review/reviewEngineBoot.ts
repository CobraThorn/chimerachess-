import type { ChessEngine } from "../engine/types";

export const REVIEW_ENGINE_BOOT_MS = 30_000;
export const REVIEW_ENGINE_POLL_MS = 120;

/** Poll until UCI engine is ready, or call onTimeout if boot takes too long. */
export function watchReviewEngineReady(
  engine: ChessEngine,
  onReady: () => void,
  onTimeout: () => void,
  onFailed?: () => void
): () => void {
  const deadline = Date.now() + REVIEW_ENGINE_BOOT_MS;
  const timer = setInterval(() => {
    if (engine.loadFailed) {
      clearInterval(timer);
      onFailed?.();
      return;
    }
    if (engine.ready) {
      clearInterval(timer);
      onReady();
      return;
    }
    if (Date.now() >= deadline) {
      clearInterval(timer);
      onTimeout();
    }
  }, REVIEW_ENGINE_POLL_MS);
  return () => clearInterval(timer);
}
