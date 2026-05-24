import { createInitialState, formatMove, makeMove } from "../../chess";
import type { Color, GameState, Move } from "../../chess";
import { findBookMove } from "../../chess/openingBook";
import { toFen } from "../../chess/fen";

export interface LegendReplayStep {
  ply: number;
  fen: string;
  moveLabel: string;
  lastMove: Move | null;
}

export function stateAtLegendPly(
  moves: string[],
  ply: number
): { state: GameState; lastMove: Move | null; fen: string } {
  let state = createInitialState();
  let lastMove: Move | null = null;
  const capped = Math.max(0, Math.min(ply, moves.length));

  for (let i = 0; i < capped; i++) {
    const move = findBookMove(state, moves[i]);
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

export function buildLegendReplaySteps(moves: string[]): LegendReplayStep[] {
  const steps: LegendReplayStep[] = [
    {
      ply: 0,
      fen: toFen(createInitialState()),
      moveLabel: "Start",
      lastMove: null,
    },
  ];

  let state = createInitialState();
  for (let i = 0; i < moves.length; i++) {
    const parsed = findBookMove(state, moves[i]);
    if (!parsed) break;
    const next = makeMove(state, parsed);
    if (!next) break;
    const moveNum = Math.floor(i / 2) + 1;
    const isWhite = i % 2 === 0;
    const san = formatMove(state, parsed);
    steps.push({
      ply: i + 1,
      fen: toFen(next),
      moveLabel: `${moveNum}${isWhite ? "." : "…"} ${san}`,
      lastMove: parsed,
    });
    state = next;
  }

  return steps;
}

export function legendMoverAtPly(ply: number): Color | null {
  if (ply <= 0) return null;
  return ply % 2 === 1 ? "w" : "b";
}
