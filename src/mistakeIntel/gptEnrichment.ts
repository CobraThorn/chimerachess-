import { chatCompletionJson } from "../api/gptChat";
import { getOpenAiApiKey, hasOpenAiApiKey } from "../api/openaiKey";
import { formatPawnAmount } from "../review/metricsDisplay";
import type { GameReviewReport, ReviewMoveAnalysis } from "../review/types";
import type {
  MistakeExplanationBlock,
  MistakeGptOverlay,
  MistakeIntelligence,
  MistakeIntelligenceReport,
} from "./types";

const CACHE_PREFIX = "chimera-mistake-gpt-v1:";

interface GptMistakeJson {
  headline?: string;
  whyItMatters?: string;
  whatHappened?: string;
  whyWrong?: string;
  whyBestMoveWorks?: string;
  likelyThoughtProcess?: string;
  cognitiveFailure?: string[];
  boardConsequences?: string[];
  preventionAdvice?: string;
  trainingRecommendation?: string[];
}

function cacheKey(reviewId: string, ply: number): string {
  return `${CACHE_PREFIX}${reviewId}:${ply}`;
}

function readCache(key: string): MistakeGptOverlay | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as MistakeGptOverlay) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, overlay: MistakeGptOverlay): void {
  try {
    localStorage.setItem(key, JSON.stringify(overlay));
  } catch {
    /* quota */
  }
}

function localEvidenceBlock(local: MistakeIntelligence): string {
  const e = local.explanation;
  return JSON.stringify(
    {
      headline: local.headline,
      severity: local.severity,
      playerMove: local.playerMove,
      bestMove: local.bestMove,
      evalSwingCp: local.evaluationSwing,
      whatHappened: e.whatHappened,
      whyWrong: e.whyWrong,
      violatedConcepts: e.violatedConcepts,
      whyBestMoveWorks: e.whyBestMoveWorks,
      likelyThoughtProcess: e.likelyThoughtProcess,
      cognitiveFailure: e.cognitiveFailure,
      boardConsequences: e.boardConsequences,
      preventionAdvice: e.preventionAdvice,
      tacticalTheme: local.tacticalTheme,
      strategicTheme: local.strategicTheme,
      patternTags: local.patternTags,
    },
    null,
    2
  );
}

export async function enrichMistakeWithGpt(
  local: MistakeIntelligence,
  move: ReviewMoveAnalysis,
  reviewReport: GameReviewReport
): Promise<MistakeIntelligence> {
  const key = cacheKey(reviewReport.id, local.ply);
  const cached = readCache(key);
  if (cached) {
    return { ...local, gpt: cached };
  }

  if (!getOpenAiApiKey()) {
    return local;
  }

  const system = `You are CHIMERA's elite decision coach — sports science meets grandmaster analysis.
The student already has a structured engine-backed autopsy. Your job: rewrite it into vivid, specific coaching prose.
NEVER contradict the engine best move or eval swing. NEVER say "you lost material" without explaining the mechanism.
Use the evidence JSON as ground truth. Add psychological insight but label uncertainty.
Respond ONLY with JSON:
{
  "headline": "punchy one line",
  "whyItMatters": "2 sentences on rating/game impact",
  "whatHappened": "what they played vs engine",
  "whyWrong": "positional/tactical mechanism — specific squares and ideas",
  "whyBestMoveWorks": "why Re1/Nf3 etc works — not just the move name",
  "likelyThoughtProcess": "empathetic hypothesis of their thinking",
  "cognitiveFailure": ["Probable cause (moderate confidence): ...", ...],
  "boardConsequences": ["...", ...],
  "preventionAdvice": "one concrete habit",
  "trainingRecommendation": ["...", ...]
}`;

  const user = `Game vs ${reviewReport.opponentLabel} (${reviewReport.resultLabel})
Student: ${reviewReport.userColor === "w" ? "White" : "Black"}
Move ${local.moveNumber} (ply ${local.ply}): ${move.san ?? move.uci}
FEN before: ${move.fenBefore}
FEN after: ${move.fenAfter}
Engine grade: ${move.grade}, loss ${formatPawnAmount(move.cpLoss)}
Structured autopsy (GROUND TRUTH):
${localEvidenceBlock(local)}`;

  try {
    const json = await chatCompletionJson<GptMistakeJson>(system, user, {
      temperature: 0.5,
    });
    if (!json?.whatHappened && !json?.whyWrong) {
      return local;
    }

    const overlay: MistakeGptOverlay = {
      source: "gpt",
      headline: json.headline,
      whyItMatters: json.whyItMatters,
      explanation: {
        whatHappened: json.whatHappened,
        whyWrong: json.whyWrong,
        whyBestMoveWorks: json.whyBestMoveWorks,
        likelyThoughtProcess: json.likelyThoughtProcess,
        cognitiveFailure: json.cognitiveFailure,
        boardConsequences: json.boardConsequences,
        preventionAdvice: json.preventionAdvice,
      },
      trainingRecommendation: json.trainingRecommendation,
    };
    writeCache(key, overlay);
    return { ...local, gpt: overlay };
  } catch {
    return local;
  }
}

export async function enrichMistakeReportWithGpt(
  report: MistakeIntelligenceReport,
  reviewReport: GameReviewReport,
  onProgress?: (done: number, total: number) => void
): Promise<MistakeIntelligenceReport> {
  if (!hasOpenAiApiKey() || report.mistakes.length === 0) {
    return report;
  }

  const moveByPly = new Map(
    reviewReport.userMoves.map((u) => [u.ply, u] as const)
  );
  const enriched: MistakeIntelligence[] = [];
  const total = report.mistakes.length;
  let done = 0;

  const queue = [...report.mistakes];
  const workers = 2;

  async function worker() {
    while (queue.length > 0) {
      const local = queue.shift();
      if (!local) break;
      const move = moveByPly.get(local.ply);
      if (!move) {
        enriched.push(local);
      } else {
        enriched.push(await enrichMistakeWithGpt(local, move, reviewReport));
      }
      done += 1;
      onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  enriched.sort((a, b) => a.ply - b.ply);

  let summary = report.summary;
  if (hasOpenAiApiKey()) {
    const gptSummary = await chatCompletionJson<{ summary?: string }>(
      `You are CHIMERA's head coach. One paragraph summarizing this game's mistake autopsy themes. No bullets.`,
      `Local summary: ${report.summary}\nRecurring: ${report.recurringPatterns.join("; ")}\nMistake headlines: ${enriched.map((m) => m.gpt?.headline ?? m.headline).join(" | ")}`,
      { temperature: 0.55 }
    );
    if (gptSummary?.summary) summary = gptSummary.summary;
  }

  return { ...report, summary, mistakes: enriched };
}

export function mergeMistakeDisplay(
  local: MistakeIntelligence
): {
  headline: string;
  whyItMatters: string;
  explanation: MistakeExplanationBlock;
  trainingRecommendation: string[];
  hasGpt: boolean;
} {
  const g = local.gpt;
  const e = local.explanation;
  return {
    headline: g?.headline ?? local.headline,
    whyItMatters: g?.whyItMatters ?? local.whyItMatters,
    explanation: {
      whatHappened: g?.explanation?.whatHappened ?? e.whatHappened,
      whyWrong: g?.explanation?.whyWrong ?? e.whyWrong,
      violatedConcepts: e.violatedConcepts,
      whyBestMoveWorks: g?.explanation?.whyBestMoveWorks ?? e.whyBestMoveWorks,
      likelyThoughtProcess:
        g?.explanation?.likelyThoughtProcess ?? e.likelyThoughtProcess,
      cognitiveFailure: g?.explanation?.cognitiveFailure ?? e.cognitiveFailure,
      boardConsequences: g?.explanation?.boardConsequences ?? e.boardConsequences,
      preventionAdvice: g?.explanation?.preventionAdvice ?? e.preventionAdvice,
    },
    trainingRecommendation: g?.trainingRecommendation ?? local.trainingRecommendation,
    hasGpt: g?.source === "gpt",
  };
}
