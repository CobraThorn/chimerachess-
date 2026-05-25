import { useEffect, useState } from "react";
import { listAvailableEngines } from "../engine/registry";
import type { ChessEngine, EngineDescriptor } from "../engine/types";
import {
  acquireSharedStockfish,
  releaseSharedStockfish,
} from "../engine/stockfishPool";

export function useAnalysisEngines() {
  const [descriptors, setDescriptors] = useState<EngineDescriptor[]>([]);
  const [stockfish, setStockfish] = useState<ChessEngine | null>(null);
  const [sfReady, setSfReady] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setEngineError(null);

    void listAvailableEngines().then((list) => {
      if (!cancelled) setDescriptors(list);
    });

    void acquireSharedStockfish()
      .then((sf) => {
        if (cancelled) return;
        setStockfish(sf);
        setSfReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setEngineError(
            "Stockfish failed to load — hard-refresh or check /stockfish/ assets."
          );
        }
      });

    return () => {
      cancelled = true;
      releaseSharedStockfish();
      setStockfish(null);
      setSfReady(false);
    };
  }, []);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) stockfish?.stop();
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [stockfish]);

  return {
    descriptors,
    stockfish,
    sfReady,
    engineError,
  };
}
