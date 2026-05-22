import { createInitialState, makeMove, toFen, uciToMove } from "../src/chess";
import { OPENING_LINES } from "../src/content/openings";

let failed = 0;
for (const opening of OPENING_LINES) {
  let s = createInitialState();
  for (let i = 0; i < opening.moves.length; i++) {
    const uci = opening.moves[i];
    const m = uciToMove(s, uci);
    if (!m) {
      console.error(
        `FAIL ${opening.id} ply ${i + 1} ${uci} — not legal at ${toFen(s)}`
      );
      failed++;
      break;
    }
    const next = makeMove(s, m);
    if (!next) {
      console.error(`FAIL ${opening.id} ply ${i + 1} ${uci} — makeMove failed`);
      failed++;
      break;
    }
    s = next;
  }
  if (failed === 0) console.log(`OK ${opening.id}`);
}

process.exit(failed ? 1 : 0);
