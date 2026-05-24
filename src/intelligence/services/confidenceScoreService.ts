import type { ConfidenceScores, IntelligenceArchive, GameAnalysisSnapshot } from "../types";
import { INTELLIGENCE_CONFIG } from "../config";
import { clamp } from "../utils/math";

export function scoreReportConfidence(
  archive: IntelligenceArchive,
  signals: GameAnalysisSnapshot,
  hasReview: boolean
): ConfidenceScores {
  const sampleGames = archive.reports.length + 1;
  const reviewBoost = hasReview ? 22 : 0;
  const depthBoost = signals.userMoves >= 20 ? 8 : signals.userMoves >= 10 ? 4 : 0;

  let dataQuality: ConfidenceScores["dataQuality"] = "low";
  if (sampleGames >= INTELLIGENCE_CONFIG.confidenceGamesHigh && hasReview) {
    dataQuality = "high";
  } else if (sampleGames >= INTELLIGENCE_CONFIG.confidenceGamesMedium || hasReview) {
    dataQuality = "medium";
  }

  const phenotypeConf = avgPhenotypeConfidence(archive);
  const trendsConf = clamp(20 + sampleGames * 7, 15, 90);
  const coachingConf = clamp(35 + reviewBoost + depthBoost + sampleGames * 4, 20, 95);

  const overall = Math.round(
    phenotypeConf * 0.35 + trendsConf * 0.25 + coachingConf * 0.4
  );

  return {
    overall: clamp(overall, 15, 96),
    phenotype: phenotypeConf,
    trends: trendsConf,
    coaching: coachingConf,
    sampleGames,
    dataQuality,
  };
}

function avgPhenotypeConfidence(archive: IntelligenceArchive): number {
  const states = Object.values(archive.phenotype);
  if (!states.length) return 20;
  return Math.round(
    states.reduce((s, p) => s + p.confidence, 0) / states.length
  );
}
