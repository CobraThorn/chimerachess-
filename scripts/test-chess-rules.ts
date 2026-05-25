import { createInitialState } from "../src/chess/board";
import { fromFen } from "../src/chess/fen";
import { getGameStatus, getLegalMoves, isGameOverStatus, makeMove } from "../src/chess/game";
import { moveToUci, uciToMove } from "../src/chess/uci";
import { findBookMove } from "../src/chess/openingBook";
import { Chess } from "chess.js";

function testWhiteEnPassant() {
  const line = ["e2e4", "c7c5", "e4e5", "d7d5"];
  let state = createInitialState();
  for (const uci of line) {
    const m = findBookMove(state, uci);
    if (!m) throw new Error(`Failed ${uci}`);
    state = makeMove(state, m)!;
  }
  const epMoves = getLegalMoves(state).filter((m) => m.flags?.includes("ep"));
  if (epMoves.length === 0) {
    throw new Error("White en passant capture missing after 1.e4 c5 2.e5 d5");
  }
  console.log("OK white en passant", epMoves.map((m) => m.from + m.to));
}

function testCheckIsNotGameOver() {
  const state = fromFen("7k/8/8/8/8/8/1Q6/8 b - - 0 1");
  if (!state) throw new Error("check test FEN parse failed");
  const st = getGameStatus(state);
  if (st.type !== "check") {
    throw new Error(`expected check, got ${st.type}`);
  }
  if (isGameOverStatus(st)) {
    throw new Error("check must not count as game over");
  }
  if (getLegalMoves(state).length === 0) {
    throw new Error("check position should still have legal moves");
  }
}

function testCheckmateIsGameOver() {
  let state = createInitialState();
  for (const uci of ["f2f3", "e7e6", "g2g4", "d8h4"]) {
    const move = uciToMove(state, uci);
    if (!move) throw new Error(`mate test missing legal move ${uci}`);
    state = makeMove(state, move)!;
  }
  const st = getGameStatus(state);
  if (st.type !== "checkmate") {
    throw new Error(`expected checkmate, got ${st.type}`);
  }
  if (!isGameOverStatus(st) || st.winner !== "b") {
    throw new Error("checkmate should be game over with black winning");
  }
}

function testFromFenCastlingDash() {
  const fen = "r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1";
  const state = fromFen(fen);
  if (!state) throw new Error("castling dash FEN parse failed");
  if (state.castling.wK || state.castling.wQ || state.castling.bK || state.castling.bQ) {
    throw new Error("fromFen must clear all castling rights when FEN field is '-'");
  }
  const castleUci = getLegalMoves(state)
    .map(moveToUci)
    .filter((uci) => uci === "e1g1" || uci === "e1c1");
  if (castleUci.length > 0) {
    throw new Error(`castling must be illegal with '-' rights, got ${castleUci.join(",")}`);
  }
  const server = new Chess(fen).moves({ verbose: true }).map((m) => m.from + m.to);
  if (server.includes("e1g1") || server.includes("e1c1")) {
    throw new Error("server sanity: castling should be illegal in fixture");
  }
  console.log("OK fromFen castling dash (no ghost O-O)");
}

function testFromFenCastlingKqkq() {
  const parsed = fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  if (!parsed) throw new Error("start FEN parse failed");
  if (!parsed.castling.wK || !parsed.castling.wQ || !parsed.castling.bK || !parsed.castling.bQ) {
    throw new Error("fromFen must preserve full castling rights from KQkq");
  }
  console.log("OK fromFen preserves KQkq");
}

testWhiteEnPassant();
testCheckIsNotGameOver();
testCheckmateIsGameOver();
testFromFenCastlingDash();
testFromFenCastlingKqkq();
console.log("chess rules checks passed");
