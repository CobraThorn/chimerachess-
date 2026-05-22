import type { GameState, Move } from "./types";
import { getLegalMoves } from "./game";
import { parseUciSquare, uciToMove } from "./uci";

/** Resolve UCI from engine; default promotion to queen. */
export function resolveBotMove(state: GameState, uci: string): Move | null {
  if (!uci || uci === "(none)") return null;

  let move = uciToMove(state, uci);
  if (move) return move;

  if (uci.length === 4) {
    move = uciToMove(state, uci + "q");
    if (move) return move;
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const fromSq = parseUciSquare(from);
    const toSq = parseUciSquare(to);
    if (fromSq === null || toSq === null) return null;
    const legal = getLegalMoves(state, fromSq).filter((m) => m.to === toSq);
    return legal[0] ?? null;
  }

  return null;
}
