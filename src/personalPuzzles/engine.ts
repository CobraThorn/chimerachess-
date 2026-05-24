import type { ChimeraMemory } from "../ai/types";
import type { IntelligenceArchive } from "../intelligence/types";
import { getIntelligenceArchive } from "../intelligence/storage";
import { PERSONAL_PUZZLE_CONFIG as CFG } from "./config";
import { buildPersonalPuzzles } from "./puzzleBuilder";
import { detectWeakpoints } from "./weakpointDetector";
import type { PersonalPuzzleDeck } from "./types";

export function rebuildPersonalPuzzleDeck(memory: ChimeraMemory): PersonalPuzzleDeck {
  const archive = getIntelligenceArchive(memory);
  const gamesSampled = memory.games.length;
  const unlocked = gamesSampled >= CFG.minGamesToUnlock;

  if (!unlocked) {
    return {
      version: 1,
      unlocked: false,
      gamesRequired: CFG.minGamesToUnlock,
      gamesSampled,
      weakpoints: [],
      puzzles: [],
      updatedAt: Date.now(),
      summary: `Play ${CFG.minGamesToUnlock - gamesSampled} more rated game${
        CFG.minGamesToUnlock - gamesSampled === 1 ? "" : "s"
      } vs CHIMERA to unlock puzzles built from your weak points.`,
    };
  }

  const weakpoints = detectWeakpoints(archive);
  const puzzles = buildPersonalPuzzles(memory, archive, weakpoints);

  const top = weakpoints[0];
  const summary =
    puzzles.length > 0
      ? `${puzzles.length} custom puzzle${puzzles.length > 1 ? "s" : ""} from your last ${Math.min(gamesSampled, CFG.recentGamesWindow)} games` +
        (top ? ` — top focus: ${top.label}.` : ".")
      : "Keep playing reviewed games; puzzles appear when the engine spots recurring mistakes.";

  return {
    version: 1,
    unlocked: true,
    gamesRequired: CFG.minGamesToUnlock,
    gamesSampled,
    weakpoints,
    puzzles,
    updatedAt: Date.now(),
    summary,
  };
}

export function attachPersonalPuzzleDeck(
  archive: IntelligenceArchive,
  deck: PersonalPuzzleDeck
): IntelligenceArchive {
  return {
    ...archive,
    personalPuzzles: deck,
    updatedAt: Date.now(),
  };
}

export function getPersonalPuzzleDeck(memory: ChimeraMemory): PersonalPuzzleDeck {
  const archive = getIntelligenceArchive(memory);
  return (
    archive.personalPuzzles ??
    rebuildPersonalPuzzleDeck(memory)
  );
}
