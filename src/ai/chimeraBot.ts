import type { GameState } from "../chess";
import { getAllLegalMoves } from "../chess";
import { toFen } from "../chess/fen";
import { moveToUci, uciToMove } from "../chess/uci";
import { acquireSharedTorch } from "../engine/enginePool";
import type { StockfishEngine } from "../engine/stockfish";
import {
  configureEngine,
  getBestMove,
  getBestMoveTimed,
} from "../engine/stockfish";
import { archetypePlayBias } from "./cognition/archetypePlay";
import type { CognitiveIdentity } from "./cognition/identity";
import { getChimeraBookMove } from "./chimeraOpeningBook";
import {
  blunderRateForStrength,
  chimeraSearchDepth,
  chimeraThinkTimeMs,
  effectiveChimeraElo,
  useFullEngineStrength,
} from "./chimeraStrength";
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

const configuredEloByEngine = new WeakMap<StockfishEngine, number>();

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface ChimeraMoveOptions {
  mirror?: boolean;
  archetype?: CognitiveIdentity;
}

async function preferTorchLineWhenStrong(
  state: GameState,
  fen: string,
  stockfishUci: string,
  targetElo: number,
  depth: number
): Promise<string> {
  if (!stockfishUci || targetElo < 2400) return stockfishUci;
  const torch = await acquireSharedTorch();
  if (!torch) return stockfishUci;

  torch.stop();
  const torchUci = await getBestMove(torch, fen, Math.min(20, depth + 1));
  if (!torchUci || torchUci === stockfishUci) return stockfishUci;
  if (!uciToMove(state, torchUci)) return stockfishUci;
  return torchUci;
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

  const targetElo = mirror
    ? Math.max(100, Math.min(memory.chimeraElo ?? 250, 3200))
    : effectiveChimeraElo(memory);

  const blunderRate = blunderRateForStrength(
    targetElo,
    adapt,
    mirror,
    bias.blunderRateDelta,
    learnBias?.blunderRateDelta ?? 0
  );
  if (Math.random() < blunderRate) {
    const randomMove = pickRandom(legal);
    if (randomMove) return moveToUci(randomMove);
  }

  const engineKey = mirror ? -targetElo : targetElo;
  if (configuredEloByEngine.get(engine) !== engineKey) {
    if (useFullEngineStrength(targetElo)) {
      await configureEngine(engine, {
        limitStrength: false,
        skillLevel: 20,
      });
    } else {
      const skillLevel = Math.min(
        20,
        Math.max(0, Math.floor((targetElo - 1320) / 60))
      );
      await configureEngine(engine, {
        limitStrength: true,
        elo: targetElo,
        skillLevel,
      });
    }
    configuredEloByEngine.set(engine, engineKey);
  }

  const baseDepth = chimeraSearchDepth(
    targetElo,
    Math.min(16, 8 + Math.floor(targetElo / 200))
  );

  if (!mirror && learningIsActive(memory)) {
    const learned = await pickLearnedMove(engine, state, memory, baseDepth);
    if (learned) return learned;
  }

  const timeMult = learnBias?.thinkTimeMult ?? 1;

  if (targetElo >= 2200) {
    const depth = chimeraSearchDepth(targetElo, baseDepth);
    const best = await getBestMove(engine, fen, depth);
    if (best) {
      return preferTorchLineWhenStrong(state, fen, best, targetElo, depth);
    }
  } else {
    const best = await getBestMoveTimed(
      engine,
      fen,
      chimeraThinkTimeMs(targetElo, mirror, timeMult),
      chimeraThinkTimeMs(targetElo, mirror, timeMult) + 12_000
    );
    if (best) {
      return preferTorchLineWhenStrong(
        state,
        fen,
        best,
        targetElo,
        baseDepth
      );
    }
  }

  const fallback = pickRandom(legal);
  return fallback ? moveToUci(fallback) : null;
}

export function chimeraStrengthLabel(memory: ChimeraMemory): string {
  const L = ensureLearning(memory);
  const adapt = L.adaptationScore;
  const pheno = L.phenotype ? phenotypeDisplayName(L.phenotype) : null;
  const playElo = effectiveChimeraElo(memory);
  const stored = memory.chimeraElo ?? 250;
  const matchingYou = playElo > stored + 75;

  const eloPart = matchingYou
    ? `~${playElo} Elo · matching your level`
    : `~${playElo} Elo`;

  if (adapt < 10 && !learningIsActive(memory)) {
    return pheno
      ? `${eloPart} · ${pheno} · observing you`
      : `${eloPart} · learning your style`;
  }
  return `${eloPart} · ${adapt}% adapted · ${counterStyleLabel(L.counterStyle)}`;
}
