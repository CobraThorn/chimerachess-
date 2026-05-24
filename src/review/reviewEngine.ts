/** Post-game review — deepest practical Stockfish depth in the browser. */
export const REVIEW_MOVE_DEPTH = 22;
export const REVIEW_TIMELINE_DEPTH = 20;
export const REVIEW_TIMELINE_DEPTH_LONG = 16;
export const REVIEW_MULTIPV = 3;

export function reviewTimelineDepth(totalPlies: number): number {
  return totalPlies > 50 ? REVIEW_TIMELINE_DEPTH_LONG : REVIEW_TIMELINE_DEPTH;
}
