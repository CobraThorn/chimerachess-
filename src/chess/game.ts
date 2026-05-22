import { cloneState, getPiece, opponent } from "./board";
import {
  generateAllPseudoLegalMoves,
  generatePseudoLegalMoves,
  isInCheck,
  isSquareAttacked,
} from "./attacks";
import { file, rank, rookKingside, rookQueenside, square } from "./square";
import type {
  Color,
  GameState,
  GameStatus,
  Move,
  PieceType,
  Square,
} from "./types";

function passesThroughCheck(
  state: GameState,
  color: Color,
  from: Square,
  to: Square
): boolean {
  const minF = Math.min(file(from), file(to));
  const maxF = Math.max(file(from), file(to));
  const r = rank(from);
  for (let f = minF; f <= maxF; f++) {
    if (isSquareAttacked(state, square(f, r), opponent(color))) {
      return true;
    }
  }
  return false;
}

export function applyMove(state: GameState, move: Move): GameState {
  const next = cloneState(state);
  const piece = getPiece(next, move.from);
  if (!piece) return next;

  const captured = getPiece(next, move.to);
  const flags = move.flags ?? [];

  next.board[move.from] = null;

  if (flags.includes("castle-k")) {
    const home = piece.color === "w" ? 0 : 7;
    next.board[square(4, home)] = null;
    next.board[square(6, home)] = piece;
    next.board[square(7, home)] = null;
    next.board[square(5, home)] = { type: "r", color: piece.color };
  } else if (flags.includes("castle-q")) {
    const home = piece.color === "w" ? 0 : 7;
    next.board[square(4, home)] = null;
    next.board[square(2, home)] = piece;
    next.board[square(0, home)] = null;
    next.board[square(3, home)] = { type: "r", color: piece.color };
  } else if (flags.includes("ep")) {
    const capSq = square(file(move.to), rank(move.from));
    next.board[capSq] = null;
    next.board[move.to] = piece;
  } else {
    next.board[move.to] =
      move.promotion && piece.type === "p"
        ? { type: move.promotion, color: piece.color }
        : piece;
  }

  if (piece.type === "p" && flags.includes("double-push")) {
    next.enPassant = square(file(move.from), rank(move.from) + (piece.color === "w" ? 1 : -1));
  } else {
    next.enPassant = null;
  }

  if (piece.type === "k") {
    if (piece.color === "w") {
      next.castling.wK = false;
      next.castling.wQ = false;
    } else {
      next.castling.bK = false;
      next.castling.bQ = false;
    }
  }

  if (piece.type === "r") {
    if (move.from === rookKingside("w") || move.to === rookKingside("w")) next.castling.wK = false;
    if (move.from === rookQueenside("w") || move.to === rookQueenside("w")) next.castling.wQ = false;
    if (move.from === rookKingside("b") || move.to === rookKingside("b")) next.castling.bK = false;
    if (move.from === rookQueenside("b") || move.to === rookQueenside("b")) next.castling.bQ = false;
  }

  if (captured || piece.type === "p") {
    next.halfmoveClock = 0;
  } else {
    next.halfmoveClock += 1;
  }

  if (next.turn === "b") next.fullmoveNumber += 1;
  next.turn = opponent(next.turn);

  return next;
}

export function isLegalMove(state: GameState, move: Move): boolean {
  const piece = getPiece(state, move.from);
  if (!piece || piece.color !== state.turn) return false;

  const pseudo = generatePseudoLegalMoves(state, move.from);
  const match = pseudo.find((m) => movesEquivalent(m, move));
  if (!match) return false;

  if (piece.type === "k" && (match.flags?.includes("castle-k") || match.flags?.includes("castle-q"))) {
    if (isInCheck(state, piece.color)) return false;
    if (passesThroughCheck(state, piece.color, move.from, move.to)) return false;
  }

  const trial = applyMove(state, match);
  return !isInCheck(trial, state.turn);
}

export function getLegalMoves(state: GameState, from?: Square): Move[] {
  const pseudo =
    from !== undefined
      ? generatePseudoLegalMoves(state, from)
      : generateAllPseudoLegalMoves(state);

  return pseudo.filter((m) => isLegalMove(state, m));
}

export function getAllLegalMoves(state: GameState): Move[] {
  return getLegalMoves(state);
}

function insufficientMaterial(state: GameState): boolean {
  const minors: { type: PieceType; sq: Square }[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (p && p.type !== "k") minors.push({ type: p.type, sq });
  }
  if (minors.length === 0) return true;
  if (minors.length === 1 && (minors[0].type === "n" || minors[0].type === "b")) {
    return true;
  }
  if (minors.length === 2 && minors[0].type === "b" && minors[1].type === "b") {
    const sameSquareColor =
      (file(minors[0].sq) + rank(minors[0].sq)) % 2 ===
      (file(minors[1].sq) + rank(minors[1].sq)) % 2;
    return sameSquareColor;
  }
  return false;
}

export function getGameStatus(state: GameState): GameStatus {
  const legal = getAllLegalMoves(state);
  const inCheck = isInCheck(state, state.turn);

  if (legal.length === 0) {
    if (inCheck) return { type: "checkmate", winner: opponent(state.turn) };
    return { type: "stalemate" };
  }

  if (state.halfmoveClock >= 100) {
    return { type: "draw", reason: "fifty-move" };
  }

  if (insufficientMaterial(state)) {
    return { type: "draw", reason: "insufficient-material" };
  }

  if (inCheck) return { type: "check", color: state.turn };
  return { type: "ongoing" };
}

export function makeMove(state: GameState, move: Move): GameState | null {
  if (!isLegalMove(state, move)) return null;
  const pseudo = generatePseudoLegalMoves(state, move.from);
  const match = pseudo.find((m) => movesEquivalent(m, move));
  if (!match) return null;
  return applyMove(state, match);
}

export function movesEquivalent(a: Move, b: Move): boolean {
  if (a.from !== b.from || a.to !== b.to) return false;
  if (a.promotion !== b.promotion) return false;
  const af = (a.flags ?? []).slice().sort().join(",");
  const bf = (b.flags ?? []).slice().sort().join(",");
  return af === bf;
}

export function moveEquals(a: Move, b: Move): boolean {
  return movesEquivalent(a, b);
}

export function formatMove(state: GameState, move: Move): string {
  const files = "abcdefgh";
  if (move.flags?.includes("castle-k")) return "O-O";
  if (move.flags?.includes("castle-q")) return "O-O-O";
  const from = `${files[file(move.from)]}${rank(move.from) + 1}`;
  const to = `${files[file(move.to)]}${rank(move.to) + 1}`;
  const cap = getPiece(state, move.to) || move.flags?.includes("ep") || move.flags?.includes("capture");
  const promo = move.promotion ? `=${move.promotion.toUpperCase()}` : "";
  return `${from}${cap ? "x" : "-"}${to}${promo}`;
}
