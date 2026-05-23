import type { GameState } from "../chess";
import { getAllLegalMoves } from "../chess";
import { toFen } from "../chess/fen";
import { moveToUci, uciToMove } from "../chess/uci";
import type { StockfishEngine } from "../engine/stockfish";
import {
  configureEngine,
  getBestMoveTimed,
} from "../engine/stockfish";
import { archetypePlayBias } from "./cognition/archetypePlay";
import type { CognitiveIdentity } from "./cognition/identity";
import { getChimeraBookMove } from "./chimeraOpeningBook";
import { positionKey } from "./memory";
import type { ChimeraMemory } from "./types";
import { INITIAL_CHIMERA_ELO } from "./types";

const START_ELO = INITIAL_CHIMERA_ELO;

let lastConfiguredElo: number | null = null;

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function thinkTimeMs(targetElo: number, mirror: boolean): number {
  if (mirror) return 140;
  return Math.min(320, Math.max(140, 100 + Math.floor(targetElo / 12)));
}

/**
 * CHIMERA move: capped engine time + personalized refutations from your mistake history.
 */
export interface ChimeraMoveOptions {
  /** AI vs AI — no user-pattern exploitation */
  mirror?: boolean;
  /** Cognitive archetype biases move chaos / depth */
  archetype?: CognitiveIdentity;
}

export async function getChimeraMove(
  engine: StockfishEngine,
  state: GameState,
  chimeraColor: "w" | "b",
  memory: ChimeraMemory,
  options?: ChimeraMoveOptions
): Promise<string | null> {
  const fen = toFen(state);
  const legal = getAllLegalMoves(state);
  if (!legal.length) return null;

  const mirror = options?.mirror ?? false;

  if (!mirror) {
    const bookUci = getChimeraBookMove(state, chimeraColor);
    if (bookUci) return bookUci;
  }

  engine.stop();

  const bias = archetypePlayBias(
    options?.archetype ??
      (mirror ? undefined : memory.chimeraOpponentIdentity)
  );
  const key = positionKey(fen);
  const patterns = mirror
    ? []
    : memory.patterns.filter((p) => p.positionKey === key);
  const exploitChance = mirror
    ? 0
    : Math.min(0.85, 0.25 + memory.adaptation * 0.006 + patterns.length * 0.08);

  if (patterns.length && Math.random() < exploitChance) {
    const pattern = pickRandom(
      patterns.sort((a, b) => b.occurrences - a.occurrences).slice(0, 5)
    );
    if (pattern?.refutation) {
      const punishing = uciToMove(state, pattern.refutation);
      if (punishing) return pattern.refutation;
    }
  }

  const targetElo = Math.max(
    100,
    Math.min(memory.chimeraElo ?? START_ELO, 3200)
  );

  const blunderRate = Math.min(
    0.35,
    Math.max(
      0.05,
      (mirror
        ? Math.max(0.15, 0.35 - memory.adaptation * 0.003)
        : Math.max(0.08, 0.22 - memory.adaptation * 0.002)) + bias.blunderRateDelta
    )
  );
  if (Math.random() < blunderRate) {
    const randomMove = pickRandom(legal);
    if (randomMove) return moveToUci(randomMove);
  }

  if (lastConfiguredElo !== targetElo) {
    const skillLevel = Math.min(
      20,
      Math.max(0, Math.floor((targetElo - 1320) / 60))
    );
    await configureEngine(engine, {
      limitStrength: true,
      elo: targetElo,
      skillLevel,
    });
    lastConfiguredElo = targetElo;
  }

  const best = await getBestMoveTimed(engine, fen, thinkTimeMs(targetElo, mirror));
  if (best) return best;

  const fallback = pickRandom(legal);
  return fallback ? moveToUci(fallback) : null;
}

export function chimeraStrengthLabel(memory: ChimeraMemory): string {
  return `~${memory.chimeraElo} Elo · ${memory.adaptation}% adapted to you`;
}
