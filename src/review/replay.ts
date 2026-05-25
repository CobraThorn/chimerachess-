import { createInitialState, makeMove, uciToMove } from "../chess";
import type { GameState, Move } from "../chess";
import { toFen } from "../chess/fen";
import type { GameMoveRecord } from "../ai/types";
import type { ReviewRecapStep } from "./types";

export function stateAtPly(
  moves: GameMoveRecord[],
  ply: number
): { state: GameState; lastMove: Move | null; fen: string } {
  let state = createInitialState();
  let lastMove: Move | null = null;
  const capped = Math.max(0, Math.min(ply, moves.length));

  for (let i = 0; i < capped; i++) {
    const rec = moves[i];
    const move = uciToMove(state, rec.uci);
    if (!move) break;
    const next = makeMove(state, move);
    if (!next) break;
    lastMove = move;
    state = next;
  }

  return {
    state,
    lastMove,
    fen: toFen(state),
  };
}

export function buildRecapSteps(moves: GameMoveRecord[]): ReviewRecapStep[] {
  const steps: ReviewRecapStep[] = [
    {
      ply: 0,
      fen: toFen(createInitialState()),
      moveLabel: "Start",
      mover: null,
    },
  ];

  for (let i = 0; i < moves.length; i++) {
    const m = moves[i];
    const moveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    steps.push({
      ply: i + 1,
      fen: m.fen,
      moveLabel: `${moveNum}${isWhite ? "." : "…"} ${m.san ?? m.uci}`,
      mover: m.by,
      uci: m.uci,
      san: m.san,
    });
  }

  return steps;
}
