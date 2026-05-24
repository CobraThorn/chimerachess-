import { useEffect, useRef, useState } from "react";
import type { ChimeraMemory, StoredGame } from "../ai/types";
import { saveMemory } from "../ai/memory";
import { CHIMERA_MEMORY_EVENT } from "../ai/types";
import { runPostGameIntelligence } from "../intelligence/engine";
import { lastReportForGame } from "../intelligence/storage";
import type { PostGameIntelligenceReport } from "../intelligence/types";
import type { GameReviewReport, ReviewMode } from "../review/types";

export function usePostGameIntelligence(
  game: StoredGame | null,
  memory: ChimeraMemory | null,
  reviewReport: GameReviewReport | null,
  mode: ReviewMode = "chimera"
) {
  const [report, setReport] = useState<PostGameIntelligenceReport | null>(null);
  const [running, setRunning] = useState(false);
  const runKey = useRef<string | null>(null);

  useEffect(() => {
    if (!game || !memory) {
      setReport(null);
      runKey.current = null;
      return;
    }

    const key = `${game.id}:${reviewReport?.id ?? "heuristic"}`;
    if (runKey.current === key) return;

    const existing = memory.intelligence
      ? lastReportForGame(memory.intelligence, game.id)
      : undefined;
    if (existing && (!reviewReport || existing.reviewId === reviewReport.id)) {
      runKey.current = key;
      setReport(existing);
      return;
    }

    runKey.current = key;
    setRunning(true);
    try {
      const result = runPostGameIntelligence({
        game,
        memory,
        reviewReport,
        mode,
        moveTimesMs: game.userMoveTimesMs,
      });
      saveMemory(result.memory);
      window.dispatchEvent(new Event(CHIMERA_MEMORY_EVENT));
      setReport(result.report);
    } finally {
      setRunning(false);
    }
  }, [game, memory, reviewReport, mode]);

  return { report, running };
}
