import { formatPawnAmount } from "./metricsDisplay";
import { formatEvalLabel } from "../engine/analysis";
import { chatCompletionJson, chatCompletionText } from "../api/gptChat";
import { hasOpenAiApiKey } from "../api/openaiKey";
import type { MistakeIntelligence } from "../mistakeIntel/types";
import type {
  GameReviewReport,
  ReviewCoachNote,
  ReviewRecapStep,
  ReviewMoveAnalysis,
} from "./types";

const CACHE_PREFIX = "chimera-review-coach-v3:";

interface GptReviewJson {
  title?: string;
  explanation?: string;
  teachingPoint?: string;
}

function cacheKey(gameId: string, ply: number): string {
  return `${CACHE_PREFIX}${gameId}:${ply}`;
}

function readCache(key: string): ReviewCoachNote | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ReviewCoachNote) : null;
  } catch {
    return null;
  }
}

function writeCache(key: string, note: ReviewCoachNote): void {
  try {
    localStorage.setItem(key, JSON.stringify(note));
  } catch {
    /* quota */
  }
}

function userAnalysisAtPly(
  report: GameReviewReport,
  ply: number
): ReviewMoveAnalysis | undefined {
  return report.userMoves.find((u) => u.ply === ply);
}

function evalAtPly(report: GameReviewReport, ply: number): string {
  const pt = report.evalTimeline[ply];
  return pt ? pt.label : "—";
}

function buildLocalNote(
  report: GameReviewReport,
  step: ReviewRecapStep
): ReviewCoachNote {
  const ply = step.ply;
  if (ply === 0) {
    return {
      ply: 0,
      title: "Starting position",
      explanation:
        `You played ${report.userColor === "w" ? "White" : "Black"} against ${report.opponentLabel}. ` +
        `This recap walks every move with engine grades and coach notes — use ◀ ▶ or the timeline to explore.`,
      teachingPoint: "Before move 1: notice king safety, central pawns, and which pieces can develop in one turn.",
      source: "local",
    };
  }

  const ua = userAnalysisAtPly(report, ply);
  const evalLabel = evalAtPly(report, ply);
  const mover =
    step.mover === "user"
      ? "You"
      : step.mover === "chimera"
        ? report.opponentLabel
        : "Side";

  if (ua) {
    const pos = ua.position;
    const fileHint =
      pos.openFiles.length > 0
        ? ` Open file(s): ${pos.openFiles.join(", ")}.`
        : "";
    const blindHint =
      pos.blindSpots.length > 0
        ? ` Blind spots: ${pos.blindSpots.slice(0, 3).join(", ")}.`
        : "";
    const gradeLine =
      ua.grade === "brilliant" || ua.grade === "best" || ua.grade === "excellent"
        ? "Strong choice — you stayed aligned with the engine."
        : ua.grade === "good"
          ? "Playable — small inaccuracies may exist but the position remains sound."
          : ua.insight;
    return {
      ply,
      title: `${mover}: ${step.san ?? step.uci} (${ua.grade})`,
      explanation:
        `${gradeLine}${fileHint}${blindHint} Eval after this move: ${evalLabel}. ` +
        (ua.cpLoss > 0
          ? `Engine line ${ua.bestUci} was about ${formatPawnAmount(ua.cpLoss)} better.`
          : "This matched or nearly matched the top engine continuation."),
      teachingPoint:
        ua.position.futureScanHabits[0] ??
        (ua.isCritical
          ? "Critical moment — pause here in future games and calculate forcing lines before committing."
          : "Ask: what changed in the position (threats, open files, king exposure)?"),
      source: "local",
    };
  }

  return {
    ply,
    title: `${mover}: ${step.san ?? step.uci ?? "Move"}`,
    explanation:
      `${mover} played ${step.san ?? step.uci}. Position eval (White POV): ${evalLabel}. ` +
      `Watch how this reply shapes space, piece activity, and your next plan.`,
    teachingPoint:
      step.mover === "chimera"
        ? "Study opponent intent: are they improving worst piece, creating threats, or trading into a better endgame?"
        : "Track the idea behind your move — not only the square the piece landed on.",
    source: "local",
  };
}

async function fetchGptNote(
  report: GameReviewReport,
  step: ReviewRecapStep,
  mistakeIntel?: MistakeIntelligence
): Promise<ReviewCoachNote | null> {
  if (step.ply === 0) return null;

  const ua = userAnalysisAtPly(report, step.ply);
  const prev = report.recapSteps[step.ply - 1];
  const evalBefore = evalAtPly(report, step.ply - 1);
  const evalAfter = evalAtPly(report, step.ply);

  const system = `You are CHIMERA Chess — an elite coach beyond chess.com reviews.
Teach like a titled player + sports psychologist: concrete, visual, no fluff.
When a DECISION AUTOPSY is provided, weave its insights into your recap — do not contradict engine facts.
Respond ONLY with JSON:
{
  "title": "short headline",
  "explanation": "3-5 sentences: what the move accomplishes, tactical threats, opponent plans, what to watch next",
  "teachingPoint": "one memorable rule or habit for the student"
}
Mention eval swings when relevant. Be specific to the FEN and move.`;

  const autopsy = mistakeIntel
    ? `\nDECISION AUTOPSY (ground truth):\n${mistakeIntel.explanation.whyWrong}\nBest: ${mistakeIntel.bestMove}. Cognitive: ${mistakeIntel.explanation.cognitiveFailure.join("; ")}`
    : "";

  const user = `Game: ${report.mode} vs ${report.opponentLabel}
Result: ${report.resultLabel}
Student color: ${report.userColor === "w" ? "White" : "Black"}
Ply: ${step.ply} / ${report.totalPlies}
FEN before: ${prev?.fen ?? "start"}
Move played: ${step.san ?? step.uci} (${step.uci}) by ${step.mover === "user" ? "student" : "opponent"}
FEN after: ${step.fen}
Eval before → after (White POV): ${evalBefore} → ${evalAfter}
${ua ? `Engine grade: ${ua.grade}, cp loss ${ua.cpLoss}, best ${ua.bestUci}, insight: ${ua.insight}` : "Opponent move — explain why it matters to the student."}
Opening so far: ${report.openingLine.slice(0, 120)}${autopsy}`;

  const json = await chatCompletionJson<GptReviewJson>(system, user, {
    temperature: 0.45,
  });
  if (!json) return null;

  return {
    ply: step.ply,
    title: json.title ?? `${step.san ?? step.uci}`,
    explanation: json.explanation ?? "",
    teachingPoint: json.teachingPoint ?? "",
    source: "gpt",
  };
}

export async function loadReviewCoachNote(
  report: GameReviewReport,
  ply: number,
  options?: { mistakeIntel?: MistakeIntelligence; forceRefresh?: boolean }
): Promise<ReviewCoachNote> {
  const step = report.recapSteps[ply];
  if (!step) {
    return buildLocalNote(report, report.recapSteps[0]!);
  }

  const key = options?.mistakeIntel
    ? `${cacheKey(report.id, ply)}:autopsy`
    : cacheKey(report.id, ply);
  if (!options?.forceRefresh) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  if (hasOpenAiApiKey()) {
    try {
      const gpt = await fetchGptNote(
        report,
        step,
        options?.mistakeIntel
      );
      if (gpt?.explanation) {
        writeCache(key, gpt);
        return gpt;
      }
    } catch {
      /* local fallback */
    }
  }

  const local = buildLocalNote(report, step);
  writeCache(key, local);
  return local;
}

export async function buildCoachSummary(
  report: GameReviewReport
): Promise<string> {
  if (!hasOpenAiApiKey()) {
    return (
      report.narrative[0] ??
      `Accuracy ${report.accuracy}% — step through every move on the board. ` +
        `Sign in and enable the server coach, or add your own OpenAI key in Settings.`
    );
  }

  const system = `You are CHIMERA's head coach. Write a vivid 4-sentence game summary for the student.
Cover: result emotion, biggest turning point, one strength, one training focus. No bullet lists.`;

  const user = `Result: ${report.resultLabel}
Accuracy: ${report.accuracy}%
Blunders: ${report.blunders}, mistakes: ${report.mistakes}
Critical: ${report.criticalMoments.map((c) => `${c.san ?? c.uci} (${formatPawnAmount(c.cpLoss)} lost)`).join("; ") || "none"}
Narrative: ${report.narrative.join(" ")}`;

  try {
    const text = await chatCompletionText(system, user, { temperature: 0.5 });
    return text ?? report.narrative.join(" ");
  } catch {
    return report.narrative.join(" ");
  }
}

/** Prefetch coach notes for all plies (concurrency-limited). */
export async function prefetchReviewCoachNotes(
  report: GameReviewReport,
  onProgress?: (done: number, total: number) => void,
  mistakesByPly?: Map<number, MistakeIntelligence>
): Promise<Map<number, ReviewCoachNote>> {
  const map = new Map<number, ReviewCoachNote>();
  const plies = report.recapSteps.map((s) => s.ply);
  const total = plies.length;
  let done = 0;
  const queue = [...plies];
  const workers = Math.min(3, hasOpenAiApiKey() ? 3 : 6);

  async function worker() {
    while (queue.length > 0) {
      const ply = queue.shift();
      if (ply === undefined) break;
      const note = await loadReviewCoachNote(report, ply, {
        mistakeIntel: mistakesByPly?.get(ply),
      });
      map.set(ply, note);
      done += 1;
      onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return map;
}

export function formatCoachEvalLine(report: GameReviewReport, ply: number): string {
  return formatEvalLabel(report.evalTimeline[ply]?.cpWhite ?? 0);
}
