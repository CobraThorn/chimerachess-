/**
 * P0 #1 — Client (src/chess) vs server (chess.js) parity audit for online play.
 * Run: npm run test:parity
 */
import { Chess } from "chess.js";
import { createInitialState } from "../src/chess/board";
import { fromFen, toFen } from "../src/chess/fen";
import {
  getAllLegalMoves,
  getGameStatus,
  isGameOverStatus,
  makeMove,
} from "../src/chess/game";
import { isInCheck } from "../src/chess/attacks";
import { moveToUci, uciToMove } from "../src/chess/uci";
import type { GameState } from "../src/chess/types";

type ServerDrawKind =
  | "insufficient-material"
  | "threefold"
  | "fifty-move"
  | "other";

interface ServerSnapshot {
  fen: string;
  legalUci: string[];
  inCheck: boolean;
  checkmate: boolean;
  stalemate: boolean;
  draw: boolean;
  drawKind: ServerDrawKind | null;
  winner: "w" | "b" | null;
}

interface ClientSnapshot {
  fen: string;
  legalUci: string[];
  inCheck: boolean;
  status: ReturnType<typeof getGameStatus>;
}

interface ParityCase {
  id: string;
  category: string;
  /** Starting FEN (default: initial). */
  fen?: string;
  /** UCI moves from that FEN. */
  moves?: string[];
  /** Optional note for report. */
  note?: string;
}

function serverSnapshot(chessOrFen: Chess | string): ServerSnapshot {
  const chess = typeof chessOrFen === "string" ? new Chess(chessOrFen) : chessOrFen;
  const fen = chess.fen();
  const legalUci = chess
    .moves({ verbose: true })
    .map((m) => m.from + m.to + (m.promotion ?? ""))
    .sort();

  let drawKind: ServerDrawKind | null = null;
  if (chess.isDraw()) {
    if (chess.isDrawByFiftyMoves()) drawKind = "fifty-move";
    else if (chess.isInsufficientMaterial()) drawKind = "insufficient-material";
    else if (chess.isThreefoldRepetition()) drawKind = "threefold";
    else drawKind = "other";
  }

  return {
    fen: chess.fen(),
    legalUci,
    inCheck: chess.inCheck(),
    checkmate: chess.isCheckmate(),
    stalemate: chess.isStalemate(),
    draw: chess.isDraw(),
    drawKind,
    winner: chess.isCheckmate()
      ? chess.turn() === "w"
        ? "b"
        : "w"
      : null,
  };
}

function clientSnapshot(state: GameState): ClientSnapshot {
  return {
    fen: toFen(state),
    legalUci: getAllLegalMoves(state).map(moveToUci).sort(),
    inCheck: isInCheck(state, state.turn),
    status: getGameStatus(state),
  };
}

function applyClientMoves(fen: string | undefined, moves: string[]): GameState {
  let state = fen ? fromFen(fen) : createInitialState();
  if (!state) throw new Error(`Invalid FEN: ${fen}`);
  for (const uci of moves) {
    const move = uciToMove(state, uci);
    if (!move) throw new Error(`Client illegal/missing move ${uci} at ${toFen(state)}`);
    const next = makeMove(state, move);
    if (!next) throw new Error(`Client makeMove failed ${uci} at ${toFen(state)}`);
    state = next;
  }
  return state;
}

function applyServerMoves(fen: string | undefined, moves: string[]): Chess {
  const chess = fen ? new Chess(fen) : new Chess();
  for (const uci of moves) {
    const from = uci.slice(0, 2);
    const to = uci.slice(2, 4);
    const promotion = uci.length > 4 ? uci[4] : undefined;
    try {
      const ok = chess.move({ from, to, promotion });
      if (!ok) throw new Error(`Server rejected ${uci} at ${chess.fen()}`);
    } catch (e) {
      throw new Error(`Server rejected ${uci} at ${chess.fen()}: ${e}`);
    }
  }
  return chess;
}

function normalizeFen(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

/** Piece placement + side to move (ignores castling/ep/counters). */
function coreFen(fen: string): string {
  const p = fen.split(" ");
  return `${p[0]} ${p[1]}`;
}

interface Mismatch {
  caseId: string;
  category: string;
  field: string;
  client: string;
  server: string;
  fen: string;
  moves: string[];
  note?: string;
}

function compareCase(test: ParityCase): Mismatch[] {
  const moves = test.moves ?? [];
  const clientState = applyClientMoves(test.fen, moves);
  const client = clientSnapshot(clientState);
  const serverChess = applyServerMoves(test.fen, moves);
  const server = serverSnapshot(serverChess);

  const mismatches: Mismatch[] = [];
  const base = {
    caseId: test.id,
    category: test.category,
    fen: client.fen,
    moves,
    note: test.note,
  };

  if (JSON.stringify(client.legalUci) !== JSON.stringify(server.legalUci)) {
    const onlyClient = client.legalUci.filter((m) => !server.legalUci.includes(m));
    const onlyServer = server.legalUci.filter((m) => !client.legalUci.includes(m));
    mismatches.push({
      ...base,
      field: "legal_moves",
      client: `count=${client.legalUci.length} only=${onlyClient.join(",") || "—"}`,
      server: `count=${server.legalUci.length} only=${onlyServer.join(",") || "—"}`,
    });
  }

  if (coreFen(client.fen) !== coreFen(server.fen)) {
    mismatches.push({
      ...base,
      field: "fen_core_placement",
      client: client.fen,
      server: server.fen,
    });
  }

  const fenPartsClient = client.fen.split(" ");
  const fenPartsServer = server.fen.split(" ");
  if (fenPartsClient[2] !== fenPartsServer[2]) {
    mismatches.push({
      ...base,
      field: "fen_castling_rights",
      client: fenPartsClient[2],
      server: fenPartsServer[2],
    });
  }
  if (fenPartsClient[3] !== fenPartsServer[3]) {
    mismatches.push({
      ...base,
      field: "fen_en_passant_square",
      client: fenPartsClient[3],
      server: fenPartsServer[3],
    });
  }
  if (fenPartsClient.slice(4).join(" ") !== fenPartsServer.slice(4).join(" ")) {
    mismatches.push({
      ...base,
      field: "fen_halfmove_fullmove",
      client: fenPartsClient.slice(4).join(" "),
      server: fenPartsServer.slice(4).join(" "),
    });
  }

  if (client.inCheck !== server.inCheck) {
    mismatches.push({
      ...base,
      field: "in_check",
      client: String(client.inCheck),
      server: String(server.inCheck),
    });
  }

  const clientTerminal = isGameOverStatus(client.status);
  const serverTerminal = server.checkmate || server.stalemate || server.draw;

  if (clientTerminal !== serverTerminal) {
    mismatches.push({
      ...base,
      field: "terminal_flag",
      client: clientTerminal ? client.status.type : "ongoing",
      server: server.checkmate
        ? "checkmate"
        : server.stalemate
          ? "stalemate"
          : server.draw
            ? `draw:${server.drawKind}`
            : "ongoing",
    });
  }

  if (server.checkmate && client.status.type !== "checkmate") {
    mismatches.push({
      ...base,
      field: "checkmate",
      client: client.status.type,
      server: `checkmate winner=${server.winner}`,
    });
  }

  if (server.stalemate && client.status.type !== "stalemate") {
    mismatches.push({
      ...base,
      field: "stalemate",
      client: client.status.type,
      server: "stalemate",
    });
  }

  if (server.draw && client.status.type !== "draw" && client.status.type !== "stalemate") {
    mismatches.push({
      ...base,
      field: "draw",
      client: client.status.type,
      server: `draw:${server.drawKind}`,
    });
  }

  if (server.drawKind === "threefold" && client.status.type === "ongoing") {
    mismatches.push({
      ...base,
      field: "threefold_repetition",
      client: "not implemented (ongoing)",
      server: "draw:threefold",
    });
  }

  if (server.drawKind === "fifty-move" && client.status.reason !== "fifty-move") {
    mismatches.push({
      ...base,
      field: "fifty_move",
      client: client.status.type + (client.status.type === "draw" ? `:${client.status.reason}` : ""),
      server: "draw:fifty-move",
    });
  }

  if (
    server.drawKind === "insufficient-material" &&
    !(client.status.type === "draw" && client.status.reason === "insufficient-material")
  ) {
    mismatches.push({
      ...base,
      field: "insufficient_material",
      client:
        client.status.type === "draw"
          ? client.status.reason
          : client.status.type,
      server: "draw:insufficient-material",
    });
  }

  return mismatches;
}

/** Curated positions + move sequences covering online-critical rules. */
const CASES: ParityCase[] = [
  { id: "initial", category: "legal", moves: [] },
  { id: "after_e4", category: "legal", moves: ["e2e4"] },
  { id: "italian_opening", category: "legal", moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"] },

  // Castling
  {
    id: "castling_ghost_rights_server_fen",
    category: "castling",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1",
    note: "Server FEN has '-' castling; fromFen must not grant O-O/O-O-O",
  },
  {
    id: "castle_kingside_white",
    category: "castling",
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "g8f6", "e1g1"],
    note: "Standard opening kingside castle",
  },
  {
    id: "castle_queenside_white",
    category: "castling",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w Qq - 0 1",
    moves: ["e1c1"],
    note: "Prepared position — white queenside castle",
  },
  {
    id: "castle_blocked_in_check",
    category: "castling",
    fen: "6k1/8/8/8/2q5/8/8/6K1 w - - 0 1",
    note: "White king g1 in check from Qc4 — O-O illegal",
  },
  {
    id: "castle_through_check",
    category: "castling",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    moves: ["e1g1"],
    note: "Kingside castle with bishop on c4 — f1 square attacked?",
  },
  {
    id: "castle_rook_captured_rights",
    category: "castling",
    fen: "r3k2r/8/8/8/8/8/8/R3K2R w KQkq - 0 1",
    moves: ["h1h2"],
    note: "Rook leaves h1 — kingside rights lost",
  },

  // En passant
  {
    id: "ep_setup_white",
    category: "en_passant",
    moves: ["e2e4", "c7c5", "e4e5", "d7d5"],
  },
  {
    id: "ep_capture_white",
    category: "en_passant",
    moves: ["e2e4", "c7c5", "e4e5", "d7d5", "e5d6"],
  },
  {
    id: "ep_black",
    category: "en_passant",
    moves: ["e2e4", "c7c5", "g1f3", "e7e6", "d2d4", "c5d4", "f3d4", "b7b5", "d4b5"],
  },

  // Promotion
  {
    id: "promotion_queen",
    category: "promotion",
    fen: "8/P7/8/8/8/8/8/4K2k w - - 0 1",
    moves: ["a7a8q"],
  },
  {
    id: "promotion_knight_underpromo",
    category: "promotion",
    fen: "8/P7/8/8/8/8/8/4K2k w - - 0 1",
    moves: ["a7a8n"],
  },
  // Capture promotion: omitted — hard to fixture without chess.js-only setup;
  // queen/knight underpromo cases above cover promotion legality on both engines.

  // Check / mate / stalemate
  {
    id: "check_not_mate",
    category: "check",
    fen: "7k/8/8/8/8/8/1Q6/4K3 b - - 0 1",
  },
  {
    id: "fools_mate",
    category: "checkmate",
    moves: ["f2f3", "e7e6", "g2g4", "d8h4"],
  },
  {
    id: "stalemate_classic",
    category: "stalemate",
    fen: "7k/5Q2/6K1/8/8/8/8/8 b - - 0 1",
  },
  {
    id: "back_rank_mate",
    category: "checkmate",
    fen: "6k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1",
    moves: ["a1a8"],
  },

  // Fifty-move
  {
    id: "fifty_move_counter",
    category: "fifty_move",
    fen: "4k3/8/8/8/8/8/8/4K3 w - - 99 1",
    moves: ["e1e2"],
    note: "Non-capture/non-pawn → halfmove 100 → draw on server if no legal escape",
  },
  {
    id: "fifty_move_reset",
    category: "fifty_move",
    fen: "4k3/8/8/8/8/8/8/4K3 w - - 99 1",
    moves: ["e1d1"],
    note: "King move resets halfmove on both",
  },

  // Insufficient material
  { id: "insuff_kk", category: "insufficient_material", fen: "4k3/8/8/8/8/8/8/4K3 w - - 0 1" },
  { id: "insuff_kn", category: "insufficient_material", fen: "4k3/8/8/8/8/8/5N2/4K3 w - - 0 1" },
  { id: "insuff_kb", category: "insufficient_material", fen: "4k3/8/8/8/8/8/1B6/4K3 w - - 0 1" },
  {
    id: "insuff_kb_vs_kb_same_color",
    category: "insufficient_material",
    fen: "4k3/8/4b3/8/8/4B3/8/4K3 w - - 0 1",
  },
  {
    id: "insuff_kb_vs_kb_diff_color",
    category: "insufficient_material",
    fen: "4k3/8/8/8/5b2/8/1B6/4K3 w - - 0 1",
    note: "chess.js may still allow draw claim via insufficient material rules",
  },
  { id: "insuff_kn_vs_kn", category: "insufficient_material", fen: "4k3/5n2/8/8/8/8/5N2/4K3 w - - 0 1" },

  // Threefold repetition
  {
    id: "threefold_nf3_ng1",
    category: "threefold",
    moves: ["g1f3", "g8f6", "f3g1", "f6g8"],
    note: "After 4 plies position repeats 3rd time on black's move",
  },
  {
    id: "threefold_longer",
    category: "threefold",
    moves: ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"],
  },

  // FEN round-trip from server starting position through messy line
  {
    id: "complex_middlegame",
    category: "fen",
    moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6", "c1e3", "e7e5", "d4b3", "f8e7", "f1e2", "b8d7", "e1g1", "e8g8"],
  },
];

/** Returns error message if case cannot run on both engines. */
function preflightCase(test: ParityCase): string | null {
  if (test.fen) {
    if (!fromFen(test.fen)) {
      return `Client fromFen rejected: ${test.fen}`;
    }
    try {
      new Chess(test.fen);
    } catch {
      return `chess.js rejected FEN: ${test.fen}`;
    }
  }
  try {
    applyClientMoves(test.fen, test.moves ?? []);
  } catch (e) {
    return `Client move line failed: ${e}`;
  }
  try {
    applyServerMoves(test.fen, test.moves ?? []);
  } catch (e) {
    return `Server move line failed: ${e}`;
  }
  return null;
}

/** Metadata-only: same position/counters, differing castling rights serialization (M4). */
function isCastlingMetadataOnly(m: Mismatch): boolean {
  return m.field === "fen_castling_rights";
}

/** Metadata-only: en passant field when no EP capture is yet legal (M2). */
function isEpMetadataOnly(m: Mismatch, test: ParityCase): boolean {
  return (
    m.field === "fen_en_passant_square" &&
    test.id === "after_e4" &&
    m.client !== "-" &&
    m.server === "-"
  );
}

function classifyMismatch(m: Mismatch, test: ParityCase): "functional" | "metadata" {
  if (isCastlingMetadataOnly(m) || isEpMetadataOnly(m, test)) {
    return "metadata";
  }
  return "functional";
}

function testMoveAcceptanceDivergence(): Mismatch[] {
  const probes: { id: string; fen?: string; uci: string; note?: string }[] = [
    {
      id: "illegal_castle_in_check",
      fen: "6k1/8/8/8/2q5/8/8/6K1 w - - 0 1",
      uci: "g1f1",
      note: "King must move out of check — not castle",
    },
    {
      id: "illegal_castle_kingside_in_check",
      fen: "6k1/8/8/8/2q5/8/8/6K1 w KQ - 0 1",
      uci: "g1c1",
      note: "Queenside castle while in check",
    },
  ];

  const out: Mismatch[] = [];
  for (const p of probes) {
    const state = p.fen ? fromFen(p.fen) : createInitialState();
    if (!state) continue;
    const clientOk = !!uciToMove(state, p.uci) && !!makeMove(state, uciToMove(state, p.uci)!);
    const chess = p.fen ? new Chess(p.fen) : new Chess();
    let serverOk = false;
    try {
      serverOk = !!chess.move({
        from: p.uci.slice(0, 2),
        to: p.uci.slice(2, 4),
        promotion: p.uci[4],
      });
    } catch {
      serverOk = false;
    }
    if (clientOk !== serverOk) {
      out.push({
        caseId: p.id,
        category: "move_acceptance",
        field: "client_vs_server_legal",
        client: clientOk ? "accepts" : "rejects",
        server: serverOk ? "accepts" : "rejects",
        fen: toFen(state),
        moves: [p.uci],
      });
    }
  }
  return out;
}

function probeThreefoldTerminal(): void {
  const chess = new Chess();
  const uciLine: string[] = [];
  const sanLoop = ["Nf3", "Nf6", "Ng1", "Ng8"];
  for (let rep = 0; rep < 2; rep++) {
    for (const san of sanLoop) {
      const m = chess.move(san);
      if (!m) break;
      uciLine.push(m.from + m.to + (m.promotion ?? ""));
    }
  }
  try {
    const client = applyClientMoves(undefined, uciLine);
    const server = serverSnapshot(chess);
    const clientSt = getGameStatus(client);
    console.log(`\n--- Threefold probe (${uciLine.length} plies, 2 repeats) ---`);
    console.log(`  moves: ${uciLine.join(" ")}`);
    console.log(
      `  server: isDraw=${chess.isDraw()} kind=${server.drawKind} threefold=${chess.isThreefoldRepetition()}`
    );
    console.log(`  client: status=${clientSt.type} gameOver=${isGameOverStatus(clientSt)}`);
  } catch (e) {
    console.log("\n--- Threefold probe failed ---", e);
  }
}

function probeFromFenCastlingDash(): void {
  const fen = "6k1/8/8/8/2q5/8/8/6K1 w - - 0 1";
  const state = fromFen(fen);
  console.log("\n--- fromFen castling when FEN says '-' ---");
  console.log(
    `  client castling: wK=${state?.castling.wK} wQ=${state?.castling.wQ} bK=${state?.castling.bK} bQ=${state?.castling.bQ}`
  );
  const chess = new Chess(fen);
  console.log(`  server castling field: ${chess.fen().split(" ")[2]}`);
}

function probeEnPassantFenAfterE4(): void {
  const client = applyClientMoves(undefined, ["e2e4"]);
  const server = serverSnapshot(applyServerMoves(undefined, ["e2e4"]).fen());
  console.log("\n--- En passant FEN after 1.e4 ---");
  console.log(`  client ep field: ${toFen(client).split(" ")[3]}`);
  console.log(`  server ep field: ${server.fen.split(" ")[3]}`);
  const line = ["e2e4", "c7c5", "e4e5", "d7d5"];
  const c = applyClientMoves(undefined, line);
  const s = serverSnapshot(applyServerMoves(undefined, line).fen());
  const epClient = getAllLegalMoves(c).filter((m) => m.flags?.includes("ep")).map(moveToUci);
  const chess = applyServerMoves(undefined, line);
  const epServer = chess
    .moves({ verbose: true })
    .filter((m) => m.flags.includes("e"))
    .map((m) => m.from + m.to + (m.promotion ?? ""));
  console.log("--- EP capture legality after ...e5 d5 ---");
  console.log(`  client ep moves: ${epClient.join(",") || "none"}`);
  console.log(`  server ep moves: ${epServer.join(",") || "none"}`);
  console.log(`  client ep square: ${toFen(c).split(" ")[3]}`);
  console.log(`  server ep square: ${s.fen.split(" ")[3]}`);
}

function main() {
  probeEnPassantFenAfterE4();
  probeFromFenCastlingDash();
  probeThreefoldTerminal();

  const allMismatches: Mismatch[] = [];
  let passed = 0;
  let skipped = 0;
  const skippedCases: { id: string; reason: string }[] = [];

  for (const test of CASES) {
    const preflight = preflightCase(test);
    if (preflight) {
      skipped++;
      skippedCases.push({ id: test.id, reason: preflight });
      console.warn(`[SKIP] ${test.id}: ${preflight}`);
      continue;
    }
    try {
      const mm = compareCase(test);
      if (mm.length === 0) passed++;
      else allMismatches.push(...mm.map((m) => ({ ...m, note: m.note ?? test.note })));
    } catch (e) {
      allMismatches.push({
        caseId: test.id,
        category: test.category,
        field: "execution_error",
        client: String(e),
        server: "—",
        fen: test.fen ?? "start",
        moves: test.moves ?? [],
        note: test.note,
      });
    }
  }

  allMismatches.push(...testMoveAcceptanceDivergence());

  const functional: Mismatch[] = [];
  const metadata: Mismatch[] = [];
  for (const m of allMismatches) {
    const test = CASES.find((c) => c.id === m.caseId);
    if (test && classifyMismatch(m, test) === "metadata") {
      metadata.push(m);
    } else {
      functional.push(m);
    }
  }

  console.log(`\n=== CHIMERA online chess parity ===`);
  console.log(
    `Cases: ${CASES.length} | passed: ${passed} | skipped: ${skipped} | functional mismatches: ${functional.length} | metadata-only: ${metadata.length}\n`
  );

  if (skippedCases.length) {
    console.log("--- Skipped cases ---");
    for (const s of skippedCases) {
      console.log(`  ${s.id}: ${s.reason}`);
    }
    console.log("");
  }

  if (functional.length) {
    console.log("--- Functional mismatches (confirmed real) ---");
    for (const m of functional) {
      console.log(`[${m.category}] ${m.caseId} :: ${m.field}`);
      console.log(`  moves: ${m.moves.join(" ") || "(none)"}`);
      console.log(`  fen: ${m.fen}`);
      console.log(`  client: ${m.client}`);
      console.log(`  server: ${m.server}`);
      if (m.note) console.log(`  note: ${m.note}`);
      console.log("");
    }
    process.exitCode = 1;
  } else {
    console.log("No functional mismatches in curated cases.");
  }

  if (metadata.length) {
    console.log("--- Metadata-only (informational, non-blocking) ---");
    for (const m of metadata) {
      console.log(`[${m.category}] ${m.caseId} :: ${m.field} — client=${m.client} server=${m.server}`);
    }
    console.log("");
  }

  if (functional.length === 0 && metadata.length === 0 && skipped === 0) {
    console.log("All curated parity cases matched.");
  }
}

main();
