import { createInitialState, formatMove, toFen } from "../chess";
import type { GameState } from "../chess";
import { computeControlHeat, emphasizeMoveHeat } from "../chess/heatMap";
import { parseSquare } from "../chess/square";
import type { OpeningLine } from "../content/openings";
import type { BoardArrow, ArrowColor } from "../components/chess/BoardAnnotations";
import { chatCompletionJson } from "./gptChat";
import { hasOpenAiApiKey } from "./openaiKey";
import { findBookMove, applyUciLine } from "../components/train/openingUtils";

export interface CoachInsight {
  title: string;
  explanation: string;
  arrows: BoardArrow[];
  heatMap: number[];
  source: "gpt" | "local";
}

const CACHE_PREFIX = "chimera-coach-v3:";

const ARROW_COLORS = new Set<ArrowColor>([
  "green",
  "red",
  "blue",
  "gold",
  "cyan",
]);

function parseArrowSpec(
  from: string,
  to: string,
  color?: string
): BoardArrow | null {
  const f = parseSquare(from);
  const t = parseSquare(to);
  if (f === null || t === null) return null;
  const c = (color ?? "green") as ArrowColor;
  return {
    from: f,
    to: t,
    color: ARROW_COLORS.has(c) ? c : "green",
  };
}

interface GptCoachJson {
  title?: string;
  explanation?: string;
  arrows?: { from: string; to: string; color?: string }[];
  heatmapSquares?: Record<string, number>;
}

function cacheKey(openingId: string, ply: number, uci: string): string {
  return `${CACHE_PREFIX}${openingId}:${ply}:${uci}`;
}

function readCache(key: string): CoachInsight | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as CoachInsight;
  } catch {
    return null;
  }
}

function writeCache(key: string, insight: CoachInsight): void {
  try {
    localStorage.setItem(key, JSON.stringify(insight));
  } catch {
    /* quota */
  }
}

function stateBeforePly(opening: OpeningLine, ply: number): GameState {
  if (ply <= 0) return createInitialState();
  return applyUciLine(opening.moves.slice(0, ply));
}

function describeMovePurpose(
  opening: OpeningLine,
  state: GameState,
  uci: string
): string[] {
  const move = findBookMove(state, uci);
  if (!move) return ["This move continues the main line."];

  const san = formatMove(state, move);
  const mover = state.turn === "w" ? "White" : "Black";
  const lines: string[] = [];

  lines.push(
    `${mover} plays **${san}** in the ${opening.name} (${opening.eco}). ` +
      `This is ply ${state.fullmoveNumber}${state.turn === "b" ? "" : ""} of the battle for the center and king safety.`
  );

  const piece = state.board[move.from];
  if (piece?.type === "p") {
    lines.push(
      "The pawn move fights for space and may open lines for your pieces. " +
        "Ask: which square does this pawn control, and does it free a bishop or knight next?"
    );
  } else if (piece?.type === "n" || piece?.type === "b") {
    lines.push(
      "Development is not just getting pieces out — it is about **targets**. " +
        "This piece should eye weak squares (f7/f2, d5/e5) and stay coordinated with the rest of your army."
    );
  } else if (piece?.type === "q") {
    lines.push(
      "The queen is active early here — that can be powerful but risky. " +
        "Have a follow-up square in mind and avoid getting chased by minor pieces."
    );
  } else {
    lines.push(
      "This move fits the opening's strategic theme: complete development, castle when safe, and only then open the position."
    );
  }

  if (opening.userColor === state.turn) {
    lines.push(
      `As the student (${opening.userColor === "w" ? "White" : "Black"}), this is **your** repertoire move. ` +
        `Memorize the idea, not only the order — if Black deviates, you still want the same pawn structure and piece placement.`
    );
  } else {
    lines.push(
      "This is the opponent's main response. Notice what they threaten and which square you will challenge next in the line."
    );
  }

  return lines;
}

export function buildLocalCoachInsight(
  opening: OpeningLine,
  ply: number
): CoachInsight {
  if (ply < 0 || ply >= opening.moves.length) {
    return {
      title: `${opening.name} — overview`,
      explanation: [
        opening.tagline,
        `You train as **${opening.userColor === "w" ? "White" : "Black"}** along a ${opening.moves.length}-move main line.`,
        "Step through each move below. Toggle **heat map** to see square control and **arrows** for plans and threats.",
        hasOpenAiApiKey()
          ? "ChatGPT will deepen every explanation automatically."
          : "Add an OpenAI API key in Settings for full ChatGPT breakdowns on every move.",
      ].join("\n\n"),
      arrows: [],
      heatMap: computeControlHeat(createInitialState(), opening.userColor),
      source: "local",
    };
  }

  const state = stateBeforePly(opening, ply);
  const uci = opening.moves[ply];
  const move = findBookMove(state, uci);
  const san = move ? formatMove(state, move) : uci;
  const mover = state.turn === "w" ? "White" : "Black";

  let heatMap = computeControlHeat(state, opening.userColor);
  if (move) {
    heatMap = emphasizeMoveHeat(heatMap, move.from, move.to, 0.4);
  }

  const arrows: BoardArrow[] = move
    ? [
        {
          from: move.from,
          to: move.to,
          color: state.turn === opening.userColor ? "green" : "red",
        },
      ]
    : [];

  const paragraphs = describeMovePurpose(opening, state, uci);
  paragraphs.push(
    `**Plans after ${san}:** improve your worst-placed piece, connect rooks, and align with the opening's typical pawn breaks. ` +
      `If you forget the sequence, return to the idea: fight for the center, develop with tempo, and keep the king safe.`
  );

  return {
    title: `${mover}: ${san}`,
    explanation: paragraphs.join("\n\n"),
    arrows,
    heatMap,
    source: "local",
  };
}

function mergeHeatMap(
  local: number[],
  gptSquares?: Record<string, number>
): number[] {
  if (!gptSquares) return local;
  const merged = [...local];
  for (const [sqName, weight] of Object.entries(gptSquares)) {
    const sq = parseSquare(sqName);
    if (sq === null) continue;
    const w = Math.max(0, Math.min(1, Number(weight)));
    merged[sq] = Math.min(1, merged[sq] + w * 0.5);
  }
  const max = Math.max(...merged, 0.001);
  return merged.map((v) => v / max);
}

function parseGptInsight(
  json: GptCoachJson,
  opening: OpeningLine,
  ply: number
): CoachInsight {
  const local = buildLocalCoachInsight(opening, ply);
  const arrows: BoardArrow[] = [];
  for (const a of json.arrows ?? []) {
    const parsed = parseArrowSpec(a.from, a.to, a.color);
    if (parsed) arrows.push(parsed);
  }
  if (arrows.length === 0) return { ...local, source: "gpt" };

  return {
    title: json.title?.trim() || local.title,
    explanation: json.explanation?.trim() || local.explanation,
    arrows,
    heatMap: mergeHeatMap(local.heatMap, json.heatmapSquares),
    source: "gpt",
  };
}

async function fetchGptCoachInsight(
  opening: OpeningLine,
  ply: number
): Promise<CoachInsight | null> {
  if (ply < 0 || ply >= opening.moves.length) return null;

  const state = stateBeforePly(opening, ply);
  const uci = opening.moves[ply];
  const move = findBookMove(state, uci);
  const san = move ? formatMove(state, move) : uci;
  const fen = toFen(state);

  const system = `You are an expert chess coach using ChatGPT-style teaching: clear, thorough, encouraging.
Respond with ONLY valid JSON (no markdown fences) matching:
{
  "title": "string",
  "explanation": "string (4-6 short paragraphs: purpose, tactics, opponent plans, typical mistakes, middle-game idea)",
  "arrows": [{"from":"e2","to":"e4","color":"green|red|blue|gold|cyan"}],
  "heatmapSquares": {"e4":0.9,"d5":0.4}
}
Use 2-5 arrows: the move played, plus strategic squares (outposts, attacks, weak squares).
heatmapSquares: 6-12 squares with 0.2-1.0 importance for the side to move.`;

  const user = `Opening: ${opening.name} (${opening.eco})
Student plays: ${opening.userColor === "w" ? "White" : "Black"}
Ply index: ${ply + 1} of ${opening.moves.length}
FEN before move: ${fen}
Move to explain: ${san} (${uci})
${opening.tagline}`;

  const json = await chatCompletionJson<GptCoachJson>(system, user, {
    temperature: 0.4,
  });
  if (!json) throw new Error("Coach request failed");
  return parseGptInsight(json, opening, ply);
}

export async function loadCoachInsight(
  opening: OpeningLine,
  ply: number
): Promise<CoachInsight> {
  const uci = opening.moves[ply] ?? "start";
  const key = cacheKey(opening.id, ply, uci);
  const cached = readCache(key);
  if (cached?.source === "gpt") return cached;

  if (hasOpenAiApiKey()) {
    try {
      const gpt = await fetchGptCoachInsight(opening, ply);
      if (gpt) {
        writeCache(key, gpt);
        return gpt;
      }
    } catch {
      /* fall through */
    }
  }

  const local = buildLocalCoachInsight(opening, ply);
  if (!cached) writeCache(key, local);
  return cached ?? local;
}
