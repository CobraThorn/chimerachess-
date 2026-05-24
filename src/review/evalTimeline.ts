import { formatEvalLabel, evalFromResult } from "../engine/analysis";
import type { StockfishEngine } from "../engine/stockfish";
import { getEvaluation } from "../engine/stockfish";
import type { EvalPoint } from "./types";
import type { ReviewMoveAnalysis } from "./types";

function pointFromCp(ply: number, cpWhite: number, isMate = false, mateIn?: number): EvalPoint {
  return {
    ply,
    cpWhite,
    label: formatEvalLabel(cpWhite, isMate, mateIn),
  };
}

/** Fill gaps with linear interpolation between engine-known plies. */
function interpolateGaps(points: (EvalPoint | null)[]): EvalPoint[] {
  const out: EvalPoint[] = points.map((p, i) => p ?? pointFromCp(i, 0));

  let firstKnown = out.findIndex((_, i) => points[i] !== null);
  if (firstKnown < 0) return out;
  for (let i = 0; i < firstKnown; i++) {
    out[i] = { ...out[firstKnown]!, ply: i };
  }

  let i = firstKnown;
  while (i < points.length) {
    if (points[i] !== null) {
      i += 1;
      continue;
    }

    let prevIdx = i - 1;
    let nextIdx = i;
    while (nextIdx < points.length && points[nextIdx] === null) nextIdx += 1;

    const prevCp = out[prevIdx]?.cpWhite ?? 0;
    const nextCp =
      nextIdx < points.length ? out[nextIdx]!.cpWhite : prevCp;
    const span = Math.max(1, nextIdx - prevIdx);

    for (let j = prevIdx + 1; j < nextIdx; j++) {
      const t = (j - prevIdx) / span;
      out[j] = pointFromCp(j, Math.round(prevCp + (nextCp - prevCp) * t));
    }
    i = nextIdx >= points.length ? points.length : nextIdx;
  }

  let lastKnown = -1;
  for (let i = points.length - 1; i >= 0; i--) {
    if (points[i] !== null) {
      lastKnown = i;
      break;
    }
  }
  if (lastKnown >= 0) {
    for (let i = lastKnown + 1; i < points.length; i++) {
      out[i] = { ...out[lastKnown]!, ply: i };
    }
  }

  return out;
}

/**
 * Build eval graph from graded user moves (no per-ply Stockfish pass).
 * Only ply 0 may need a shallow search when the user did not move first.
 */
export async function buildEvalTimelineFromGrades(
  engine: StockfishEngine,
  totalPlies: number,
  userAnalyses: ReviewMoveAnalysis[],
  startFen: string,
  startDepth: number
): Promise<EvalPoint[]> {
  const slots: (EvalPoint | null)[] = Array(totalPlies + 1).fill(null);

  for (const u of userAnalyses) {
    slots[u.ply - 1] = pointFromCp(u.ply - 1, u.evalBeforeWhite);
    slots[u.ply] = pointFromCp(u.ply, u.evalAfterWhite);
  }

  if (slots[0] === null) {
    engine.stop();
    const evalRes = await getEvaluation(engine, startFen, startDepth);
    const { cpWhite, isMate, mateIn } = evalFromResult(startFen, evalRes);
    slots[0] = pointFromCp(0, cpWhite, isMate, mateIn);
  }

  return interpolateGaps(slots);
}
