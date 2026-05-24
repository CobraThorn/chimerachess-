import { fromFen, makeMove, toFen, uciToMove } from "../chess";
import { evalFromResult } from "../engine/analysis";
import {
  categoryFromCpLoss,
  userCpFromWhite,
} from "../review/classifyMove";
import type { StockfishEngine } from "../engine/stockfish";
import { getEvaluation, getTopMoves } from "../engine/stockfish";
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

async function evalUserCp(
  engine: StockfishEngine,
  fen: string,
  depth: number
): Promise<{ cpWhite: number; isMate: boolean; mateIn?: number }> {
  engine.stop();
  const res = await getEvaluation(engine, fen, depth);
  const { cpWhite, isMate, mateIn } = evalFromResult(fen, res);
  return { cpWhite, isMate, mateIn };
}

/**
 * Centipawn loss from the user's perspective — compares played line vs engine best line.
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

  const before = await evalUserCp(engine, fenBefore, depth);
  const userBefore = userCpFromWhite(before.cpWhite, userColor);

  engine.stop();
  const topMoves = await getTopMoves(engine, fenBefore, depth, 3);
  const top = topMoves[0];
  const second = topMoves[1];

  const after = await evalUserCp(engine, fenAfter, depth);
  const userAfter = userCpFromWhite(after.cpWhite, userColor);

  let cpLoss = Math.round(Math.max(0, userBefore - userAfter));
  if (before.isMate && !after.isMate) cpLoss = Math.max(cpLoss, 900);

  const playedBest = top?.move === playedUci;
  const bestUci = top?.move ?? playedUci;

  if (!playedBest && top?.move) {
    const bestMove = uciToMove(stateBefore, top.move);
    if (bestMove) {
      const afterBestState = makeMove(stateBefore, bestMove);
      if (afterBestState) {
        const fenAfterBest = toFen(afterBestState);
        const afterBest = await evalUserCp(engine, fenAfterBest, depth);
        const userAfterBest = userCpFromWhite(afterBest.cpWhite, userColor);
        cpLoss = Math.max(
          cpLoss,
          Math.round(Math.max(0, userBefore - userAfterBest))
        );
      }
    }
  }

  return {
    cpLoss,
    playedBest,
    bestUci,
    secondBestUci: second?.move,
    category: categoryFromCpLoss(cpLoss),
    evalBeforeCpWhite: before.cpWhite,
    evalAfterCpWhite: after.cpWhite,
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
