import type { MistakeIntelligence, MistakePatternFamily } from "../types";
import { MISTAKE_INTEL_CONFIG } from "../config";

const THEME_TO_FAMILY: Record<string, { id: string; label: string; theme: MistakePatternFamily["theme"] }> = {
  "hanging piece": { id: "hanging_piece", label: "Hanging piece / undefended material", theme: "tactical" },
  "missed capture": { id: "missed_capture", label: "Missed capture or recapture", theme: "tactical" },
  "open file exposure": { id: "open_file", label: "Open-file infiltration", theme: "positional" },
  "king safety": { id: "king_safety", label: "King safety breakdown", theme: "positional" },
  "forcing move missed": { id: "forcing_missed", label: "Missed forcing move (check/capture)", theme: "tactical" },
  "tactical vulnerability": { id: "tactical_blind", label: "Tactical vulnerability", theme: "tactical" },
  "discovered attack": { id: "discovered", label: "Discovered attack patterns", theme: "tactical" },
};

const FAMILY_BY_ID: Record<string, { id: string; label: string; theme: MistakePatternFamily["theme"] }> = {
  ...Object.fromEntries(Object.values(THEME_TO_FAMILY).map((m) => [m.id, m])),
  opening_gap: { id: "opening_gap", label: "Opening preparation gaps", theme: "phase" },
  endgame: { id: "endgame", label: "Endgame technique", theme: "phase" },
  clock_pressure: { id: "clock_pressure", label: "Clock-pressure errors", theme: "cognitive" },
};

export function familyIdFromThemes(
  tactical: string[] = [],
  strategic: string[] = [],
  ply: number
): string[] {
  const ids = new Set<string>();
  for (const t of tactical) {
    const m = THEME_TO_FAMILY[t];
    if (m) ids.add(m.id);
  }
  for (const s of strategic) {
    const m = THEME_TO_FAMILY[s];
    if (m) ids.add(m.id);
  }
  if (ply <= MISTAKE_INTEL_CONFIG.openingPlyMax) ids.add("opening_gap");
  if (ply > MISTAKE_INTEL_CONFIG.middlegamePlyMax) ids.add("endgame");
  if (ply > 60) ids.add("clock_pressure");
  return [...ids];
}

export function updatePatternFamilies(
  existing: MistakePatternFamily[],
  mistakes: MistakeIntelligence[],
  gameId: string
): MistakePatternFamily[] {
  const map = new Map<string, MistakePatternFamily>();
  for (const f of existing) {
    map.set(f.id, { ...f, gameIds: [...f.gameIds] });
  }

  for (const m of mistakes) {
    for (const tag of m.patternTags) {
      const cleanId = tag.replace(":recurring", "");
      const meta = FAMILY_BY_ID[cleanId];
      if (!meta) continue;
      const prev = map.get(cleanId) ?? {
        id: cleanId,
        label: meta.label,
        theme: meta.theme,
        occurrences: 0,
        lastSeenAt: 0,
        gameIds: [],
        sampleHeadline: m.headline,
      };
      prev.occurrences += 1;
      prev.lastSeenAt = Date.now();
      if (!prev.gameIds.includes(gameId)) {
        prev.gameIds = [...prev.gameIds, gameId].slice(-MISTAKE_INTEL_CONFIG.maxGamesPerFamily);
      }
      prev.sampleHeadline = m.headline;
      map.set(cleanId, prev);
    }
  }

  return [...map.values()]
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, MISTAKE_INTEL_CONFIG.maxPatternFamilies);
}

export function recurringPatternMessages(
  families: MistakePatternFamily[],
  currentGameMistakes: MistakeIntelligence[]
): string[] {
  const lines: string[] = [];
  for (const f of families) {
    if (f.occurrences < 3) continue;
    lines.push(
      `${f.label} — seen ${f.occurrences} times across your archive (latest: "${f.sampleHeadline}").`
    );
  }
  const thisGameTags = new Set(currentGameMistakes.flatMap((m) => m.patternTags));
  for (const f of families) {
    if (f.occurrences >= 2 && thisGameTags.has(f.id) && f.occurrences < 3) {
      lines.push(`Emerging pattern: ${f.label} (${f.occurrences} games).`);
    }
  }
  return lines.slice(0, 6);
}

export function patternTagsForMistake(
  tactical: string[],
  strategic: string[],
  ply: number,
  families: MistakePatternFamily[]
): string[] {
  const ids = familyIdFromThemes(tactical, strategic, ply);
  const recurring = families.filter((f) => f.occurrences >= 3 && ids.includes(f.id));
  return ids.map((id) => {
    const fam = families.find((f) => f.id === id);
    if (fam && recurring.some((r) => r.id === id)) {
      return `${id}:recurring`;
    }
    return id;
  });
}
