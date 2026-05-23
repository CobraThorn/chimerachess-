import type { GameState } from "../../chess";
import { getAllLegalMoves, moveToUci } from "../../chess";
import { toFen } from "../../chess/fen";
import type { StockfishEngine } from "../../engine/stockfish";
import { getTopMoves } from "../../engine/stockfish";
import type { ChimeraMemory } from "../types";
import { getTopPatterns } from "../memory";
import { ensureLearning } from "./learn";
import type { CounterStyleId, LearningPlayBias } from "./types";

export function learningIsActive(memory: ChimeraMemory): boolean {
  const L = ensureLearning(memory);
  return L.adaptationCycles >= 1;
}

export function learningPlayBias(memory: ChimeraMemory): LearningPlayBias {
  const L = ensureLearning(memory);
  const active = learningIsActive(memory);
  const boost = active
    ? Math.min(0.35, L.adaptationScore * 0.004 + L.adaptationCycles * 0.08)
    : 0;

  let blunderRateDelta = 0;
  let extraDepth = 0;
  let thinkTimeMult = 1;

  switch (L.counterStyle) {
    case "solid":
      blunderRateDelta = -0.06;
      extraDepth = 1;
      thinkTimeMult = 1.05;
      break;
    case "tactical":
      blunderRateDelta = 0.02;
      extraDepth = 1;
      thinkTimeMult = 0.95;
      break;
    case "squeeze":
      blunderRateDelta = -0.04;
      extraDepth = 2;
      thinkTimeMult = 1.1;
      break;
    case "chaotic":
      blunderRateDelta = 0.04;
      extraDepth = 0;
      thinkTimeMult = 0.9;
      break;
  }

  return {
    exploitBoost: boost,
    blunderRateDelta,
    extraDepth,
    counterStyle: L.counterStyle,
    thinkTimeMult,
  };
}

/** Among engine lines, prefer one that fits anti-user counter-style when close in eval. */
export async function pickLearnedMove(
  engine: StockfishEngine,
  state: GameState,
  memory: ChimeraMemory,
  baseDepth: number
): Promise<string | null> {
  const fen = toFen(state);
  const legal = getAllLegalMoves(state);
  if (!legal.length) return null;

  const L = ensureLearning(memory);
  if (!learningIsActive(memory)) return null;

  const bias = learningPlayBias(memory);
  const depth = Math.min(18, baseDepth + bias.extraDepth);

  const tops = await getTopMoves(engine, fen, depth, 3);
  if (!tops.length) return null;

  const bestCp = tops[0].cp;
  const candidates = tops.filter((t) => bestCp - t.cp <= 35);

  const scored = candidates.map((t) => {
    const move = legal.find((m) => moveToUci(m) === t.move);
    if (!move) return { move: t.move, score: -999 };
    let score = t.cp;
    const flags = move.flags ?? [];
    const isCapture = flags.includes("capture");
    const isQuiet = !isCapture && !flags.includes("castle-k");

    switch (L.counterStyle) {
      case "solid":
        if (isQuiet) score += 8;
        if (flags.includes("castle-k") || flags.includes("castle-q")) score += 12;
        break;
      case "tactical":
        if (isCapture) score += 10;
        break;
      case "squeeze":
        if (isQuiet && state.fullmoveNumber > 20) score += 10;
        break;
      case "chaotic":
        if (isCapture) score += 6;
        score += Math.random() * 6;
        break;
    }

    const patterns = getTopPatterns(memory, 8).filter(
      (p) => p.refutation === t.move
    );
    score += patterns.length * 15;

    return { move: t.move, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const pick = scored[0]?.move;
  if (pick) return pick;

  const fallback = candidates[0]?.move;
  if (!fallback) return null;
  const m = legal.find((mv) => moveToUci(mv) === fallback);
  return m ? moveToUci(m) : null;
}

export function counterStyleLabel(id: CounterStyleId): string {
  const labels: Record<CounterStyleId, string> = {
    solid: "Solid counter",
    tactical: "Tactical trap",
    squeeze: "Positional squeeze",
    chaotic: "Chaotic mix",
  };
  return labels[id];
}
