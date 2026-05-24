import type { IntelligenceArchive } from "../intelligence/types";
import type { MistakePatternFamily } from "../mistakeIntel/types";
import { PERSONAL_PUZZLE_CONFIG as CFG } from "./config";
import type { DetectedWeakpoint, WeakpointTheme } from "./types";

function themeFromFamily(f: MistakePatternFamily): WeakpointTheme {
  return f.theme;
}

function bump(
  map: Map<string, DetectedWeakpoint>,
  id: string,
  label: string,
  theme: WeakpointTheme,
  weight: number,
  insight: string
) {
  const prev = map.get(id);
  if (prev) {
    prev.priority += weight;
    prev.occurrences += 1;
    return;
  }
  map.set(id, {
    id,
    label,
    theme,
    priority: weight,
    occurrences: 1,
    insight,
  });
}

export function detectWeakpoints(archive: IntelligenceArchive): DetectedWeakpoint[] {
  const map = new Map<string, DetectedWeakpoint>();
  const families = archive.mistakeFamilies ?? [];

  for (const f of families) {
    if (f.occurrences < 1) continue;
    bump(
      map,
      f.id,
      f.label,
      themeFromFamily(f),
      f.occurrences * 14,
      `Seen ${f.occurrences}× in your last games — ${f.sampleHeadline}`
    );
  }

  const reports = archive.reports.slice(-CFG.recentReportsWindow);
  for (const r of reports) {
    for (const w of r.weaknesses) {
      const key = w.slice(0, 48).toLowerCase().replace(/\s+/g, "_");
      bump(map, `weak_${key}`, w, "positional", 8, r.headline);
    }
    for (const focus of r.recommendedFocus) {
      const key = focus.slice(0, 40).toLowerCase().replace(/\s+/g, "_");
      bump(map, `focus_${key}`, focus, "cognitive", 10, r.summary);
    }
  }

  const profile = archive.cognitiveProfile;
  if (profile) {
    for (const cycle of profile.insights.biggestWeaknessCycles.slice(0, 4)) {
      bump(map, `cycle_${cycle.id}`, cycle.title, "cognitive", 12, cycle.detail);
    }
  }

  for (const r of reports) {
    for (const m of r.phenotypeMovement) {
      if (m.delta >= 0) continue;
      bump(
        map,
        `pheno_${m.key}`,
        `${m.label} under strain`,
        "cognitive",
        Math.min(18, Math.abs(m.delta)),
        m.interpretation
      );
    }
  }

  if (map.size === 0) {
    bump(
      map,
      "calculation",
      "Calculation & tactics",
      "tactical",
      20,
      "Build pattern recognition from your own missed wins."
    );
    bump(
      map,
      "consistency",
      "Decision consistency",
      "cognitive",
      15,
      "Reduce swing between your best and worst moves."
    );
  }

  return [...map.values()]
    .sort((a, b) => b.priority - a.priority)
    .slice(0, CFG.maxWeakpoints);
}
