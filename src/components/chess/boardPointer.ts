import type { Square } from "../../chess";

/** Map pointer position to board square (0–63). */
export function clientToSquare(
  rect: DOMRect,
  clientX: number,
  clientY: number,
  flip: boolean
): Square | null {
  const relX = (clientX - rect.left) / rect.width;
  const relY = (clientY - rect.top) / rect.height;
  if (relX < 0 || relX > 1 || relY < 0 || relY > 1) return null;

  const vf = Math.min(7, Math.max(0, Math.floor(relX * 8)));
  const vr = Math.min(7, Math.max(0, Math.floor(relY * 8)));
  const f = flip ? 7 - vf : vf;
  const r = flip ? vr : 7 - vr;
  return (r * 8 + f) as Square;
}

export function squareToPercent(
  sq: Square,
  flip: boolean
): { left: string; top: string } {
  const f = sq & 7;
  const r = sq >> 3;
  const vf = flip ? 7 - f : f;
  const vr = flip ? r : 7 - r;
  return { left: `${vf * 12.5}%`, top: `${vr * 12.5}%` };
}

export const DRAG_START_PX = 5;
export const MOVE_PIECE_OPACITY = 0.34;
