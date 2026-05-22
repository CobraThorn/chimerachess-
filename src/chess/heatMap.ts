import { isSquareAttacked } from "./attacks";
import { opponent } from "./board";
import type { Color, GameState, Square } from "./types";

/** Per-square control emphasis for the given side (0–1). */
export function computeControlHeat(
  state: GameState,
  perspective: Color
): number[] {
  const opp = opponent(perspective);
  const raw = new Array<number>(64);

  for (let sq = 0; sq < 64; sq++) {
    const mine = isSquareAttacked(state, sq, perspective);
    const theirs = isSquareAttacked(state, sq, opp);
    let v = 0;
    if (mine && !theirs) v = 1;
    else if (mine && theirs) v = 0.55;
    else if (theirs && !mine) v = 0.2;
    raw[sq] = v;
  }

  const max = Math.max(...raw, 0.001);
  return raw.map((v) => v / max);
}

/** Boost squares for a move and its neighborhood. */
export function emphasizeMoveHeat(
  base: number[],
  from: Square,
  to: Square,
  amount = 0.35
): number[] {
  const next = [...base];
  next[from] = Math.min(1, next[from] + amount);
  next[to] = Math.min(1, next[to] + amount * 1.2);
  return next;
}
