import { fromFen, makeMove, toFen, uciToMove } from "../chess";
import type { Color, GameState } from "../chess/types";
import { countMaterial } from "../chess/board";
import { evalFromResult } from "../engine/analysis";
import {
  categoryFromCpLoss,
  userCpFromWhite,
} from "../review/classifyMove";
import type { StockfishEngine } from "../engine/stockfish";
import { getEvaluation, searchPosition } from "../engine/stockfish";
import type { MistakeCategory, MistakeRecord } from "./types";

/** Engine-best or within this many cp of the best line (Chess.com-style). */
const NEAR_BEST_CP = 10;

export interface UserMoveEngineGrade {
  cpLoss: number;
  playedBest: boolean;
  brilliantCandidate: boolean;
  bestUci: string;
  secondBestUci?: string;
  category: MistakeCategory | null;
  evalBeforeCpWhite: number;
  evalAfterCpWhite: number;
  userEvalBeforeCp: number;
}

function detectBrilliant(input: {
  stateBefore: GameState;
  playedUci: string;
  userColor: Color;
  userBefore: number;
  userAfterPlayed: number;
  cpLoss: number;
  playedBest: boolean;
  top?: { move: string; cp: number };
  second?: { move: string; cp: number };
}): boolean {
  const {
    stateBefore,
    playedUci,
    userColor,
    userBefore,
    userAfterPlayed,
    cpLoss,
    playedBest,
    top,
    second,
  } = input;

  if (!playedBest || cpLoss > NEAR_BEST_CP) return false;

  if (top && second) {
    const userTop = userCpFromWhite(top.cp, userColor);
    const userSecond = userCpFromWhite(second.cp, userColor);
    if (userTop - userSecond >= 200) return true;
  }

  const played = uciToMove(stateBefore, playedUci);
  if (!played) return false;
  const afterState = makeMove(stateBefore, played);
  if (!afterState) return false;

  const matBefore = countMaterial(stateBefore);
  const matAfter = countMaterial(afterState);
  const userMatBefore = userColor === "w" ? matBefore.w : matBefore.b;
  const userMatAfter = userColor === "w" ? matAfter.w : matAfter.b;
  const materialLost = userMatBefore - userMatAfter;
  if (materialLost >= 1 && userAfterPlayed >= userBefore - 40) return true;

  return false;
}

/**
 * Centipawn loss from the user's perspective: eval after best line minus eval after played line.
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
  const bestUci = top?.move ?? playedUci;

  engine.stop();
  const afterPlayedEval = await getEvaluation(engine, fenAfter, depth);
  const afterPlayed = evalFromResult(fenAfter, afterPlayedEval);
  const evalAfterCpWhite = afterPlayed.cpWhite;
  const userAfterPlayed = userCpFromWhite(evalAfterCpWhite, userColor);

  let userAfterBest = userBefore;
  const bestMove = uciToMove(stateBefore, bestUci);
  if (bestMove) {
    const afterBestState = makeMove(stateBefore, bestMove);
    if (afterBestState) {
      const fenAfterBest = toFen(afterBestState);
      engine.stop();
      const afterBest = await getEvaluation(engine, fenAfterBest, depth);
      const { cpWhite } = evalFromResult(fenAfterBest, afterBest);
      userAfterBest = userCpFromWhite(cpWhite, userColor);
    }
  }

  let cpLoss = Math.round(Math.max(0, userAfterBest - userAfterPlayed));

  if (before.isMate && !afterPlayed.isMate) {
    cpLoss = Math.max(cpLoss, 900);
  }

  const exactBest = top?.move === playedUci;
  const playedBest = exactBest || cpLoss <= NEAR_BEST_CP;
  const brilliantCandidate = detectBrilliant({
    stateBefore,
    playedUci,
    userColor,
    userBefore,
    userAfterPlayed,
    cpLoss,
    playedBest,
    top,
    second,
  });

  return {
    cpLoss,
    playedBest,
    brilliantCandidate,
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
