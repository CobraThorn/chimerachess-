import { useCallback, useEffect, useState } from "react";
import { createAnalysisEngine, listAvailableEngines } from "../engine/registry";
import type { ChessEngine, EngineDescriptor } from "../engine/types";
import {
  acquireSharedStockfish,
  releaseSharedStockfish,
} from "../engine/stockfishPool";

export function useAnalysisEngines() {
  const [descriptors, setDescriptors] = useState<EngineDescriptor[]>([]);
  const [stockfish, setStockfish] = useState<ChessEngine | null>(null);
  const [torch, setTorch] = useState<ChessEngine | null>(null);
  const [sfReady, setSfReady] = useState(false);
  const [torchReady, setTorchReady] = useState(false);
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

  const ensureTorch = useCallback(async () => {
    if (torch?.ready) return torch;
    if (torch?.loadFailed) return null;
    if (!descriptors.some((d) => d.id === "torch")) return null;

    const eng = createAnalysisEngine("torch");
    setTorch(eng);
    const deadline = Date.now() + 22_000;
    while (Date.now() < deadline) {
      if (eng.ready) {
        setTorchReady(true);
        return eng;
      }
      if (eng.loadFailed) return null;
      await new Promise((r) => setTimeout(r, 80));
    }
    return eng.ready ? eng : null;
  }, [descriptors, torch]);

  useEffect(() => {
    return () => {
      torch?.quit();
    };
  }, [torch]);

  return {
    descriptors,
    stockfish,
    torch,
    sfReady,
    torchReady,
    engineError,
    ensureTorch,
    hasTorch: descriptors.some((d) => d.id === "torch"),
  };
}

export type AnalysisEngineMode = "stockfish" | "torch" | "dual";

export function engineForMode(
  mode: AnalysisEngineMode,
  sf: ChessEngine | null,
  torchEng: ChessEngine | null
): ChessEngine | null {
  if (mode === "torch") return torchEng;
  return sf;
}
