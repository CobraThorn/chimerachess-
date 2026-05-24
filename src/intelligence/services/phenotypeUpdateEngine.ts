import type { ChimeraMemory } from "../../ai/types";
import { radarCurrentFromMemory } from "../../ai/cognition/personalityRadar";
import { INTELLIGENCE_CONFIG, getAxisMeta } from "../config";
import type {
  GameAnalysisSnapshot,
  IntelligencePhenotypeKey,
  PhenotypeMovement,
  PhenotypeState,
  PhenotypeUpdateInput,
  PhenotypeUpdateResult,
} from "../types";
import { clamp, directionFromDelta, emaUpdate, learningRate } from "../utils/math";

/**
 * Per-game signals → 0–100 phenotype scores.
 * Reasoning: each axis blends review phases, mistake profile, and radar prior
 * so one blunder cannot swing the model (low learning rate + confidence weight).
 */
export function computeGamePhenotypeSignals(
  signals: GameAnalysisSnapshot,
  memory: ChimeraMemory,
  sessionTiltScore = 0
): Record<IntelligencePhenotypeKey, number> {
  const radar = radarCurrentFromMemory(memory);
  const blunderRate = signals.userMoves
    ? signals.blunders / Math.max(1, signals.userMoves)
    : 0;

  return {
    confidence:
      0.35 * signals.accuracy +
      0.25 * (100 - Math.min(100, signals.acpl)) +
      0.2 * (signals.result === "user-win" ? 88 : signals.result === "draw" ? 72 : 55) +
      0.2 * radar.conversionAbility,
    aggression:
      0.4 * radar.aggression +
      0.3 * (signals.middlegameAccuracy > signals.openingAccuracy ? 70 : 55) +
      0.3 * (signals.brilliantMoves > 0 ? 75 + signals.brilliantMoves * 5 : 50),
    positionalDiscipline:
      0.45 * radar.positionalUnderstanding +
      0.35 * signals.openingAccuracy +
      0.2 * (100 - signals.inaccuracies * 8),
    tacticalSharpness:
      0.5 * radar.tacticalVision +
      0.3 * (100 - blunderRate * 120) +
      0.2 * signals.middlegameAccuracy,
    timePressureResilience:
      0.4 * radar.timeManagement +
      0.35 * radar.consistencyUnderPressure +
      0.25 * (signals.endgameAccuracy > 0 ? signals.endgameAccuracy : signals.accuracy),
    tiltTendency:
      clamp(
        sessionTiltScore * 0.5 +
          blunderRate * 90 +
          (signals.maxCpLoss >= INTELLIGENCE_CONFIG.blunderCpThreshold ? 25 : 0),
        0,
        100
      ),
    riskAppetite:
      0.5 * radar.riskTolerance +
      0.25 * (signals.brilliantMoves > 0 ? 80 : 50) +
      0.25 * (signals.mistakes > signals.blunders ? 60 : 45),
    adaptability:
      0.35 * radar.patternRecognition +
      0.35 * (memory.learning?.adaptationScore ?? 20) +
      0.3 * (signals.accuracy > 80 ? 78 : 58),
    endgameDiscipline:
      0.55 * radar.endgamePrecision +
      0.45 * signals.endgameAccuracy,
    openingConfidence:
      0.5 * radar.openingPreparation +
      0.5 * signals.openingAccuracy,
  };
}

export function createDefaultPhenotypeState(): PhenotypeState {
  return {
    score: 50,
    momentum: 0,
    confidence: 15,
    lastDelta: 0,
    updatedAt: Date.now(),
    gamesSampled: 0,
    history: [],
  };
}

export function updatePhenotypeModel(
  input: PhenotypeUpdateInput
): PhenotypeUpdateResult {
  const { archive, signals, memory, sessionTiltScore } = input;
  const gameSignals = computeGamePhenotypeSignals(
    signals,
    memory,
    sessionTiltScore
  );
  const phenotype = { ...archive.phenotype };
  const movements: PhenotypeMovement[] = [];

  const keys = Object.keys(gameSignals) as IntelligencePhenotypeKey[];
  for (const key of keys) {
    const prev = phenotype[key] ?? createDefaultPhenotypeState();
    const before = prev.score;
    const sample = clamp(gameSignals[key], 0, 100);
    const rate = learningRate(
      INTELLIGENCE_CONFIG.phenotypeLearningRate,
      prev.gamesSampled + 1
    );
    const after = Math.round(emaUpdate(before, sample, rate));
    const delta = after - before;
    const momentum = Math.round(
      prev.momentum * INTELLIGENCE_CONFIG.phenotypeMomentumDecay +
        delta * (1 - INTELLIGENCE_CONFIG.phenotypeMomentumDecay)
    );
    const gamesSampled = prev.gamesSampled + 1;
    const confidence = phenotypeConfidence(gamesSampled);

    const history = [
      ...prev.history,
      { at: Date.now(), gameId: signals.gameId, score: after, delta },
    ].slice(-INTELLIGENCE_CONFIG.maxPhenotypeHistoryPerAxis);

    phenotype[key] = {
      score: after,
      momentum,
      confidence,
      lastDelta: delta,
      updatedAt: Date.now(),
      gamesSampled,
      history,
    };

    const axisMeta = getAxisMeta(key);
    const displayDelta = axisMeta.invertScale ? -delta : delta;
    movements.push({
      key,
      label: axisMeta.label,
      before,
      after,
      delta: displayDelta,
      direction: directionFromDelta(displayDelta),
      confidence,
      interpretation: interpretMovement(key, displayDelta, after),
    });
  }

  return { phenotype, movements };
}

function phenotypeConfidence(gamesSampled: number): number {
  if (gamesSampled >= INTELLIGENCE_CONFIG.confidenceGamesHigh) return 88;
  if (gamesSampled >= INTELLIGENCE_CONFIG.confidenceGamesMedium) return 62;
  return clamp(25 + gamesSampled * 8, 15, 55);
}

function interpretMovement(
  key: IntelligencePhenotypeKey,
  delta: number,
  score: number
): string {
  const dir = directionFromDelta(delta, 2);
  if (key === "tiltTendency") {
    if (dir === "down") return "Emotional stability improved this session.";
    if (dir === "up") return "More emotional leakage after mistakes — reset routine matters.";
    return "Tilt profile held steady.";
  }
  if (dir === "up") return `Trending up (${score}/100) — keep reinforcing this habit.`;
  if (dir === "down") return `Softened (${score}/100) — prioritize in next training block.`;
  return `Stable at ${score}/100 — consistent profile.`;
}
