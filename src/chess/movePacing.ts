/** Chess.com-style pacing for CHIMERA replies */
export const CHIMERA_MIN_THINK_MS = 420;
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
