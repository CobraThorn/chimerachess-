import type { ChimeraMemory } from "../ai/types";
import type { IntelligenceArchive, IntelligencePhenotypeKey } from "../intelligence/types";
import { getIntelligenceArchive } from "../intelligence/storage";
import { PHENOTYPE_AXIS_META } from "../intelligence/config";
import type { GameSeriesPoint } from "./types";

const AXES = PHENOTYPE_AXIS_META.map((a) => a.key);

function phenotypeAtGame(
  archive: IntelligenceArchive,
  gameId: string
): Record<IntelligencePhenotypeKey, number> {
  const out = {} as Record<IntelligencePhenotypeKey, number>;
  for (const key of AXES) {
    const state = archive.phenotype[key];
    const hist = state?.history ?? [];
    const pt = hist.find((h) => h.gameId === gameId);
    out[key] = pt?.score ?? state?.score ?? 50;
  }
  return out;
}

export function buildGameSeries(memory: ChimeraMemory): GameSeriesPoint[] {
  const archive = getIntelligenceArchive(memory);
  const reports = archive.reports;
  const gameById = new Map(memory.games.map((g) => [g.id, g]));

  return reports.map((r, index) => {
    const stored = gameById.get(r.gameId);
    const times = stored?.userMoveTimesMs ?? [];
    const avgMoveTimeMs =
      times.length > 0
        ? Math.round(times.reduce((a, b) => a + b, 0) / times.length)
        : undefined;

    return {
      index: index + 1,
      gameId: r.gameId,
      at: r.generatedAt,
      accuracy: r.gameAnalysis.accuracy,
      acpl: r.gameAnalysis.acpl,
      blunders: r.gameAnalysis.blunders,
      openingAccuracy: r.gameAnalysis.openingAccuracy,
      endgameAccuracy: r.gameAnalysis.endgameAccuracy,
      openingLine: r.gameAnalysis.openingLine,
      phenotype: phenotypeAtGame(archive, r.gameId),
      avgMoveTimeMs,
    };
  });
}

export function windowMean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function windowStdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = windowMean(values);
  const v =
    values.reduce((s, x) => s + (x - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(v);
}

export function linearSlope(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;
  const xs = values.map((_, i) => i);
  const meanX = windowMean(xs);
  const meanY = windowMean(values);
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i]! - meanX) * (values[i]! - meanY);
    den += (xs[i]! - meanX) ** 2;
  }
  return den === 0 ? 0 : num / den;
}
