export type Color = "w" | "b";

export type PieceType = "p" | "n" | "b" | "r" | "q" | "k";

export interface Piece {
  type: PieceType;
  color: Color;
}

/** 0 = a1, 63 = h8 */
export type Square = number;

export interface CastlingRights {
  wK: boolean;
  wQ: boolean;
  bK: boolean;
  bQ: boolean;
}

export type MoveFlag =
  | "capture"
  | "ep"
  | "castle-k"
  | "castle-q"
  | "promotion"
  | "double-push";

export interface Move {
  from: Square;
  to: Square;
  promotion?: PieceType;
  flags?: MoveFlag[];
}

export interface GameState {
  board: (Piece | null)[];
  turn: Color;
  castling: CastlingRights;
  enPassant: Square | null;
  halfmoveClock: number;
  fullmoveNumber: number;
}

export type GameStatus =
  | { type: "ongoing" }
  | { type: "check"; color: Color }
  | { type: "checkmate"; winner: Color }
  | { type: "stalemate" }
  | { type: "draw"; reason: "fifty-move" | "insufficient-material" };

export const PIECE_SYMBOLS: Record<Color, Record<PieceType, string>> = {
  w: { k: "♔", q: "♕", r: "♖", b: "♗", n: "♘", p: "♙" },
  b: { k: "♚", q: "♛", r: "♜", b: "♝", n: "♞", p: "♟" },
};

export const PROMOTION_PIECES: PieceType[] = ["q", "r", "b", "n"];
