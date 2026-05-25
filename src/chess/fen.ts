import { createEmptyBoard } from "./board";
import type { Color, GameState, PieceType, Square } from "./types";
import { file, rank, square } from "./square";

const PIECE_FEN: Record<PieceType, string> = {
  p: "p",
  n: "n",
  b: "b",
  r: "r",
  q: "q",
  k: "k",
};

function boardToFenPlacement(board: GameState["board"]): string {
  const rows: string[] = [];
  for (let r = 7; r >= 0; r--) {
    let row = "";
    let empty = 0;
    for (let f = 0; f < 8; f++) {
      const p = board[r * 8 + f];
      if (!p) {
        empty++;
      } else {
        if (empty) {
          row += empty;
          empty = 0;
        }
        const ch = PIECE_FEN[p.type];
        row += p.color === "w" ? ch.toUpperCase() : ch;
      }
    }
    if (empty) row += empty;
    rows.push(row);
  }
  return rows.join("/");
}

function castlingToFen(c: GameState["castling"]): string {
  let s = "";
  if (c.wK) s += "K";
  if (c.wQ) s += "Q";
  if (c.bK) s += "k";
  if (c.bQ) s += "q";
  return s || "-";
}

function enPassantToFen(ep: Square | null): string {
  if (ep === null) return "-";
  const files = "abcdefgh";
  return `${files[file(ep)]}${rank(ep) + 1}`;
}

const FEN_TO_TYPE: Record<string, PieceType> = {
  p: "p",
  n: "n",
  b: "b",
  r: "r",
  q: "q",
  k: "k",
};

/** Load position from a FEN string (for online sync / engines). */
export function fromFen(fen: string): GameState | null {
  const parts = fen.trim().split(/\s+/);
  if (parts.length < 4) return null;

  const [placement, turnStr, castleStr, epStr, halfStr = "0", fullStr = "1"] = parts;
  if (turnStr !== "w" && turnStr !== "b") return null;

  const board = createEmptyBoard();
  const ranks = placement.split("/");
  if (ranks.length !== 8) return null;

  for (let r = 0; r < 8; r++) {
    let f = 0;
    for (const ch of ranks[7 - r]) {
      if (ch >= "1" && ch <= "8") {
        f += Number(ch);
        continue;
      }
      const lower = ch.toLowerCase();
      const type = FEN_TO_TYPE[lower];
      if (!type || f > 7) return null;
      const color: Color = ch === lower ? "b" : "w";
      board[square(f, r)] = { type, color };
      f++;
    }
    if (f !== 8) return null;
  }

  const castling = { wK: false, wQ: false, bK: false, bQ: false };
  if (castleStr !== "-") {
    castling.wK = castleStr.includes("K");
    castling.wQ = castleStr.includes("Q");
    castling.bK = castleStr.includes("k");
    castling.bQ = castleStr.includes("q");
  }

  let enPassant: Square | null = null;
  if (epStr !== "-" && epStr.length === 2) {
    const ef = epStr.charCodeAt(0) - 97;
    const er = Number(epStr[1]) - 1;
    if (ef >= 0 && ef < 8 && er >= 0 && er < 8) {
      enPassant = square(ef, er);
    }
  }

  return {
    board,
    turn: turnStr,
    castling,
    enPassant,
    halfmoveClock: Number(halfStr) || 0,
    fullmoveNumber: Math.max(1, Number(fullStr) || 1),
  };
}

/** Export current position as FEN (for Stockfish / external engines). */
export function toFen(state: GameState): string {
  return [
    boardToFenPlacement(state.board),
    state.turn,
    castlingToFen(state.castling),
    enPassantToFen(state.enPassant),
    state.halfmoveClock,
    state.fullmoveNumber,
  ].join(" ");
}
