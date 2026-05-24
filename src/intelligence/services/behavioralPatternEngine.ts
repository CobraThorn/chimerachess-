import type { BehavioralPatternInput, BehavioralObservation } from "../types";
import { INTELLIGENCE_CONFIG } from "../config";

/** Detects decision-making and emotional patterns from one game. */
export function detectBehavioralPatterns(
  input: BehavioralPatternInput
): BehavioralObservation[] {
  const { signals, reviewReport, memory, sessionTiltScore = 0, moveTimesMs } =
    input;
  const out: BehavioralObservation[] = [];

  if (signals.blunders >= 2) {
    out.push({
      id: "blunder-cluster",
      category: "decision",
      severity: signals.blunders >= 3 ? "focus" : "watch",
      title: "Blunder clustering",
      detail: `${signals.blunders} serious errors — often a sign of rushing or loss of calculation discipline.`,
      evidence: `Max swing ${signals.maxCpLoss} cp`,
    });
  }

  if (signals.openingAccuracy - signals.endgameAccuracy > 18) {
    out.push({
      id: "endgame-drop",
      category: "endgame",
      severity: "watch",
      title: "Endgame focus fade",
      detail: "Accuracy dropped sharply after the opening — technique training recommended.",
    });
  }

  if (signals.openingAccuracy < 75 && signals.middlegameAccuracy > signals.openingAccuracy + 8) {
    out.push({
      id: "opening-uncertainty",
      category: "opening",
      severity: "info",
      title: "Opening hesitation",
      detail: "You found your rhythm after leaving theory — repertoire confidence may be low.",
    });
  }

  const lateBlunders = reviewReport?.userMoves.filter(
    (u) => u.ply > INTELLIGENCE_CONFIG.middlegamePlyMax && u.cpLoss >= INTELLIGENCE_CONFIG.mistakeCpThreshold
  );
  if (lateBlunders && lateBlunders.length >= 1) {
    out.push({
      id: "late-collapse",
      category: "endgame",
      severity: "focus",
      title: "Late-game critical errors",
      detail: `${lateBlunders.length} significant miss(es) in the endgame phase.`,
    });
  }

  if (sessionTiltScore > 55 || (signals.blunders >= INTELLIGENCE_CONFIG.tiltBlunderClusterThreshold && signals.result !== "user-win")) {
    out.push({
      id: "tilt-risk",
      category: "emotion",
      severity: "focus",
      title: "Tilt signature detected",
      detail: "Performance suggests emotional carry-over after mistakes. Consider a 60-second reset between games.",
    });
  }

  if (moveTimesMs && moveTimesMs.length >= 6) {
    const fast = moveTimesMs.filter((t) => t < 3000).length;
    const ratio = fast / moveTimesMs.length;
    if (ratio > 0.45 && signals.acpl > 35) {
      out.push({
        id: "time-pressure",
        category: "time",
        severity: "watch",
        title: "Clock-driven decisions",
        detail: `${Math.round(ratio * 100)}% of moves under 3s with elevated ACPL — time trouble is costing accuracy.`,
      });
    }
  }

  const topPattern = memory.patterns[0];
  if (topPattern && topPattern.occurrences >= 3) {
    out.push({
      id: "recurring-habit",
      category: "decision",
      severity: "focus",
      title: "Recurring habit exposed",
      detail: `CHIMERA has seen your ${topPattern.typicalBadMove} pattern ${topPattern.occurrences} times in similar structures.`,
    });
  }

  if (signals.brilliantMoves > 0) {
    out.push({
      id: "brilliant-spark",
      category: "tactics",
      severity: "info",
      title: "High-ceiling moment",
      detail: `${signals.brilliantMoves} best-level move(s) — your ceiling is higher than your average today.`,
    });
  }

  return out.slice(0, 8);
}
