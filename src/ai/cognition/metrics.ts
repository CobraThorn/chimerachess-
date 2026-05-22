import type { ChimeraMemory } from "../types";
import type { PlayStyleProfile } from "../playStyle";

/** Normalized 0–100 cognitive signals derived from move behaviour — not personality labels. */
export interface CognitiveMetrics {
  tactical: {
    sacrificeFrequency: number;
    tacticSpotting: number;
    attackSpeed: number;
    calculationDepth: number;
  };
  positional: {
    structureQuality: number;
    spaceManagement: number;
    prophylaxis: number;
    strategicPatience: number;
  };
  psychological: {
    pressureCollapse: number;
    emotionalRecovery: number;
    tiltBehaviour: number;
    panicFrequency: number;
  };
  temporal: {
    movePacing: number;
    timeTroubleQuality: number;
    pressureTiming: number;
  };
  behavioural: {
    riskAppetite: number;
    initiativeValuation: number;
    conversionStyle: number;
    chaosTolerance: number;
  };
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function deriveCognitiveMetrics(
  profile: PlayStyleProfile
): CognitiveMetrics {
  const m = Math.max(1, profile.moves);
  const avgLoss =
    profile.cpLossSamples > 0 ? profile.cpLossSum / profile.cpLossSamples : 40;
  const blunderRate = (profile.blunders / m) * 100;
  const mistakeRate = (profile.mistakes / m) * 100;
  const captureRate = (profile.captures / m) * 100;
  const checkRate = (profile.checks / m) * 100;
  const quietRate = (profile.quietMoves / m) * 100;
  const castleRate = (profile.castles / m) * 100;
  const devRate = (profile.development / m) * 100;
  const endgameRate = (profile.endgameMoves / m) * 100;
  const sacrificeRate = (profile.sacrifices / m) * 100;
  const precision = clamp(100 - avgLoss * 0.85);
  const emotionalRecovery = clamp(100 - blunderRate * 1.5 - (profile.evalSwingDown / m) * 50);
  const attackSpeed = clamp(checkRate * 2.8);
  const initiative = clamp(checkRate * 2.2 + (profile.pawnAdvances / m) * 80);
  const risk = clamp(
    sacrificeRate * 1.2 +
      (profile.earlyQueen / m) * 400 +
      blunderRate * 0.8 +
      (profile.evalSwingDown / m) * 40
  );

  return {
    tactical: {
      sacrificeFrequency: clamp(sacrificeRate * 2.5 + captureRate * 0.3),
      tacticSpotting: clamp(
        (profile.evalSwingUp / m) * 100 + captureRate * 0.4 + precision * 0.25
      ),
      attackSpeed,
      calculationDepth: clamp(precision * 0.7 + (profile.evalSwingUp / m) * 60),
    },
    positional: {
      structureQuality: clamp(
        castleRate * 2.5 + quietRate * 0.35 + precision * 0.35 - risk * 0.15
      ),
      spaceManagement: clamp(devRate * 2.2 + (profile.pawnAdvances / m) * 70),
      prophylaxis: clamp(
        (profile.prophylaxis / m) * 300 + castleRate * 1.8 + quietRate * 0.25
      ),
      strategicPatience: clamp(quietRate * 0.85 + precision * 0.4 - checkRate * 0.2),
    },
    psychological: {
      pressureCollapse: clamp(blunderRate * 2.2 + mistakeRate * 0.8),
      emotionalRecovery,
      tiltBehaviour: clamp(mistakeRate * 1.6 + blunderRate * 0.9),
      panicFrequency: clamp(
        (profile.evalSwingDown / m) * 80 + blunderRate * 1.2 + risk * 0.2
      ),
    },
    temporal: {
      movePacing: clamp(
        checkRate * 1.5 +
          captureRate * 0.5 +
          Math.min(100, (profile.moves / Math.max(1, profile.games)) * 3)
      ),
      timeTroubleQuality: clamp(precision * 0.6 + emotionalRecovery * 0.4),
      pressureTiming: clamp(initiative * 0.5 + attackSpeed * 0.5),
    },
    behavioural: {
      riskAppetite: risk,
      initiativeValuation: initiative,
      conversionStyle: clamp(endgameRate * 1.8 + precision * 0.45 + castleRate * 0.3),
      chaosTolerance: clamp(
        risk * 0.55 + sacrificeRate * 2 + (profile.earlyQueen / m) * 350
      ),
    },
  };
}

/** Flat map for weighted archetype scoring. */
export function flattenMetrics(metrics: CognitiveMetrics): Record<string, number> {
  return {
    sacrificeFrequency: metrics.tactical.sacrificeFrequency,
    tacticSpotting: metrics.tactical.tacticSpotting,
    attackSpeed: metrics.tactical.attackSpeed,
    calculationDepth: metrics.tactical.calculationDepth,
    structureQuality: metrics.positional.structureQuality,
    spaceManagement: metrics.positional.spaceManagement,
    prophylaxis: metrics.positional.prophylaxis,
    strategicPatience: metrics.positional.strategicPatience,
    pressureCollapse: metrics.psychological.pressureCollapse,
    emotionalRecovery: metrics.psychological.emotionalRecovery,
    tiltBehaviour: metrics.psychological.tiltBehaviour,
    panicFrequency: metrics.psychological.panicFrequency,
    movePacing: metrics.temporal.movePacing,
    timeTroubleQuality: metrics.temporal.timeTroubleQuality,
    pressureTiming: metrics.temporal.pressureTiming,
    riskAppetite: metrics.behavioural.riskAppetite,
    initiativeValuation: metrics.behavioural.initiativeValuation,
    conversionStyle: metrics.behavioural.conversionStyle,
    chaosTolerance: metrics.behavioural.chaosTolerance,
    precision: metrics.tactical.calculationDepth,
    trapInduction: 0,
  };
}

export function enrichMetricsWithMemory(
  flat: Record<string, number>,
  memory?: Pick<ChimeraMemory, "patterns">
): Record<string, number> {
  if (!memory?.patterns.length) return flat;
  const bait = memory.patterns.filter((p) => p.occurrences >= 2).length;
  return {
    ...flat,
    trapInduction: Math.min(100, bait * 12),
  };
}
