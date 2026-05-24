import type {
  CoachingGeneratorInput,
  CoachingNote,
  TacticalObservation,
} from "../types";
import { getAxisMeta } from "../config";

export function generateCoachingInsights(
  input: CoachingGeneratorInput
): { coachingNotes: CoachingNote[]; tactical: TacticalObservation[] } {
  const {
    signals,
    movements,
    behavioral,
    trends,
    memory,
    reviewReport,
  } = input;

  const coachingNotes: CoachingNote[] = [];
  let priority = 1 as 1 | 2 | 3;

  const weakest = [...movements]
    .filter((m) => m.key !== "tiltTendency")
    .sort((a, b) => a.delta - b.delta)[0];
  if (weakest && weakest.delta < -2) {
    coachingNotes.push({
      id: "focus-weakest-axis",
      priority,
      focusArea: weakest.label,
      prescription: getAxisMeta(weakest.key).description,
      rationale: weakest.interpretation,
      timeframe: "this-week",
    });
    priority = bumpPriority(priority);
  }

  if (signals.blunders > 0) {
    coachingNotes.push({
      id: "blunder-drill",
      priority,
      focusArea: "Calculation discipline",
      prescription:
        "10 minutes of forced-calculation puzzles before your next rated session. Pause on every candidate check.",
      rationale: `${signals.blunders} blunder(s) cost more than tactics — process beats speed.`,
      timeframe: "next-game",
    });
    priority = bumpPriority(priority);
  }

  if (trends.acpl.direction === "improving" && trends.accuracy.direction === "improving") {
    coachingNotes.push({
      id: "momentum-keep",
      priority,
      focusArea: "Momentum",
      prescription: "Play one more game at the same time control while patterns are fresh.",
      rationale: "Accuracy and ACPL both trending up — capitalize on form.",
      timeframe: "next-game",
    });
    priority = bumpPriority(priority);
  }

  if (memory.learning?.focusWeakness) {
    coachingNotes.push({
      id: "chimera-focus",
      priority,
      focusArea: "CHIMERA adaptation",
      prescription: memory.learning.focusWeakness,
      rationale: "Your opponent model flagged this as the highest-leverage weakness.",
      timeframe: "this-week",
    });
    priority = bumpPriority(priority);
  }

  const tilt = behavioral.find((b) => b.id === "tilt-risk");
  if (tilt) {
    coachingNotes.push({
      id: "tilt-protocol",
      priority,
      focusArea: "Emotional reset",
      prescription:
        "After any blunder: stand up, 4 slow breaths, one sentence — 'next move only'.",
      rationale: tilt.detail,
      timeframe: "next-game",
    });
  }

  if (coachingNotes.length === 0) {
    coachingNotes.push({
      id: "maintain",
      priority: 2,
      focusArea: "Consistency",
      prescription: "Replay one critical moment from this game and compare with engine best move.",
      rationale: "Solid baseline — refinement beats overhaul.",
      timeframe: "next-game",
    });
  }

  const tactical: TacticalObservation[] =
    reviewReport?.criticalMoments.slice(0, 5).map((m) => ({
      id: `critical-${m.ply}`,
      ply: m.ply,
      title: `${m.grade} at move ${Math.ceil(m.ply / 2)}`,
      detail: m.insight,
      cpLoss: m.cpLoss,
    })) ?? [];

  return { coachingNotes: coachingNotes.slice(0, 5), tactical };
}

function bumpPriority(p: 1 | 2 | 3): 1 | 2 | 3 {
  return Math.min(3, p + 1) as 1 | 2 | 3;
}
