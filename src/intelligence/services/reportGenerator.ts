import type {
  PostGameIntelligenceReport,
  GameAnalysisSnapshot,
  PhenotypeMovement,
  BehavioralObservation,
  PerformanceTrends,
  ConfidenceScores,
  CoachingNote,
  TacticalObservation,
} from "../types";

export interface ReportGeneratorInput {
  gameId: string;
  signals: GameAnalysisSnapshot;
  movements: PhenotypeMovement[];
  behavioral: BehavioralObservation[];
  trends: PerformanceTrends;
  confidence: ConfidenceScores;
  coachingNotes: CoachingNote[];
  tactical: TacticalObservation[];
  previousAccuracy?: number;
  reviewId?: string;
}

export function generateIntelligenceReport(
  input: ReportGeneratorInput
): PostGameIntelligenceReport {
  const {
    gameId,
    signals,
    movements,
    behavioral,
    trends,
    confidence,
    coachingNotes,
    tactical,
    previousAccuracy,
    reviewId,
  } = input;

  const strengths = deriveStrengths(signals, movements);
  const weaknesses = deriveWeaknesses(signals, movements, behavioral);
  const recommendedFocus = coachingNotes.map((c) => c.focusArea).slice(0, 4);

  const headline = buildHeadline(signals, trends);
  const summary = buildSummary(signals, trends, confidence);

  let compareToPrevious: PostGameIntelligenceReport["compareToPrevious"];
  if (previousAccuracy !== undefined) {
    const accuracyDelta = signals.accuracy - previousAccuracy;
    compareToPrevious = {
      accuracyDelta,
      acplDelta: 0,
      message:
        accuracyDelta > 3
          ? `+${accuracyDelta}% accuracy vs your last intelligence report.`
          : accuracyDelta < -3
            ? `${accuracyDelta}% accuracy vs last game — review critical moments.`
            : "In line with your recent performance band.",
    };
  }

  return {
    version: 1,
    id: `intel-${gameId}`,
    gameId,
    generatedAt: Date.now(),
    summary,
    headline,
    strengths,
    weaknesses,
    phenotypeMovement: movements,
    performanceTrends: trends,
    recommendedFocus,
    confidence,
    coachingNotes,
    tacticalObservations: tactical,
    behavioralObservations: behavioral,
    gameAnalysis: signals,
    reviewId,
    compareToPrevious,
  };
}

function buildHeadline(
  signals: GameAnalysisSnapshot,
  trends: PerformanceTrends
): string {
  if (signals.brilliantMoves > 0 && signals.accuracy >= 88) {
    return "Peak-performance window — convert the momentum";
  }
  if (signals.blunders >= 2) {
    return "High-variance game — tighten calculation protocol";
  }
  if (trends.accuracy.direction === "improving") {
    return "Upward trajectory — stay on the same training rails";
  }
  return `${signals.playQuality} · ${signals.accuracy}% accuracy`;
}

function buildSummary(
  signals: GameAnalysisSnapshot,
  trends: PerformanceTrends,
  confidence: ConfidenceScores
): string {
  const result =
    signals.result === "user-win"
      ? "Victory"
      : signals.result === "draw"
        ? "Draw"
        : "Defeat";
  return `${result} in ${Math.ceil(signals.durationMs / 60000) || 1} minutes. ${signals.accuracy}% accuracy (${signals.playQuality}), ${signals.acpl} ACPL. ${trends.streakLabel}. Report confidence: ${confidence.overall}% (${confidence.dataQuality} data).`;
}

function deriveStrengths(
  signals: GameAnalysisSnapshot,
  movements: PhenotypeMovement[]
): string[] {
  const s: string[] = [];
  if (signals.accuracy >= 85) s.push(`Strong overall accuracy (${signals.accuracy}%)`);
  if (signals.brilliantMoves > 0) s.push(`${signals.brilliantMoves} best-level move(s)`);
  const risers = movements.filter((m) => m.direction === "up" && m.key !== "tiltTendency");
  risers.slice(0, 2).forEach((m) => s.push(`${m.label} trending up`));
  if (signals.endgameAccuracy >= 80) s.push("Reliable endgame technique");
  if (s.length === 0) s.push("Completed full analysis — baseline established");
  return s.slice(0, 5);
}

function deriveWeaknesses(
  signals: GameAnalysisSnapshot,
  movements: PhenotypeMovement[],
  behavioral: BehavioralObservation[]
): string[] {
  const w: string[] = [];
  if (signals.blunders > 0) w.push(`${signals.blunders} blunder(s) — largest rating leak`);
  if (signals.mistakes > 1) w.push(`${signals.mistakes} mistakes to drill`);
  movements
    .filter((m) => m.direction === "down")
    .slice(0, 2)
    .forEach((m) => w.push(`${m.label} dipped this game`));
  behavioral
    .filter((b) => b.severity === "focus")
    .slice(0, 2)
    .forEach((b) => w.push(b.title));
  if (w.length === 0 && signals.acpl > 40) w.push("Centipawn loss above your optimal band");
  return w.slice(0, 5);
}
