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
import {
  counterStyleLabel,
  learningIsActive,
  learningPlayBias,
  pickLearnedMove,
} from "./learning/apply";
import { ensureLearning } from "./learning/learn";
import { phenotypeDisplayName } from "./learning/phenotype";
import { positionKey } from "./memory";
import type { ChimeraMemory } from "./types";
import { INITIAL_CHIMERA_ELO } from "./types";

const START_ELO = INITIAL_CHIMERA_ELO;

const configuredEloByEngine = new WeakMap<StockfishEngine, number>();

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function thinkTimeMs(
  targetElo: number,
  mirror: boolean,
  mult: number
): number {
  if (mirror) return 140;
  const base = Math.min(320, Math.max(140, 100 + Math.floor(targetElo / 12)));
  return Math.round(base * mult);
}

export interface ChimeraMoveOptions {
  mirror?: boolean;
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

  const learnBias = mirror ? null : learningPlayBias(memory);
  const adapt = memory.learning?.adaptationScore ?? memory.adaptation;

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
    : Math.min(
        0.9,
        0.25 +
          adapt * 0.006 +
          patterns.length * 0.08 +
          (learnBias?.exploitBoost ?? 0)
      );

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
        ? Math.max(0.15, 0.35 - adapt * 0.003)
        : Math.max(0.08, 0.22 - adapt * 0.002)) +
        bias.blunderRateDelta +
        (learnBias?.blunderRateDelta ?? 0)
    )
  );
  if (Math.random() < blunderRate) {
    const randomMove = pickRandom(legal);
    if (randomMove) return moveToUci(randomMove);
  }

  if (configuredEloByEngine.get(engine) !== targetElo) {
    const skillLevel = Math.min(
      20,
      Math.max(0, Math.floor((targetElo - 1320) / 60))
    );
    await configureEngine(engine, {
      limitStrength: true,
      elo: targetElo,
      skillLevel,
    });
    configuredEloByEngine.set(engine, targetElo);
  }

  const baseDepth = Math.min(16, 8 + Math.floor(targetElo / 200));

  if (!mirror && learningIsActive(memory)) {
    const learned = await pickLearnedMove(engine, state, memory, baseDepth);
    if (learned) return learned;
  }

  const timeMult = learnBias?.thinkTimeMult ?? 1;
  const best = await getBestMoveTimed(
    engine,
    fen,
    thinkTimeMs(targetElo, mirror, timeMult)
  );
  if (best) return best;

  const fallback = pickRandom(legal);
  return fallback ? moveToUci(fallback) : null;
}

export function chimeraStrengthLabel(memory: ChimeraMemory): string {
  const L = ensureLearning(memory);
  const adapt = L.adaptationScore;
  const pheno = L.phenotype ? phenotypeDisplayName(L.phenotype) : null;
  if (adapt < 10 && !learningIsActive(memory)) {
    return pheno
      ? `~${memory.chimeraElo} Elo · ${pheno} · observing you`
      : `~${memory.chimeraElo} Elo · learning your style`;
  }
  return `~${memory.chimeraElo} Elo · ${adapt}% adapted · ${counterStyleLabel(L.counterStyle)}`;
}
