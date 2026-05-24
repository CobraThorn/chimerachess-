import type { BuildMistakeIntelInput, MistakeIntelligenceReport } from "./types";
import { MISTAKE_INTEL_CONFIG } from "./config";
import { explainMistake, isExplainableMistake } from "./services/mistakeExplainer";
import {
  recurringPatternMessages,
  updatePatternFamilies,
} from "./services/patternRegistry";

export function buildMistakeIntelligenceReport(
  input: BuildMistakeIntelInput
): MistakeIntelligenceReport {
  const { reviewReport, gameId, families = [], moveTimesMs } = input;
  const userColor = reviewReport.userColor;

  const explainable = reviewReport.userMoves.filter(isExplainableMistake);
  explainable.sort((a, b) => b.cpLoss - a.cpLoss);

  const mistakes: import("./types").MistakeIntelligence[] = [];
  let missCount = 0;

  for (let i = 0; i < explainable.length && mistakes.length < MISTAKE_INTEL_CONFIG.maxMistakesPerReport; i++) {
    const move = explainable[i]!;
    const userMoveIndex = reviewReport.userMoves.findIndex((u) => u.ply === move.ply);
    const intel = explainMistake(
      move,
      userColor,
      userMoveIndex,
      missCount,
      families,
      moveTimesMs?.[userMoveIndex]
    );
    if (intel) {
      mistakes.push(intel);
      missCount++;
    }
  }

  mistakes.sort((a, b) => a.ply - b.ply);

  const updatedFamilies = updatePatternFamilies(families, mistakes, gameId);
  const recurringPatterns = recurringPatternMessages(updatedFamilies, mistakes);

  const blunders = mistakes.filter((m) => m.severity === "blunder").length;
  const summary =
    mistakes.length === 0
      ? "No inaccuracies or worse — elite-level precision this game."
      : `${mistakes.length} decision${mistakes.length > 1 ? "s" : ""} worth deep study` +
        (blunders > 0 ? ` (${blunders} major)` : "") +
        (recurringPatterns.length > 0
          ? `. Recurring themes: ${recurringPatterns.length} pattern(s) from your history.`
          : ".");

  return {
    version: 1,
    gameId,
    reviewId: reviewReport.id,
    generatedAt: Date.now(),
    userColor,
    summary,
    mistakes,
    recurringPatterns,
    families: updatedFamilies,
  };
}
