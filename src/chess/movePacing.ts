/** Max Stockfish movetime for CHIMERA replies (arena, solo, mirror). */
export const CHIMERA_MAX_THINK_MS = 4_000;
/** Wall-clock cap for one CHIMERA search (movetime + UCI overhead). */
export const CHIMERA_SEARCH_HARD_CAP_MS = 5_500;

/** Minimum visible “thinking” time after the engine returns (capped under max think). */
export const CHIMERA_MIN_THINK_MS = 280;
/** Match board piece glide duration in ChessBoardGrid. */
export const MOVE_SLIDE_MS = 180;

export function waitMs(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Wait at least `minMs` since `startedAt`. */
export async function waitAtLeast(startedAt: number, minMs: number): Promise<void> {
  const left = minMs - (Date.now() - startedAt);
  if (left > 0) await waitMs(left);
}
