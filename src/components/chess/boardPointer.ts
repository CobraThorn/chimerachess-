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

/** Last-move square tint (where the piece was / landed). */
export const LAST_MOVE_FROM_OPACITY = 0.34;
export const LAST_MOVE_TO_OPACITY = 0.34;

export function lastMoveSquareTint(themeLastMove: string, alpha: number): string {
  return themeLastMove.replace(/[\d.]+\)$/, `${alpha})`);
}

/** Soft follow while dragging (low stiffness = smooth lag). */
export const DRAG_FOLLOW_SPRING = {
  stiffness: 68,
  damping: 13,
  mass: 1.05,
  restDelta: 0.05,
} as const;

export const DRAG_LIFT_SCALE = 1.07;
