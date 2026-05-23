import { evalFromResult } from "../engine/analysis";
import type { StockfishEngine } from "../engine/stockfish";
import { getEvaluation, getTopMoves } from "../engine/stockfish";
import type { MistakeCategory, MistakeRecord } from "./types";

function classify(cpLoss: number): MistakeCategory | null {
  if (cpLoss >= 500) return "blunder";
  if (cpLoss >= 200) return "mistake";
  if (cpLoss >= 80) return "inaccuracy";
  return null;
}

function cpLossFromEvals(
  evalBeforeCp: number,
  evalAfterCp: number,
  evalBeforeMate: boolean,
  evalAfterMate: boolean,
  playedUci: string,
  topMove: string | undefined,
  topCp: number | undefined
): number {
  const userEvalBefore = evalBeforeCp;
  const userEvalAfter = -evalAfterCp;

  let cpLoss = userEvalBefore - userEvalAfter;
  if (evalBeforeMate && !evalAfterMate) cpLoss = Math.max(cpLoss, 900);
  if (topMove && topMove !== playedUci) {
    cpLoss = Math.max(cpLoss, Math.max(0, userEvalBefore - (topCp ?? 0)));
  }
  return Math.round(cpLoss);
}

/**
 * Compare eval before/after the user's move (user's POV).
 * Stockfish uses a single UCI queue — never run parallel engine calls.
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

  engine.stop();
  const evalBefore = await getEvaluation(engine, fenBefore, depth);
  engine.stop();
  const evalAfter = await getEvaluation(engine, fenAfter, depth);
  engine.stop();
  const topMoves = await getTopMoves(engine, fenBefore, Math.min(depth, 12), 1);
  const topBefore = topMoves[0];

  const cpLoss = cpLossFromEvals(
    evalBefore.cp,
    evalAfter.cp,
    evalBefore.isMate,
    evalAfter.isMate,
    playedUci,
    topBefore?.move,
    topBefore?.cp
  );

  const category = classify(cpLoss);
  if (!category) return null;

  return {
    fenBefore,
    played: playedUci,
    best: topBefore?.move ?? playedUci,
    cpLoss,
    category,
    at: Date.now(),
  };
}

export interface UserMoveEngineGrade {
  cpLoss: number;
  playedBest: boolean;
  bestUci: string;
  category: MistakeCategory | null;
  evalBeforeCpWhite: number;
  evalAfterCpWhite: number;
}

/** One serial Stockfish pass per user move — used by post-game review. */
export async function gradeUserMoveForReview(
  engine: StockfishEngine,
  fenBefore: string,
  fenAfter: string,
  playedUci: string,
  userColor: "w" | "b",
  depth: number
): Promise<UserMoveEngineGrade | null> {
  const stmBefore = fenBefore.split(" ")[1];
  if (stmBefore !== userColor) return null;

  engine.stop();
  const evalBefore = await getEvaluation(engine, fenBefore, depth);
  engine.stop();
  const topMoves = await getTopMoves(engine, fenBefore, Math.min(depth, 12), 3);
  const top = topMoves[0];
  engine.stop();
  const evalAfter = await getEvaluation(engine, fenAfter, depth);

  const cpLoss = cpLossFromEvals(
    evalBefore.cp,
    evalAfter.cp,
    evalBefore.isMate,
    evalAfter.isMate,
    playedUci,
    top?.move,
    top?.cp
  );

  const beforeW = evalFromResult(fenBefore, evalBefore).cpWhite;
  const afterW = evalFromResult(fenAfter, evalAfter).cpWhite;

  return {
    cpLoss,
    playedBest: top?.move === playedUci,
    bestUci: top?.move ?? playedUci,
    category: classify(cpLoss),
    evalBeforeCpWhite: beforeW,
    evalAfterCpWhite: afterW,
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
