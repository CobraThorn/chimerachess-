import { fromFen, makeMove, toFen, uciToMove } from "../chess";
import { evalFromResult } from "../engine/analysis";
import {
  categoryFromCpLoss,
  userCpFromWhite,
} from "../review/classifyMove";
import type { StockfishEngine } from "../engine/stockfish";
import { getEvaluation, searchPosition } from "../engine/stockfish";
import type { MistakeCategory, MistakeRecord } from "./types";

export interface UserMoveEngineGrade {
  cpLoss: number;
  playedBest: boolean;
  bestUci: string;
  secondBestUci?: string;
  category: MistakeCategory | null;
  evalBeforeCpWhite: number;
  evalAfterCpWhite: number;
  userEvalBeforeCp: number;
}

/**
 * Centipawn loss from the user's perspective — one root search, then at most one leaf eval.
 */
export async function computeUserMoveCpLoss(
  engine: StockfishEngine,
  fenBefore: string,
  fenAfter: string,
  playedUci: string,
  userColor: "w" | "b",
  depth: number
): Promise<UserMoveEngineGrade | null> {
  const stmBefore = fenBefore.split(" ")[1];
  if (stmBefore !== userColor) return null;

  const stateBefore = fromFen(fenBefore);
  if (!stateBefore) return null;

  engine.stop();
  const root = await searchPosition(engine, fenBefore, depth, 2);
  const before = evalFromResult(fenBefore, root.eval);
  const userBefore = userCpFromWhite(before.cpWhite, userColor);

  const top = root.topMoves[0];
  const second = root.topMoves[1];
  const playedBest = top?.move === playedUci;
  const bestUci = top?.move ?? playedUci;

  if (playedBest) {
    return {
      cpLoss: 0,
      playedBest: true,
      bestUci,
      secondBestUci: second?.move,
      category: null,
      evalBeforeCpWhite: before.cpWhite,
      evalAfterCpWhite: before.cpWhite,
      userEvalBeforeCp: userBefore,
    };
  }

  let cpLoss = 0;
  let evalAfterCpWhite = before.cpWhite;

  const bestMove = uciToMove(stateBefore, bestUci);
  if (bestMove) {
    const afterBestState = makeMove(stateBefore, bestMove);
    if (afterBestState) {
      const fenAfterBest = toFen(afterBestState);
      engine.stop();
      const afterBest = await getEvaluation(engine, fenAfterBest, depth);
      const { cpWhite } = evalFromResult(fenAfterBest, afterBest);
      evalAfterCpWhite = cpWhite;
      const userAfterBest = userCpFromWhite(cpWhite, userColor);
      cpLoss = Math.round(Math.max(0, userBefore - userAfterBest));
    }
  }

  if (before.isMate) {
    engine.stop();
    const afterPlayed = await getEvaluation(engine, fenAfter, depth);
    const after = evalFromResult(fenAfter, afterPlayed);
    evalAfterCpWhite = after.cpWhite;
    if (!after.isMate) cpLoss = Math.max(cpLoss, 900);
  }

  return {
    cpLoss,
    playedBest: false,
    bestUci,
    secondBestUci: second?.move,
    category: categoryFromCpLoss(cpLoss),
    evalBeforeCpWhite: before.cpWhite,
    evalAfterCpWhite,
    userEvalBeforeCp: userBefore,
  };
}

export async function analyzeUserMove(
  engine: StockfishEngine,
  fenBefore: string,
  fenAfter: string,
  playedUci: string,
  userColor: "w" | "b",
  depth = 10
): Promise<MistakeRecord | null> {
  const graded = await computeUserMoveCpLoss(
    engine,
    fenBefore,
    fenAfter,
    playedUci,
    userColor,
    depth
  );
  if (!graded?.category) return null;

  return {
    fenBefore,
    played: playedUci,
    best: graded.bestUci,
    cpLoss: graded.cpLoss,
    category: graded.category,
    at: Date.now(),
  };
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
  return computeUserMoveCpLoss(
    engine,
    fenBefore,
    fenAfter,
    playedUci,
    userColor,
    depth
  );
}

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
