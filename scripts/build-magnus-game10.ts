import { Chess } from "chess.js";
import { writeFileSync, readFileSync } from "fs";
import { findBookMove, applyUciLine } from "../src/chess/openingBook";
import { makeMove } from "../src/chess/game";

/** Carlsen–Karjakin, WCh 2016 game 10 (anti-Berlin), through 57.b5! */
const SAN = `
e4 e5 Nf3 Nc6 Bb5 Nf6 d3 Bc5 c3 O-O Bg5 h6 Bh4 Be7 O-O d6 Nbd2 Nh5
Bxe7 Qxe7 Nc4 Nf4 Ne3 Qf6 g3 Nh3+ Kh1 Ne7 Bc4 c6 Bb3 Ng6 Qe2 a5 a4 Be6
Bxe6 fxe6 Nd2 d5 Qh5 Ng5 h4 Nf3 Nxf3 Qxf3+ Qxf3 Rxf3 Kg2 Rf7 Rfe1 h5 Nf1 Kf8
Nd2 Ke7 Re2 Kd6 Nf3 Raf8 Ng5 Re7 Rae1 Rfe8 Nf3 Nh8 d4 exd4 Nxd4 g6 Re3 Nf7
e5+ Kd7 Rf3 Nh6 Rf6 Rg7 b4 axb4 cxb4 Ng8 Rf3 Nh6 a5 Nf5 Nb3 Kc7 Nc5 Kb8 Rb1 Ka7
Rd3 Rc7 Ra3 Nd4 Rd1 Nf5 Kh3 Nh6 f3 Rf7 Rd4 Nf5 Rd2 Rh7 Rb3 Ree7 Rdd3 Rh8 Rb1 Rhh7 b5
`.trim().split(/\s+/);

const chess = new Chess();
const uci: string[] = [];

for (const san of SAN) {
  const m = chess.move(san);
  if (!m) {
    console.error("Illegal SAN:", san, chess.fen());
    process.exit(1);
  }
  uci.push(m.from + m.to + (m.promotion ?? ""));
}

let state = applyUciLine([]);
for (let i = 0; i < uci.length; i++) {
  const move = findBookMove(state, uci[i]!);
  if (!move) {
    console.error("CHIMERA engine rejects", i, uci[i], state);
    process.exit(1);
  }
  state = makeMove(state, move)!;
}

const games = JSON.parse(
  readFileSync("src/content/legendGames.json", "utf8")
) as Record<string, string[]>;
games.magnus = uci;
writeFileSync("src/content/legendGames.json", JSON.stringify(games, null, 2) + "\n");

console.log("magnus UCI count:", uci.length);
console.log("highlight ply (57.b5):", uci.length - 1);
