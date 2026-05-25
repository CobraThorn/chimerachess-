import { getLegalMoves } from "./game";
import { file, rank } from "./square";
import type { GameState, Move, PieceType } from "./types";

const FILES = "abcdefgh";

export function moveToUci(move: Move): string {
  let uci =
    FILES[file(move.from)] +
    (rank(move.from) + 1) +
    FILES[file(move.to)] +
    (rank(move.to) + 1);
  if (move.promotion) uci += move.promotion;
  return uci;
}

export function parseUciSquare(s: string): number | null {
  if (s.length < 2) return null;
  const f = s.charCodeAt(0) - 97;
  const r = parseInt(s[1], 10) - 1;
  if (f < 0 || f > 7 || r < 0 || r > 7) return null;
  return r * 8 + f;
}

/** Match UCI string to a legal move in the position. */
export function uciToMove(state: GameState, uci: string): Move | null {
  if (!uci || uci === "(none)") return null;
  const promo = uci.length >= 5 ? (uci[4] as PieceType) : undefined;
  const from = parseUciSquare(uci.slice(0, 2));
  const to = parseUciSquare(uci.slice(2, 4));
  if (from === null || to === null) return null;

  const legal = getLegalMoves(state, from);
  const exact = legal.find(
    (m) =>
      m.to === to && (promo ? m.promotion === promo : !m.promotion)
  );
  if (exact) return exact;

  if (!promo && uci.length === 4) {
    const promotions = legal.filter((m) => m.to === to && m.promotion);
    if (promotions.length === 1) return promotions[0]!;
    return promotions.find((m) => m.promotion === "q") ?? null;
  }

  return null;
}
