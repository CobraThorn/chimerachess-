import type { StockfishEngine } from "../engine/stockfish";
import { getEvaluation, getTopMoves } from "../engine/stockfish";
import type { MistakeCategory, MistakeRecord } from "./types";

function classify(cpLoss: number): MistakeCategory | null {
  if (cpLoss >= 500) return "blunder";
  if (cpLoss >= 200) return "mistake";
  if (cpLoss >= 80) return "inaccuracy";
  return null;
}

/**
 * Compare eval before/after the user's move (user's POV).
 */
export async function analyzeUserMove(
  engine: StockfishEngine,
  fenBefore: string,
  fenAfter: string,
  playedUci: string,
  userColor: "w" | "b",
  depth = 8
): Promise<MistakeRecord | null> {
  const stmBefore = fenBefore.split(" ")[1];
  if (stmBefore !== userColor) return null;

  const [evalBefore, evalAfter, topBefore] = await Promise.all([
    getEvaluation(engine, fenBefore, depth),
    getEvaluation(engine, fenAfter, depth),
    getTopMoves(engine, fenBefore, Math.min(depth, 6), 1).then((t) => t[0]),
  ]);

  const userEvalBefore = evalBefore.cp;
  const userEvalAfter = -evalAfter.cp;

  let cpLoss = userEvalBefore - userEvalAfter;
  if (evalBefore.isMate && !evalAfter.isMate) cpLoss = Math.max(cpLoss, 900);
  if (topBefore && topBefore.move !== playedUci) {
    cpLoss = Math.max(cpLoss, Math.max(0, userEvalBefore - topBefore.cp));
  }

  const category = classify(cpLoss);
  if (!category) return null;

  return {
    fenBefore,
    played: playedUci,
    best: topBefore?.move ?? playedUci,
    cpLoss: Math.round(cpLoss),
    category,
    at: Date.now(),
  };
}

/** Let game-end persistence wait for in-flight per-move analyses */
export async function waitForPendingMistakeAnalyses(
  getPendingCount: () => number,
  maxWaitMs = 2800,
  pollMs = 40
): Promise<void> {
  const deadline = Date.now() + maxWaitMs;
  while (getPendingCount() > 0 && Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, pollMs));
  }
}
