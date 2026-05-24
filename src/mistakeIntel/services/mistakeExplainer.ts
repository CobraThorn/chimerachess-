import type { ReviewMoveAnalysis } from "../../review/types";
import { isPositiveGrade } from "../../review/moveGrades";
import { cpToPawns } from "../../review/metricsDisplay";
import type { MistakeIntelligence, MistakePatternFamily, MistakeSeverity } from "../types";
import { MISTAKE_INTEL_CONFIG } from "../config";
import { analyzePositionalEvidence } from "../evidence/positionalAnalysis";
import { inferCognitiveFailures } from "../evidence/cognitiveModel";
import { explainBestMove } from "../evidence/bestMoveAnalysis";
import {
  detectDiscoveredAttackHint,
  scanTacticalContext,
} from "../evidence/tacticalScan";
import { patternTagsForMistake } from "./patternRegistry";

function severityFromMove(move: ReviewMoveAnalysis): MistakeSeverity | null {
  if (isPositiveGrade(move.grade) || move.grade === "book") return null;
  if (move.isCritical || move.cpLoss >= MISTAKE_INTEL_CONFIG.criticalCpLoss) {
    return move.cpLoss >= MISTAKE_INTEL_CONFIG.blunderCpLoss ? "blunder" : "critical";
  }
  if (move.grade === "blunder") return "blunder";
  if (move.grade === "mistake" || move.grade === "miss") return "mistake";
  return "inaccuracy";
}

function phaseContext(ply: number): { opening?: string; endgame?: string } {
  if (ply <= MISTAKE_INTEL_CONFIG.openingPlyMax) {
    return {
      opening: `Opening phase (ply ${ply}) — theory, development order, and pawn breaks matter most.`,
    };
  }
  if (ply > MISTAKE_INTEL_CONFIG.middlegamePlyMax) {
    return {
      endgame: `Endgame phase (ply ${ply}) — technique, king activity, and pawn races dominate.`,
    };
  }
  return {};
}

function buildHeadline(
  move: ReviewMoveAnalysis,
  severity: MistakeSeverity,
  tactical: string[]
): string {
  const moveNo = Math.ceil(move.ply / 2);
  const theme = tactical[0];
  if (severity === "blunder" && theme) {
    return `Move ${moveNo}: ${theme} — major swing (${cpToPawns(move.cpLoss)} pawns)`;
  }
  if (severity === "critical") {
    return `Move ${moveNo}: turning point — eval collapsed`;
  }
  return `Move ${moveNo}: ${move.grade} — ${move.san ?? move.uci}`;
}

function buildWhyItMatters(move: ReviewMoveAnalysis, severity: MistakeSeverity): string {
  const pawns = cpToPawns(move.cpLoss);
  if (severity === "blunder") {
    return `This single decision swung roughly ${pawns} pawns — often enough to flip the result at your level.`;
  }
  if (severity === "critical") {
    return "The engine flags this as a critical moment — the game’s narrative pivots here.";
  }
  if (severity === "mistake") {
    return `~${pawns} pawns of advantage leaked — not always losing, but it defines who plays for a win.`;
  }
  return "Small inaccuracies compound; fixing these raises your floor in equal positions.";
}

function buildTrainingRecs(
  move: ReviewMoveAnalysis,
  tactical: string[],
  _cognitive: string[],
  position: ReviewMoveAnalysis["position"]
): string[] {
  const recs: string[] = [];
  if (tactical.includes("hanging piece")) {
    recs.push("Daily 5-minute scan: list every piece attacked before you move.");
  }
  if (tactical.includes("forcing move missed")) {
    recs.push("Puzzle set: checks and captures first — 10 puzzles before rated play.");
  }
  if (tactical.includes("king safety")) {
    recs.push("King safety drill: mark 8 squares around your king before committing.");
  }
  if (move.ply <= 16) {
    recs.push("Review this opening line in the repertoire — name the plan in one sentence.");
  }
  if (move.ply > 44) {
    recs.push("Endgame fundamentals: king + pawn technique for 15 minutes this week.");
  }
  recs.push(...position.futureScanHabits.slice(0, 2));
  recs.push(...position.findBestMoveSteps.slice(0, 1));
  return [...new Set(recs)].slice(0, 5);
}

export function explainMistake(
  move: ReviewMoveAnalysis,
  userColor: import("../../chess").Color,
  userMoveIndex: number,
  priorMissesInGame: number,
  families: MistakePatternFamily[],
  moveTimeMs?: number
): MistakeIntelligence | null {
  const severity = severityFromMove(move);
  if (!severity) return null;

  const played = move.san ?? move.uci;
  const tacticalScan = scanTacticalContext(
    move.fenBefore,
    move.fenAfter,
    userColor,
    move.uci,
    move.bestUci
  );

  const discovered = detectDiscoveredAttackHint(move.fenBefore, move.uci, userColor);
  if (discovered) {
    tacticalScan.themes.push("discovered attack");
    tacticalScan.missedVisualCues.push(discovered);
  }

  const positional = analyzePositionalEvidence(
    move.fenBefore,
    move.fenAfter,
    userColor,
    move.cpLoss
  );

  const cognitive = inferCognitiveFailures(
    move,
    tacticalScan,
    userMoveIndex,
    priorMissesInGame,
    moveTimeMs
  );

  const strategicTheme = positional.violatedConcepts.slice(0, 4);
  const tacticalTheme = [...new Set(tacticalScan.themes)];

  const patternTags = patternTagsForMistake(
    tacticalTheme,
    strategicTheme,
    move.ply,
    families
  );

  const whatHappened =
    `You played ${played} (${move.grade}, ${move.accuracyPct}% accuracy). ` +
    `Stockfish preferred ${move.bestUci}, costing about ${cpToPawns(move.cpLoss)} pawns of evaluation.`;

  const whyWrong =
    positional.narrativeLines[0] ??
    tacticalScan.missedVisualCues[0] ??
    move.insight;

  const whyBestMoveWorks = explainBestMove(
    move.fenBefore,
    move.bestUci,
    move.uci,
    userColor
  );

  const preventionAdvice =
    move.position.findBestMoveSteps[move.position.findBestMoveSteps.length - 1] ??
    "Before every move: checks, captures, threats — then quiet improvements.";

  const phase = phaseContext(move.ply);

  return {
    id: `mistake-${move.ply}`,
    moveNumber: Math.ceil(move.ply / 2),
    ply: move.ply,
    severity,
    playerMove: played,
    bestMove: move.bestUci,
    evaluationSwing: move.cpLoss,
    headline: buildHeadline(move, severity, tacticalTheme),
    explanation: {
      whatHappened,
      whyWrong,
      violatedConcepts: positional.violatedConcepts,
      whyBestMoveWorks,
      likelyThoughtProcess: cognitive.likelyThoughtProcess,
      cognitiveFailure: cognitive.failures,
      boardConsequences: [
        ...positional.boardConsequences,
        ...tacticalScan.missedVisualCues,
      ].slice(0, 6),
      preventionAdvice,
    },
    tacticalTheme: tacticalTheme.length ? tacticalTheme : undefined,
    strategicTheme: strategicTheme.length ? strategicTheme : undefined,
    openingContext: phase.opening,
    endgameContext: phase.endgame,
    confidence: Math.round((cognitive.confidence + MISTAKE_INTEL_CONFIG.baseConfidenceWithReview) / 2),
    trainingRecommendation: buildTrainingRecs(
      move,
      tacticalTheme,
      cognitive.failures,
      move.position
    ),
    patternTags,
    whyItMatters: buildWhyItMatters(move, severity),
  };
}

export function isExplainableMistake(move: ReviewMoveAnalysis): boolean {
  return severityFromMove(move) !== null;
}
