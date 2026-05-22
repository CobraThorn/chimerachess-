import { file, rank, square } from "./square";
import type { CastlingRights, Color, GameState, Piece, PieceType, Square } from "./types";

export function createEmptyBoard(): (Piece | null)[] {
  return Array.from({ length: 64 }, () => null);
}

export function initialCastling(): CastlingRights {
  return { wK: true, wQ: true, bK: true, bQ: true };
}

export function createInitialState(): GameState {
  const board = createEmptyBoard();

  const backRank: PieceType[] = ["r", "n", "b", "q", "k", "b", "n", "r"];
  for (let f = 0; f < 8; f++) {
    board[square(f, 0)] = { type: backRank[f], color: "w" };
    board[square(f, 1)] = { type: "p", color: "w" };
    board[square(f, 6)] = { type: "p", color: "b" };
    board[square(f, 7)] = { type: backRank[f], color: "b" };
  }

  return {
    board,
    turn: "w",
    castling: initialCastling(),
    enPassant: null,
    halfmoveClock: 0,
    fullmoveNumber: 1,
  };
}

export function getPiece(state: GameState, sq: Square): Piece | null {
  return state.board[sq] ?? null;
}

export function cloneState(state: GameState): GameState {
  return {
    board: state.board.map((p) => (p ? { ...p } : null)),
    turn: state.turn,
    castling: { ...state.castling },
    enPassant: state.enPassant,
    halfmoveClock: state.halfmoveClock,
    fullmoveNumber: state.fullmoveNumber,
  };
}

export function findKing(state: GameState, color: Color): Square | null {
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (p?.type === "k" && p.color === color) return sq;
  }
  return null;
}

export function opponent(color: Color): Color {
  return color === "w" ? "b" : "w";
}

export function pieceValue(type: PieceType): number {
  const v: Record<PieceType, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
  return v[type];
}

export function countMaterial(state: GameState): { w: number; b: number } {
  let w = 0;
  let b = 0;
  for (const p of state.board) {
    if (!p || p.type === "k") continue;
    const v = pieceValue(p.type);
    if (p.color === "w") w += v;
    else b += v;
  }
  return { w, b };
}

export function isLightSquare(sq: Square): boolean {
  return (file(sq) + rank(sq)) % 2 === 0;
}
