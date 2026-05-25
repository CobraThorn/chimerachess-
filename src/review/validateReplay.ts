import type { GameMoveRecord } from "../ai/types";
import { createInitialState, makeMove, uciToMove } from "../chess";
import { reviewDiag } from "./reviewDiagnostics";

/** Ensure stored moves replay legally before spending engine time. */
export function assertReplayableMoves(moves: GameMoveRecord[]): void {
  let state = createInitialState();
  for (let i = 0; i < moves.length; i++) {
    const rec = moves[i]!;
    const move = uciToMove(state, rec.uci);
    if (!move) {
      reviewDiag("error", { ply: i + 1, uci: rec.uci, reason: "illegal_uci" });
      throw new Error(
        `This game could not be replayed (illegal move at ply ${i + 1}). Start a new game and try again.`
      );
    }
    const next = makeMove(state, move);
    if (!next) {
      reviewDiag("error", { ply: i + 1, uci: rec.uci, reason: "apply_failed" });
      throw new Error(
        `This game could not be replayed (move ${i + 1} failed). Start a new game and try again.`
      );
    }
    state = next;
  }
}
