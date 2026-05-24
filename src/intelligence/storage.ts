import type { ChimeraMemory } from "../ai/types";
import { PHENOTYPE_AXIS_META } from "./config";
import type { MistakePatternFamily } from "../mistakeIntel/types";
import type {
  IntelligenceArchive,
  IntelligencePhenotypeKey,
  PostGameIntelligenceReport,
} from "./types";
import { createDefaultPhenotypeState } from "./services/phenotypeUpdateEngine";

export function createEmptyArchive(): IntelligenceArchive {
  const phenotype = {} as Record<IntelligencePhenotypeKey, import("./types").PhenotypeState>;
  for (const axis of PHENOTYPE_AXIS_META) {
    phenotype[axis.key] = createDefaultPhenotypeState();
  }
  return {
    version: 1,
    phenotype,
    reports: [],
    updatedAt: Date.now(),
  };
}

export function getIntelligenceArchive(memory: ChimeraMemory): IntelligenceArchive {
  if (memory.intelligence?.version === 1) {
    return memory.intelligence;
  }
  return createEmptyArchive();
}

export function attachIntelligenceToMemory(
  memory: ChimeraMemory,
  archive: IntelligenceArchive
): ChimeraMemory {
  return { ...memory, intelligence: archive };
}

export function appendReportToArchive(
  archive: IntelligenceArchive,
  report: PostGameIntelligenceReport,
  maxReports: number
): IntelligenceArchive {
  const reports = [...archive.reports.filter((r) => r.gameId !== report.gameId), report].slice(
    -maxReports
  );
  return {
    ...archive,
    reports,
    updatedAt: Date.now(),
  };
}

export function lastReportForGame(
  archive: IntelligenceArchive,
  gameId: string
): PostGameIntelligenceReport | undefined {
  return archive.reports.find((r) => r.gameId === gameId);
}

export function previousReport(
  archive: IntelligenceArchive,
  excludeGameId: string
): PostGameIntelligenceReport | undefined {
  const filtered = archive.reports.filter((r) => r.gameId !== excludeGameId);
  return filtered[filtered.length - 1];
}

export function mergeMistakeFamilies(
  archive: IntelligenceArchive,
  families: MistakePatternFamily[]
): IntelligenceArchive {
  return {
    ...archive,
    mistakeFamilies: families,
    updatedAt: Date.now(),
  };
}
