import { useCallback, useRef, useState } from "react";
import { buildGameReview } from "../review/buildGameReview";
import { enrichReviewWithTorch } from "../review/torchReview";
import type { GameReviewInput, GameReviewReport, ReviewProgress } from "../review/types";
import type { ChessEngine } from "../engine/types";
import { waitForEngineReady } from "../engine/torch";

export function useGameReview() {
  const [report, setReport] = useState<GameReviewReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<ReviewProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runId = useRef(0);

  const abortReview = useCallback(() => {
    runId.current += 1;
    setLoading(false);
    setProgress(null);
  }, []);

  const dismiss = useCallback(() => {
    abortReview();
    setReport(null);
    setError(null);
  }, [abortReview]);

  const failReview = useCallback((message: string) => {
    abortReview();
    setError(message);
  }, [abortReview]);

  const runReview = useCallback(
    async (
      stockfish: ChessEngine | null,
      input: GameReviewInput | null,
      torch?: ChessEngine | null
    ) => {
      if (!input || input.moves.length === 0) {
        setError("No moves to review.");
        return;
      }
      if (!stockfish) {
        setError("Engine not available.");
        return;
      }
      if (stockfish.loadFailed) {
        setError("Stockfish failed to load — refresh and try again.");
        return;
      }
      const sfReady = await waitForEngineReady(stockfish, 25_000);
      if (!sfReady) {
        setError(
          "Stockfish did not start in time — refresh the page and try again."
        );
        return;
      }

      let torchEngine = torch ?? null;
      if (torchEngine && !torchEngine.ready && !torchEngine.loadFailed) {
        const torchReady = await waitForEngineReady(torchEngine, 22_000);
        if (!torchReady || torchEngine.loadFailed) {
          torchEngine = null;
        }
      }
      if (torchEngine?.loadFailed) torchEngine = null;

      const id = ++runId.current;
      setLoading(true);
      setReport(null);
      setError(null);
      setProgress({
        step: 0,
        total: 1,
        label: torchEngine?.ready
          ? "Warming up Stockfish + Torch 4…"
          : "Warming up Stockfish…",
      });
      try {
        stockfish.stop();
        let result = await buildGameReview(stockfish, input, setProgress);
        if (torchEngine?.ready) {
          torchEngine.stop();
          result = await enrichReviewWithTorch(torchEngine, result, setProgress);
        }
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

  return {
    report,
    loading,
    progress,
    error,
    runReview,
    dismiss,
    abortReview,
    failReview,
  };
}
