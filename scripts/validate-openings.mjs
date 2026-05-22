/**
 * Validates all opening UCI lines against the chess engine.
 * Run: node scripts/validate-openings.mjs
 */
import { readFileSync } from "fs";
import { pathToFileURL } from "url";

// Dynamic import compiled chess — use vite-node alternative: inline minimal validation via spawning tsc output
// Instead import from dist if present; fallback: parse and run via child process with tsx

const OPENINGS = [
  ["italian", ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"]],
  ["ruy-lopez", ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"]],
  ["sicilian-najdorf", ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"]],
  ["queens-gambit", ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3"]],
  ["kings-indian", ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6"]],
  ["french", ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6"]],
  ["london", ["d2d4", "d7d5", "c1f4", "g8f6", "e2e3"]],
  ["caro-kann", ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4"]],
  ["scandinavian", ["e2e4", "d7d5", "e4d5", "d8d5", "b1c3"]],
  ["english", ["c2c4", "e7e5", "b1c3", "g8f6", "g2g3"]],
];

async function main() {
  const chessUrl = pathToFileURL(
    new URL("../dist-validate/chess-bundle.js", import.meta.url)
  ).href;
  let chess;
  try {
    chess = await import(chessUrl);
  } catch {
    console.error("Run: npx --yes tsx scripts/validate-openings.ts");
    process.exit(1);
  }
  const { createInitialState, makeMove, uciToMove, toFen } = chess;
  let failed = 0;
  for (const [id, moves] of OPENINGS) {
    let s = createInitialState();
    for (let i = 0; i < moves.length; i++) {
      const uci = moves[i];
      const m = uciToMove(s, uci);
      if (!m) {
        console.error(`FAIL ${id} move ${i + 1} (${uci}) illegal at ${toFen(s)}`);
        failed++;
        break;
      }
      const next = makeMove(s, m);
      if (!next) {
        console.error(`FAIL ${id} move ${i + 1} (${uci}) makeMove null`);
        failed++;
        break;
      }
      s = next;
    }
    if (!failed) console.log(`OK ${id}`);
  }
  process.exit(failed ? 1 : 0);
}

main();
