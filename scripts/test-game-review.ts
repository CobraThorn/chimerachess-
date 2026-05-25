/**
 * Headless smoke test for post-game review pipeline.
 * Run: npx tsx scripts/test-game-review.ts
 */
import { createStockfishEngine } from "../src/engine/stockfish.ts";
import { buildGameReview } from "../src/review/buildGameReview.ts";
import type { GameReviewInput } from "../src/review/types.ts";
import type { GameMoveRecord } from "../src/ai/types.ts";

const moves: GameMoveRecord[] = [
  { uci: "e2e4", fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1", by: "user", san: "e4" },
  { uci: "e7e5", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2", by: "chimera", san: "e5" },
  { uci: "g1f3", fen: "rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2", by: "user", san: "Nf3" },
  { uci: "b8c6", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3", by: "chimera", san: "Nc6" },
];

const input: GameReviewInput = {
  id: "test-review",
  mode: "chimera",
  opponentLabel: "CHIMERA",
  userColor: "w",
  result: "user-win",
  startedAt: Date.now() - 60_000,
  endedAt: Date.now(),
  moves,
};

async function waitReady(engine: ReturnType<typeof createStockfishEngine>, ms = 25_000) {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    if (engine.ready) return true;
    if (engine.loadFailed) return false;
    await new Promise((r) => setTimeout(r, 80));
  }
  return false;
}

async function main() {
  console.log("[test] Creating Stockfish worker…");
  const engine = createStockfishEngine();
  const ok = await waitReady(engine);
  if (!ok) {
    console.error("[test] STOCKFISH LOAD FAILED");
    process.exit(1);
  }
  console.log("[test] Stockfish ready ✓");

  try {
    const report = await buildGameReview(engine, input, (p) => {
      console.log(`[test] progress ${p.step}/${p.total} — ${p.label}`);
    });
    console.log("[test] REVIEW OK");
    console.log({
      userMoves: report.userMoves.length,
      accuracy: report.accuracy,
      blunders: report.blunders,
      evalPoints: report.evalTimeline.length,
      recapSteps: report.recapSteps.length,
    });
    if (report.userMoves.length < 1) {
      console.error("[test] FAIL: no user moves graded");
      process.exit(1);
    }
  } catch (e) {
    console.error("[test] REVIEW THREW", e);
    process.exit(1);
  } finally {
    engine.quit();
  }
}

void main();
