import type { ReviewMoveAnalysis } from "../../review/types";
import type { CognitiveFailureKey } from "../config";
import { COGNITIVE_FAILURE_LABELS, MISTAKE_INTEL_CONFIG } from "../config";
import type { TacticalScanResult } from "./tacticalScan";

export interface CognitiveInference {
  failures: string[];
  likelyThoughtProcess: string;
  confidence: number;
}

export function inferCognitiveFailures(
  move: ReviewMoveAnalysis,
  tactical: TacticalScanResult,
  userMoveIndex: number,
  priorMissesInGame: number,
  moveTimeMs?: number
): CognitiveInference {
  const keys: { key: CognitiveFailureKey; weight: number; phrase: string }[] = [];

  if (move.ply > 60 && move.cpLoss >= MISTAKE_INTEL_CONFIG.mistakeCpLoss) {
    keys.push({
      key: "clock_pressure",
      weight: 0.55,
      phrase: "Late-game time pressure often compresses calculation.",
    });
  }
  if (moveTimeMs !== undefined && moveTimeMs < 2500 && move.cpLoss >= 80) {
    keys.push({
      key: "clock_pressure",
      weight: 0.7,
      phrase: "This move was played quickly relative to the position complexity.",
    });
  }

  if (tactical.newHangings.length > 0 || tactical.missedCapture) {
    keys.push({
      key: "threat_blindness",
      weight: 0.75,
      phrase: "A forcing or material threat was on the board but not addressed.",
    });
  }

  if (tactical.kingExposureIncreased) {
    keys.push({
      key: "king_safety_neglect",
      weight: 0.65,
      phrase: "King-zone squares lost protection while you pursued another plan.",
    });
  }

  if (priorMissesInGame >= 2 && userMoveIndex > 2) {
    keys.push({
      key: "defensive_panic",
      weight: 0.5,
      phrase: "Earlier mistakes in this game may have pushed reactive play.",
    });
  }

  if (move.ply <= MISTAKE_INTEL_CONFIG.openingPlyMax && move.cpLoss >= 60) {
    keys.push({
      key: "opening_unfamiliarity",
      weight: 0.6,
      phrase: "Opening phase — theory or plan order may not match this structure.",
    });
  }

  if (move.ply > MISTAKE_INTEL_CONFIG.middlegamePlyMax && move.cpLoss >= 80) {
    keys.push({
      key: "endgame_gap",
      weight: 0.55,
      phrase: "Endgame technique — conversion or defense requires slower calculation.",
    });
  }

  if (move.cpLoss >= MISTAKE_INTEL_CONFIG.blunderCpLoss) {
    keys.push({
      key: "shallow_calculation",
      weight: 0.8,
      phrase: "Large eval swing suggests a line was not calculated to the opponent's reply.",
    });
  }

  if (
    move.grade === "mistake" &&
    tactical.themes.includes("forcing move missed") &&
    priorMissesInGame === 0
  ) {
    keys.push({
      key: "fixation",
      weight: 0.45,
      phrase: "A quiet plan may have overshadowed available forcing resources.",
    });
  }

  if (move.evalBeforeWhite > 150 && move.cpLoss >= 120) {
    keys.push({
      key: "over_aggression",
      weight: 0.4,
      phrase: "From a winning position, precision matters — overpressing can throw away advantage.",
    });
  }

  if (tactical.blindSpotsAfter.length > tactical.blindSpotsBefore.length + 2) {
    keys.push({
      key: "tunnel_vision",
      weight: 0.55,
      phrase: "Multiple blind spots opened — focus may have been on one sector of the board.",
    });
  }

  keys.sort((a, b) => b.weight - a.weight);
  const top = keys.slice(0, 3);

  const failures = top.map((k) => {
    const label = COGNITIVE_FAILURE_LABELS[k.key];
    const conf =
      k.weight >= 0.7 ? "high" : k.weight >= 0.55 ? "moderate" : "low";
    return `Probable cause (${conf} confidence): ${label}. ${k.phrase}`;
  });

  const likelyThoughtProcess =
    top.length > 0
      ? `You may have been prioritizing ${guessPlan(move, tactical)} while underestimating ${tactical.themes[0] ?? "structural concessions"}.`
      : `This likely came from a plausible human plan that did not survive engine-level tactics.`;

  const confidence = Math.round(
    40 + top.reduce((s, k) => s + k.weight * 25, 0)
  );

  return {
    failures,
    likelyThoughtProcess,
    confidence: Math.min(92, confidence),
  };
}

function guessPlan(move: ReviewMoveAnalysis, tactical: TacticalScanResult): string {
  if (move.ply <= 16) return "development or opening preparation";
  if (tactical.themes.includes("open file exposure")) return "file or rook activity";
  if (tactical.themes.includes("king safety")) return "kingside activity";
  return "piece improvement or attack";
}
