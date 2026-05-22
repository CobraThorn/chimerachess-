import { findKing, getPiece, opponent } from "./board";
import { file, inBounds, offset, pawnDir, rank, square } from "./square";
import type { Color, GameState, Move, Piece, PieceType, Square } from "./types";

const KNIGHT_DELTAS: [number, number][] = [
  [-2, -1], [-2, 1], [-1, -2], [-1, 2],
  [1, -2], [1, 2], [2, -1], [2, 1],
];

const BISHOP_DIRS: [number, number][] = [
  [-1, -1], [-1, 1], [1, -1], [1, 1],
];

const ROOK_DIRS: [number, number][] = [
  [-1, 0], [1, 0], [0, -1], [0, 1],
];

const KING_DELTAS: [number, number][] = [
  ...ROOK_DIRS,
  ...BISHOP_DIRS,
];

function addMove(moves: Move[], from: Square, to: Square, flags?: Move["flags"]): void {
  moves.push({ from, to, flags });
}

function addPromotions(moves: Move[], from: Square, to: Square, flags?: Move["flags"]): void {
  const types: PieceType[] = ["q", "r", "b", "n"];
  for (const promotion of types) {
    moves.push({
      from,
      to,
      promotion,
      flags: [...(flags ?? []), "promotion"],
    });
  }
}

function slidingMoves(
  state: GameState,
  from: Square,
  piece: Piece,
  dirs: [number, number][],
  moves: Move[]
): void {
  for (const [df, dr] of dirs) {
    let f = file(from) + df;
    let r = rank(from) + dr;
    while (inBounds(f, r)) {
      const to = square(f, r);
      const target = getPiece(state, to);
      if (!target) {
        addMove(moves, from, to);
      } else {
        if (target.color !== piece.color) {
          addMove(moves, from, to, ["capture"]);
        }
        break;
      }
      f += df;
      r += dr;
    }
  }
}

function pawnMoves(state: GameState, from: Square, piece: Piece, moves: Move[]): void {
  const dir = pawnDir(piece.color);
  const startRank = piece.color === "w" ? 1 : 6;
  const promoRank = piece.color === "w" ? 7 : 0;
  const r = rank(from);
  const f = file(from);

  const one = square(f, r + dir);
  if (inBounds(f, r + dir) && !getPiece(state, one)) {
    if (rank(one) === promoRank) {
      addPromotions(moves, from, one);
    } else {
      addMove(moves, from, one);
      if (r === startRank) {
        const two = square(f, r + 2 * dir);
        if (!getPiece(state, two)) {
          addMove(moves, from, two, ["double-push"]);
        }
      }
    }
  }

  for (const df of [-1, 1]) {
    const to = square(f + df, r + dir);
    if (!inBounds(f + df, r + dir)) continue;
    const target = getPiece(state, to);
    if (target && target.color !== piece.color) {
      if (rank(to) === promoRank) {
        addPromotions(moves, from, to, ["capture"]);
      } else {
        addMove(moves, from, to, ["capture"]);
      }
    }
  }

  if (state.enPassant !== null) {
    const ep = state.enPassant;
    if (rank(ep) === r + dir && Math.abs(file(ep) - f) === 1) {
      addMove(moves, from, ep, ["ep", "capture"]);
    }
  }
}

function knightMoves(state: GameState, from: Square, piece: Piece, moves: Move[]): void {
  for (const [df, dr] of KNIGHT_DELTAS) {
    const to = offset(from, df, dr);
    if (to === null) continue;
    const target = getPiece(state, to);
    if (!target) addMove(moves, from, to);
    else if (target.color !== piece.color) addMove(moves, from, to, ["capture"]);
  }
}

function kingMoves(state: GameState, from: Square, piece: Piece, moves: Move[]): void {
  for (const [df, dr] of KING_DELTAS) {
    const to = offset(from, df, dr);
    if (to === null) continue;
    const target = getPiece(state, to);
    if (!target) addMove(moves, from, to);
    else if (target.color !== piece.color) addMove(moves, from, to, ["capture"]);
  }
}

function castlingMoves(state: GameState, from: Square, piece: Piece, moves: Move[]): void {
  const c = state.castling;
  const homeRank = piece.color === "w" ? 0 : 7;
  if (rank(from) !== homeRank || file(from) !== 4) return;

  const canK = piece.color === "w" ? c.wK : c.bK;
  const canQ = piece.color === "w" ? c.wQ : c.bQ;

  if (canK) {
    const f = [5, 6].every((x) => !getPiece(state, square(x, homeRank)));
    const rook = getPiece(state, square(7, homeRank));
    if (f && rook?.type === "r" && rook.color === piece.color) {
      addMove(moves, from, square(6, homeRank), ["castle-k"]);
    }
  }

  if (canQ) {
    const f = [1, 2, 3].every((x) => !getPiece(state, square(x, homeRank)));
    const rook = getPiece(state, square(0, homeRank));
    if (f && rook?.type === "r" && rook.color === piece.color) {
      addMove(moves, from, square(2, homeRank), ["castle-q"]);
    }
  }
}

/** Pseudo-legal moves (may leave king in check). */
export function generatePseudoLegalMoves(state: GameState, from: Square): Move[] {
  const piece = getPiece(state, from);
  if (!piece || piece.color !== state.turn) return [];

  const moves: Move[] = [];

  switch (piece.type) {
    case "p":
      pawnMoves(state, from, piece, moves);
      break;
    case "n":
      knightMoves(state, from, piece, moves);
      break;
    case "b":
      slidingMoves(state, from, piece, BISHOP_DIRS, moves);
      break;
    case "r":
      slidingMoves(state, from, piece, ROOK_DIRS, moves);
      break;
    case "q":
      slidingMoves(state, from, piece, [...ROOK_DIRS, ...BISHOP_DIRS], moves);
      break;
    case "k":
      kingMoves(state, from, piece, moves);
      castlingMoves(state, from, piece, moves);
      break;
  }

  return moves;
}

export function generateAllPseudoLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = getPiece(state, sq);
    if (p && p.color === state.turn) {
      moves.push(...generatePseudoLegalMoves(state, sq));
    }
  }
  return moves;
}

/** Is square attacked by `byColor`? */
export function isSquareAttacked(
  state: GameState,
  sq: Square,
  byColor: Color
): boolean {
  const f = file(sq);
  const r = rank(sq);

  for (const [df, dr] of KNIGHT_DELTAS) {
    const from = offset(sq, -df, -dr);
    if (from === null) continue;
    const p = getPiece(state, from);
    if (p?.type === "n" && p.color === byColor) return true;
  }

  for (const [df, dr] of ROOK_DIRS) {
    let cf = f + df;
    let cr = r + dr;
    while (inBounds(cf, cr)) {
      const p = getPiece(state, square(cf, cr));
      if (p) {
        if (p.color === byColor && (p.type === "r" || p.type === "q")) return true;
        break;
      }
      cf += df;
      cr += dr;
    }
  }

  for (const [df, dr] of BISHOP_DIRS) {
    let cf = f + df;
    let cr = r + dr;
    while (inBounds(cf, cr)) {
      const p = getPiece(state, square(cf, cr));
      if (p) {
        if (p.color === byColor && (p.type === "b" || p.type === "q")) return true;
        break;
      }
      cf += df;
      cr += dr;
    }
  }

  for (const [df, dr] of KING_DELTAS) {
    const from = offset(sq, -df, -dr);
    if (from === null) continue;
    const p = getPiece(state, from);
    if (p?.type === "k" && p.color === byColor) return true;
  }

  const dir = pawnDir(byColor);
  for (const df of [-1, 1]) {
    const from = square(f + df, r - dir);
    if (!inBounds(f + df, r - dir)) continue;
    const p = getPiece(state, from);
    if (p?.type === "p" && p.color === byColor) return true;
  }

  return false;
}

export function isInCheck(state: GameState, color: Color): boolean {
  const kingSq = findKing(state, color);
  if (kingSq === null) return false;
  return isSquareAttacked(state, kingSq, opponent(color));
}
