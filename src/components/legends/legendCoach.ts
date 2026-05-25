import { chatCompletionJson } from "../../api/gptChat";
import { getOpenAiApiKey, hasOpenAiApiKey } from "../../api/openaiKey";
import type { Color } from "../../chess";
import type { LegendGame, LegendProfile } from "../../content/legends";
import type { ReviewCoachNote } from "../../review/types";
import type { EvalPoint } from "../../review/types";
import type { LegendReplayStep } from "./legendReplay";
import { legendMoverAtPly } from "./legendReplay";

const CACHE_PREFIX = "chimera-legend-coach-v1:";

/** Deeper than live play — matches review quality for legend retention. */
export const LEGEND_ANALYSIS_DEPTH = 12;
/** Shallow eval on phones — on-demand per ply only. */
export const LEGEND_LITE_DEPTH = 8;

interface GptLegendJson {
  title?: string;
  explanation?: string;
  teachingPoint?: string;
}

function cacheKey(legendId: string, ply: number): string {
  return `${CACHE_PREFIX}${legendId}:${ply}`;
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

function moverLabel(
  ply: number,
  legend: LegendProfile
): { name: string; isLegend: boolean } {
  const color = legendMoverAtPly(ply);
  if (!color) return { name: "—", isLegend: false };
  const isLegend = color === legend.game.legendColor;
  return {
    name: isLegend ? legend.name : legend.game.opponent,
    isLegend,
  };
}

function evalSwingText(before?: EvalPoint, after?: EvalPoint): string {
  if (!before || !after) return "";
  const delta = after.cpWhite - before.cpWhite;
  if (Math.abs(delta) < 25) {
    return ` The evaluation stays roughly level (${before.label} → ${after.label}).`;
  }
  const side = delta > 0 ? "White" : "Black";
  return ` ${side} gains roughly ${(Math.abs(delta) / 100).toFixed(1)} pawns of edge (${before.label} → ${after.label}).`;
}

function swingForLegend(
  before: EvalPoint | undefined,
  after: EvalPoint | undefined,
  legendColor: Color
): number {
  if (!before || !after) return 0;
  const delta = after.cpWhite - before.cpWhite;
  return legendColor === "w" ? delta : -delta;
}

function tacticalHint(swing: number, isLegend: boolean): string {
  if (swing >= 120 && isLegend) {
    return "A crushing practical blow — the kind of move that wins fans and tournaments.";
  }
  if (swing >= 60 && isLegend) {
    return "The legend seizes the initiative here; notice how follow-up threats appear on the next ply.";
  }
  if (swing <= -120 && isLegend) {
    return "A rare slip from the legend — study how the opponent punishes it before the position stabilizes.";
  }
  if (swing <= -60 && isLegend) {
    return "The opponent fights back; watch whether the legend can re-enter with tactics or must defend.";
  }
  if (Math.abs(swing) < 30) {
    return "Quiet precision — both sides improve pieces without handing the opponent a clear target.";
  }
  return isLegend
    ? "Steady professional chess: small improvements compound over the next few moves."
    : "A solid reply that keeps the game in balance — typical of elite resistance.";
}

export function buildLegendCoachNote(
  legend: LegendProfile,
  step: LegendReplayStep,
  evalPt: EvalPoint | undefined,
  evalBefore: EvalPoint | undefined,
  keyMoment?: LegendGame["keyMoment"]
): ReviewCoachNote {
  const ply = step.ply;
  const game = legend.game;

  if (ply === 0) {
    return {
      ply: 0,
      title: `${game.title} — opening position`,
      explanation:
        `${legend.fullName} played ${game.legendColor === "w" ? "White" : "Black"} against ${game.opponent} ` +
        `(${game.event}, ${game.year}). Scrub or autoplay to watch every move with live engine commentary — ` +
        `the same style of insight you get after your own games in CHIMERA review.`,
      teachingPoint:
        "Before move 1: compare king safety, central pawns, and which minor pieces can develop with tempo.",
      source: "local",
    };
  }

  if (
    keyMoment &&
    game.highlightPly != null &&
    ply === game.highlightPly
  ) {
    return {
      ply,
      title: keyMoment.title,
      explanation:
        `${keyMoment.explanation}${evalSwingText(evalBefore, evalPt)}` +
        (evalPt ? ` Engine eval (White POV): ${evalPt.label}.` : ""),
      teachingPoint: keyMoment.teachingPoint,
      source: "local",
    };
  }

  const { name, isLegend } = moverLabel(ply, legend);
  const swing = swingForLegend(evalBefore, evalPt, game.legendColor);
  const evalLine = evalPt
    ? ` Position after this move: ${evalPt.label} (White's perspective).`
    : "";

  return {
    ply,
    title: `${name}: ${step.moveLabel}`,
    explanation:
      `${isLegend ? legend.fullName : game.opponent} plays ${step.moveLabel.replace(/^\d+\.+\s*/, "")}.` +
      `${tacticalHint(swing, isLegend)}${evalSwingText(evalBefore, evalPt)}${evalLine}`,
    teachingPoint: isLegend
      ? `Study ${legend.name}'s idea — not only the destination square, but which lines opened and what became possible next.`
      : `Elite defense: ask what threat the opponent created and how ${legend.name} answered on the following ply.`,
    source: "local",
  };
}

async function fetchGptLegendNote(
  legend: LegendProfile,
  step: LegendReplayStep,
  evalPt: EvalPoint | undefined,
  evalBefore: EvalPoint | undefined,
  apiKey: string
): Promise<ReviewCoachNote | null> {
  if (step.ply === 0) return null;

  const { name, isLegend } = moverLabel(step.ply, legend);
  const system = `You are CHIMERA Chess — coach narrating a famous game for students watching a legend replay.
Write like post-game review coach notes: concrete, visual, 3-4 sentences. No bullet lists.
Respond ONLY with JSON: { "title": "...", "explanation": "...", "teachingPoint": "one habit" }`;

  const user = `Legend: ${legend.fullName} (${legend.epithet})
Game: ${legend.game.title} vs ${legend.game.opponent}, ${legend.game.event} ${legend.game.year}
Featured player color: ${legend.game.legendColor === "w" ? "White" : "Black"}
Ply: ${step.ply}
FEN: ${step.fen}
Move: ${step.moveLabel} by ${name} (${isLegend ? "legend" : "opponent"})
Eval before → after: ${evalBefore?.label ?? "—"} → ${evalPt?.label ?? "—"}`;

  const json = await chatCompletionJson<GptLegendJson>(system, user, {
    temperature: 0.45,
    apiKey,
  });
  if (!json?.explanation) return null;

  return {
    ply: step.ply,
    title: json.title ?? step.moveLabel,
    explanation: json.explanation,
    teachingPoint: json.teachingPoint ?? "",
    source: "gpt",
  };
}

export async function loadLegendCoachNote(
  legend: LegendProfile,
  step: LegendReplayStep,
  evalPt: EvalPoint | undefined,
  evalBefore: EvalPoint | undefined,
  options?: { forceRefresh?: boolean }
): Promise<ReviewCoachNote> {
  const key = cacheKey(legend.id, step.ply);
  if (!options?.forceRefresh) {
    const cached = readCache(key);
    if (cached) return cached;
  }

  const apiKey = getOpenAiApiKey();
  if (apiKey && step.ply > 0) {
    try {
      const gpt = await fetchGptLegendNote(
        legend,
        step,
        evalPt,
        evalBefore,
        apiKey
      );
      if (gpt) {
        writeCache(key, gpt);
        return gpt;
      }
    } catch {
      /* local */
    }
  }

  const local = buildLegendCoachNote(
    legend,
    step,
    evalPt,
    evalBefore,
    legend.game.keyMoment
  );
  writeCache(key, local);
  return local;
}

/** Prefetch coach notes for every ply (local + GPT when API key set). */
export async function prefetchLegendCoachNotes(
  legend: LegendProfile,
  steps: LegendReplayStep[],
  evalTimeline: EvalPoint[],
  onProgress?: (done: number, total: number) => void
): Promise<Map<number, ReviewCoachNote>> {
  const map = new Map<number, ReviewCoachNote>();
  const plies = steps.map((s) => s.ply);
  const total = plies.length;
  let done = 0;
  const queue = [...plies];
  const workers = Math.min(3, hasOpenAiApiKey() ? 3 : 8);

  async function worker() {
    while (queue.length > 0) {
      const ply = queue.shift();
      if (ply === undefined) break;
      const step = steps[ply];
      if (!step) continue;
      const evalPt = evalTimeline[ply];
      const evalBefore = ply > 0 ? evalTimeline[ply - 1] : undefined;
      const note = await loadLegendCoachNote(
        legend,
        step,
        evalPt,
        evalBefore
      );
      map.set(ply, note);
      done += 1;
      onProgress?.(done, total);
    }
  }

  await Promise.all(Array.from({ length: workers }, () => worker()));
  return map;
}
