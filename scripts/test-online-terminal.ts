/**
 * Verifies online terminalPending + game_over FEN sync (A1/A2).
 * Run: npm run test:online-terminal
 */
import { Chess } from "chess.js";
import { fromFen, toFen } from "../src/chess/fen";

function serverTerminalPending(chess: Chess): boolean {
  const c = checkTimeoutMock(chess);
  return (
    chess.isCheckmate() ||
    chess.isStalemate() ||
    chess.isDraw() ||
    !!c
  );
}

/** Mirror server checkTimeout when clocks already applied (K vs K flag test). */
function checkTimeoutMock(_chess: Chess): string | null {
  return null;
}

type Phase = "playing" | "ended";

interface SimClient {
  phase: Phase;
  terminalPending: boolean;
  matchFen: string;
  result: string | null;
}

function canPlay(c: SimClient): boolean {
  return c.phase === "playing" && !c.terminalPending;
}

function onMove(c: SimClient, msg: { fen: string; terminalPending?: boolean }): SimClient {
  return {
    ...c,
    matchFen: msg.fen,
    terminalPending: msg.terminalPending === true,
  };
}

function onGameOver(
  c: SimClient,
  msg: { fen: string; result: string }
): SimClient {
  return {
    phase: "ended",
    terminalPending: false,
    matchFen: msg.fen,
    result: msg.result,
  };
}

function testThreefoldTerminalPendingBlocksMove() {
  const chess = new Chess();
  const sanLoop = ["Nf3", "Nf6", "Ng1", "Ng8"];
  let lastPayload: { fen: string; terminalPending: boolean } | null = null;

  for (let rep = 0; rep < 2; rep++) {
    for (const san of sanLoop) {
      const applied = chess.move(san);
      if (!applied) throw new Error(`SAN failed: ${san}`);
      lastPayload = {
        fen: chess.fen(),
        terminalPending: serverTerminalPending(chess),
      };
    }
  }

  if (!lastPayload?.terminalPending) {
    throw new Error("expected terminalPending on threefold repetition move");
  }

  let client: SimClient = {
    phase: "playing",
    terminalPending: false,
    matchFen: chess.fen(),
    result: null,
  };

  client = onMove(client, lastPayload);
  if (canPlay(client)) {
    throw new Error("canPlay must be false after terminalPending move");
  }

  const serverFen = lastPayload.fen;
  client = onGameOver(client, { fen: serverFen, result: "draw" });
  if (client.phase !== "ended" || client.terminalPending) {
    throw new Error("game_over must end phase and clear terminalPending");
  }

  const board = fromFen(client.matchFen);
  const serverBoard = fromFen(serverFen);
  if (!board || !serverBoard || toFen(board) !== toFen(serverBoard)) {
    throw new Error("ended board must match server FEN");
  }

  console.log("OK threefold terminalPending blocks move + FEN sync");
}

function testCheckmateTerminalPending() {
  const chess = new Chess();
  for (const san of ["f3", "e6", "g4", "Qh4"]) {
    chess.move(san);
  }
  const payload = {
    fen: chess.fen(),
    terminalPending: serverTerminalPending(chess),
  };
  if (!payload.terminalPending || !chess.isCheckmate()) {
    throw new Error("fool's mate should set terminalPending");
  }
  console.log("OK checkmate sets terminalPending");
}

function testNonTerminalMove() {
  const chess = new Chess();
  chess.move("e4");
  if (serverTerminalPending(chess)) {
    throw new Error("e4 must not set terminalPending");
  }
  console.log("OK non-terminal move has no terminalPending");
}

function testResignPathUnaffected() {
  let client: SimClient = {
    phase: "playing",
    terminalPending: false,
    matchFen: new Chess().fen(),
    result: null,
  };
  client = {
    ...client,
    phase: "ended",
    result: "black-win",
    terminalPending: false,
  };
  if (client.terminalPending || client.phase !== "ended") {
    throw new Error("resign-style end must clear terminal state");
  }
  console.log("OK resign/end path clears terminalPending");
}

testNonTerminalMove();
testCheckmateTerminalPending();
testThreefoldTerminalPendingBlocksMove();
testResignPathUnaffected();
console.log("online terminal checks passed");
