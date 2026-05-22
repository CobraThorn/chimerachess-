import { createInitialState } from "./board";
import { getLegalMoves, makeMove } from "./game";
import type { GameState, Move } from "./types";
import { toFen } from "./fen";
import { moveToUci, uciToMove } from "./uci";

/** Resolve a UCI string to the exact legal move object (flags included). */
export function findBookMove(state: GameState, uci: string): Move | null {
  const parsed = uciToMove(state, uci);
  if (!parsed) return null;
  const legal = getLegalMoves(state, parsed.from);
  const exact = legal.find((m) => moveToUci(m) === uci);
  if (exact) return exact;
  return legal.find((m) => m.from === parsed.from && m.to === parsed.to) ?? parsed;
}

export function applyUciLine(moves: string[]): GameState {
  let state = createInitialState();
  for (const uci of moves) {
    const move = findBookMove(state, uci);
    if (!move) break;
    const next = makeMove(state, move);
    if (!next) break;
    state = next;
  }
  return state;
}

export function isBookMove(state: GameState, uci: string, move: Move): boolean {
  const book = findBookMove(state, uci);
  if (!book) return false;
  return moveToUci(move) === moveToUci(book);
}

export function positionKeyFromState(state: GameState): string {
  return toFen(state).split(" ").slice(0, 4).join(" ");
}
