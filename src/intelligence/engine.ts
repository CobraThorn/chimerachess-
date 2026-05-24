import type {
  PostGameIntelligenceInput,
  PostGameIntelligenceResult,
} from "./types";
import { INTELLIGENCE_CONFIG } from "./config";
import { analyzeGamePerformance } from "./services/gameAnalysisService";
import { updatePhenotypeModel } from "./services/phenotypeUpdateEngine";
import { detectBehavioralPatterns } from "./services/behavioralPatternEngine";
import { analyzePerformanceTrends } from "./services/trendAnalysisService";
import { scoreReportConfidence } from "./services/confidenceScoreService";
import { generateCoachingInsights } from "./services/coachingInsightGenerator";
import { generateIntelligenceReport } from "./services/reportGenerator";
import {
  appendReportToArchive,
  getIntelligenceArchive,
  attachIntelligenceToMemory,
  previousReport,
  mergeMistakeFamilies,
} from "./storage";
import { buildMistakeIntelligenceReport } from "../mistakeIntel/engine";
import {
  rebuildCognitiveProfile,
  attachCognitiveProfile,
} from "../cognitiveProfile/engine";

/**
 * Post-Game Intelligence Engine — orchestrates all services after a completed game.
 */
export function runPostGameIntelligence(
  input: PostGameIntelligenceInput
): PostGameIntelligenceResult {
  const {
    game,
    memory,
    reviewReport,
    mode,
    moveTimesMs,
    sessionTiltScore = 0,
  } = input;

  const signals = analyzeGamePerformance({
    game,
    reviewReport: reviewReport ?? undefined,
    moveTimesMs,
  });
  signals.mode = reviewReport?.mode ?? mode;

  const archiveBefore = getIntelligenceArchive(memory);
  const prevReport = previousReport(archiveBefore, game.id);

  const { phenotype, movements } = updatePhenotypeModel({
    archive: archiveBefore,
    signals,
    memory,
    sessionTiltScore,
  });

  const behavioral = detectBehavioralPatterns({
    game,
    signals,
    reviewReport: reviewReport ?? undefined,
    memory,
    sessionTiltScore,
    moveTimesMs,
  });

  const archiveWithPhenotype = { ...archiveBefore, phenotype, updatedAt: Date.now() };
  const trends = analyzePerformanceTrends({
    archive: archiveWithPhenotype,
    current: signals,
    memory,
  });

  const hasReview = Boolean(reviewReport);
  const confidence = scoreReportConfidence(
    archiveWithPhenotype,
    signals,
    hasReview
  );

  const { coachingNotes, tactical } = generateCoachingInsights({
    signals,
    movements,
    behavioral,
    tactical: [],
    trends,
    memory,
    reviewReport: reviewReport ?? undefined,
  });

  const report = generateIntelligenceReport({
    gameId: game.id,
    signals,
    movements,
    behavioral,
    trends,
    confidence,
    coachingNotes,
    tactical,
    previousAccuracy: prevReport?.gameAnalysis.accuracy,
    reviewId: reviewReport?.id,
  });

  let mistakeFamilies = archiveBefore.mistakeFamilies ?? [];
  if (reviewReport) {
    const mistakeIntel = buildMistakeIntelligenceReport({
      reviewReport,
      gameId: game.id,
      families: mistakeFamilies,
      moveTimesMs,
    });
    report.mistakeIntelligence = mistakeIntel;
    mistakeFamilies = mistakeIntel.families;
  }

  if (prevReport) {
    report.compareToPrevious = {
      accuracyDelta: signals.accuracy - prevReport.gameAnalysis.accuracy,
      acplDelta: signals.acpl - prevReport.gameAnalysis.acpl,
      message: report.compareToPrevious?.message ?? "",
    };
    const acc = report.compareToPrevious.accuracyDelta;
    const acpl = report.compareToPrevious.acplDelta;
    if (!report.compareToPrevious.message) {
      report.compareToPrevious.message =
        acc > 3
          ? `+${acc}% accuracy vs prior report.`
          : acc < -3
            ? `${acc}% accuracy dip — drill critical moments.`
            : acpl < -5
              ? `ACPL improved by ${Math.abs(acpl)} — cleaner decisions.`
              : "Within your recent performance band.";
    }
  }

  let archive = mergeMistakeFamilies(
    appendReportToArchive(
      { ...archiveWithPhenotype, phenotype },
      report,
      INTELLIGENCE_CONFIG.maxStoredReports
    ),
    mistakeFamilies
  );

  const cognitiveProfile = rebuildCognitiveProfile({
    ...memory,
    intelligence: archive,
  });
  archive = attachCognitiveProfile(archive, cognitiveProfile);

  const nextMemory = attachIntelligenceToMemory(memory, archive);

  return { report, memory: nextMemory, archive };
}
