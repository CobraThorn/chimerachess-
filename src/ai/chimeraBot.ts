import type { GameState } from "../chess";
import { getAllLegalMoves } from "../chess";
import {
  CHIMERA_MAX_THINK_MS,
  CHIMERA_SEARCH_HARD_CAP_MS,
} from "../chess/movePacing";
import { toFen } from "../chess/fen";
import { moveToUci, uciToMove } from "../chess/uci";
import type { StockfishEngine } from "../engine/stockfish";
import { configureEngine, getBestMoveTimed } from "../engine/stockfish";
import { archetypePlayBias } from "./cognition/archetypePlay";
import type { CognitiveIdentity } from "./cognition/identity";
import { getChimeraBookMove } from "./chimeraOpeningBook";
import {
  blunderRateForStrength,
  chimeraThinkTimeMs,
  effectiveChimeraElo,
  useFullEngineStrength,
} from "./chimeraStrength";
import {
  counterStyleLabel,
  learningIsActive,
  learningPlayBias,
} from "./learning/apply";
import { ensureLearning } from "./learning/learn";
import { phenotypeDisplayName } from "./learning/phenotype";
import { positionKey } from "./memory";
import type { ChimeraMemory } from "./types";

const configuredEloByEngine = new WeakMap<StockfishEngine, number>();
const CONFIGURE_ENGINE_TIMEOUT_MS = 2_500;

function pickRandom<T>(arr: T[]): T | null {
  if (!arr.length) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export interface ChimeraMoveOptions {
  mirror?: boolean;
  archetype?: CognitiveIdentity;
  /** Arena / solo: timed search only (never depth or MultiPV learned pick). */
  livePlay?: boolean;
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
      await configureEngine(
        engine,
        { limitStrength: false, skillLevel: 20 },
        CONFIGURE_ENGINE_TIMEOUT_MS
      );
    } else {
      const skillLevel = Math.min(
        20,
        Math.max(0, Math.floor((targetElo - 1320) / 60))
      );
      await configureEngine(
        engine,
        { limitStrength: true, elo: targetElo, skillLevel },
        CONFIGURE_ENGINE_TIMEOUT_MS
      );
    }
    configuredEloByEngine.set(engine, engineKey);
  }

  const timeMult = learnBias?.thinkTimeMult ?? 1;
  const thinkMs = Math.min(
    CHIMERA_MAX_THINK_MS,
    chimeraThinkTimeMs(targetElo, mirror, timeMult)
  );

  const best = await getBestMoveTimed(
    engine,
    fen,
    thinkMs,
    CHIMERA_SEARCH_HARD_CAP_MS
  );
  if (best) return best;

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
