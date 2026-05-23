import { useCallback, useRef, useState } from "react";
import { buildGameReview } from "../review/buildGameReview";
import type { GameReviewInput, GameReviewReport, ReviewProgress } from "../review/types";
import type { StockfishEngine } from "../engine/stockfish";

export function useGameReview() {
  const [report, setReport] = useState<GameReviewReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ReviewProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const dismiss = useCallback(() => {
    setReport(null);
    setLoading(false);
    setProgress(null);
    setError(null);
  }, []);

  const runReview = useCallback(
    async (engine: StockfishEngine | null, input: GameReviewInput | null) => {
      if (!input || input.moves.length === 0) {
        setError("No moves to review.");
        return;
      }
      if (!engine?.ready) {
        setError("Engine not ready — try closing and reopening the review.");
        return;
      }

      const id = ++runId.current;
      setLoading(true);
      setReport(null);
      setError(null);
      setProgress({ step: 0, total: 1, label: "Starting…" });
      try {
        engine.stop();
        const result = await buildGameReview(engine, input, setProgress);
        if (runId.current === id) {
          setReport(result);
        }
      } catch (e) {
        if (runId.current === id) {
          setProgress(null);
          setError(
            e instanceof Error
              ? e.message
              : "Review failed — the engine may have been interrupted."
          );
        }
      } finally {
        if (runId.current === id) {
          setLoading(false);
        }
      }
    },
    []
  );

  return { report, loading, progress, error, runReview, dismiss };
}
