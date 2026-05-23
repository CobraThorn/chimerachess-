import { useCallback, useRef, useState } from "react";
import { buildGameReview } from "../review/buildGameReview";
import type { GameReviewInput, GameReviewReport, ReviewProgress } from "../review/types";
import type { StockfishEngine } from "../engine/stockfish";

export function useGameReview() {
  const [report, setReport] = useState<GameReviewReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ReviewProgress | null>(null);
  const runId = useRef(0);

  const dismiss = useCallback(() => {
    setReport(null);
    setLoading(false);
    setProgress(null);
  }, []);

  const runReview = useCallback(
    async (engine: StockfishEngine | null, input: GameReviewInput | null) => {
      if (!engine?.ready || !input || input.moves.length === 0) return;
      const id = ++runId.current;
      setLoading(true);
      setReport(null);
      setProgress({ step: 0, total: 1, label: "Starting…" });
      try {
        const result = await buildGameReview(engine, input, setProgress);
        if (runId.current === id) {
          setReport(result);
        }
      } catch {
        if (runId.current === id) {
          setProgress(null);
        }
      } finally {
        if (runId.current === id) {
          setLoading(false);
        }
      }
    },
    []
  );

  return { report, loading, progress, runReview, dismiss };
}
