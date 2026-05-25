import { createInitialState } from "../src/chess/board";
import { getLegalMoves, makeMove } from "../src/chess/game";
import { findBookMove } from "../src/chess/openingBook";

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

testWhiteEnPassant();
console.log("chess rules checks passed");
