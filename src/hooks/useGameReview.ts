import { useCallback, useRef, useState } from "react";
import { buildGameReview } from "../review/buildGameReview";
import { reviewDiag } from "../review/reviewDiagnostics";
import { enrichReviewWithTorch } from "../review/torchReview";
import type { GameReviewInput, GameReviewReport, ReviewProgress } from "../review/types";
import type { ChessEngine } from "../engine/types";
import { runWithSharedTorch } from "../engine/enginePool";
import { waitForEngineReady } from "../engine/torch";
import { isLowPowerDevice } from "../utils/deviceCapability";

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
    setError(null);
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
      _torch?: ChessEngine | null
    ) => {
      if (!input || input.moves.length === 0) {
        reviewDiag("error", { reason: "no_moves" });
        setError("No moves to review.");
        return;
      }
      if (!stockfish) {
        reviewDiag("error", { reason: "no_engine" });
        setError("Engine not available.");
        return;
      }
      if (stockfish.loadFailed) {
        reviewDiag("engine_fail", { which: "stockfish" });
        setError("Stockfish failed to load — refresh and try again.");
        return;
      }

      const id = ++runId.current;
      setLoading(true);
      setReport(null);
      setError(null);
      setProgress({ step: 0, total: 1, label: "Starting Stockfish…" });

      reviewDiag("run_start", {
        gameId: input.id,
        plies: input.moves.length,
        lowPower: isLowPowerDevice(),
      });

      try {
        const sfReady = await waitForEngineReady(stockfish, 25_000);
        if (runId.current !== id) return;
        if (!sfReady) {
          reviewDiag("engine_fail", { which: "stockfish", reason: "timeout" });
          setError(
            "Stockfish did not start in time — refresh the page and try again."
          );
          return;
        }
        reviewDiag("engine_ready", { which: "stockfish" });

        stockfish.stop();
        let result = await buildGameReview(
          stockfish,
          input,
          (p) => {
            if (runId.current === id) setProgress(p);
          },
          () => runId.current !== id
        );
        if (runId.current !== id) {
          stockfish.stop();
          return;
        }

        if (!isLowPowerDevice()) {
          reviewDiag("torch_start", {});
          const enriched = await runWithSharedTorch((torchEngine) =>
            enrichReviewWithTorch(torchEngine, result, (p) => {
              if (runId.current === id) setProgress(p);
            })
          );
          if (enriched) {
            result = enriched;
            reviewDiag("torch_done", { used: true });
          }
        }

        if (runId.current === id) {
          setReport(result);
          reviewDiag("complete", {
            accuracy: result.accuracy,
            userMoves: result.userMoves.length,
          });
        }
      } catch (e) {
        if (runId.current !== id) {
          stockfish.stop();
          return;
        }
        reviewDiag("error", {
          message: e instanceof Error ? e.message : String(e),
        });
        setProgress(null);
        setError(
          e instanceof Error
            ? e.message
            : "Review failed — the engine may have been interrupted."
        );
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
