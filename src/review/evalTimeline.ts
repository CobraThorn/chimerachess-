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
  const out: EvalPoint[] = [];
  for (let i = 0; i < points.length; i++) {
    out.push(points[i] ?? pointFromCp(i, 0));
  }

  let i = 0;
  while (i < points.length) {
    if (points[i] !== null) {
      i += 1;
      continue;
    }

    let prevIdx = i - 1;
    while (prevIdx >= 0 && points[prevIdx] === null) prevIdx -= 1;

    let nextIdx = i;
    while (nextIdx < points.length && points[nextIdx] === null) nextIdx += 1;

    const prevCp = prevIdx >= 0 ? out[prevIdx].cpWhite : out[0]?.cpWhite ?? 0;
    const nextCp =
      nextIdx < points.length ? out[nextIdx].cpWhite : prevCp;
    const start = prevIdx >= 0 ? prevIdx : 0;
    const end = nextIdx < points.length ? nextIdx : points.length - 1;
    const span = Math.max(1, end - start);

    for (let j = start + 1; j < end; j++) {
      const t = (j - start) / span;
      out[j] = pointFromCp(j, Math.round(prevCp + (nextCp - prevCp) * t));
    }
    i = nextIdx >= points.length ? points.length : nextIdx;
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
