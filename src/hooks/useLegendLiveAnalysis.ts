import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evalFromResult, formatEvalLabel } from "../engine/analysis";
import { createStockfishEngine, getEvaluation } from "../engine/stockfish";
import type { StockfishEngine } from "../engine/stockfish";
import type { LegendProfile } from "../content/legends";
import { buildLegendReplaySteps } from "../components/legends/legendReplay";
import {
  LEGEND_ANALYSIS_DEPTH,
  LEGEND_LITE_DEPTH,
  buildLegendCoachNote,
  loadLegendCoachNote,
  prefetchLegendCoachNotes,
} from "../components/legends/legendCoach";
import { isLowPowerDevice } from "../utils/deviceCapability";
import type { EvalPoint } from "../review/types";
import type { ReviewCoachNote } from "../review/types";

interface UseLegendLiveAnalysisOptions {
  /** When false, no Stockfish worker (section off-screen). */
  enabled?: boolean;
}

export function useLegendLiveAnalysis(
  legend: LegendProfile,
  options?: UseLegendLiveAnalysisOptions
) {
  const enabled = options?.enabled ?? true;
  const lite = isLowPowerDevice();
  const analysisDepth = lite ? LEGEND_LITE_DEPTH : LEGEND_ANALYSIS_DEPTH;

  const steps = useMemo(
    () => buildLegendReplaySteps(legend.game.moves),
    [legend.game.moves]
  );
  const [evalTimeline, setEvalTimeline] = useState<EvalPoint[]>([]);
  const [notes, setNotes] = useState<Map<number, ReviewCoachNote>>(new Map());
  const [engineReady, setEngineReady] = useState(false);
  const [evalPrefetchDone, setEvalPrefetchDone] = useState(0);
  const [notesPrefetchDone, setNotesPrefetchDone] = useState(0);
  const [loadingPly, setLoadingPly] = useState<number | null>(null);
  const engineRef = useRef<StockfishEngine | null>(null);
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const prefetchingNotes = useRef(false);
  const litePlyEvalRef = useRef<Map<number, EvalPoint>>(new Map());

  useEffect(() => {
    if (!enabled) {
      engineRef.current?.stop();
      return;
    }

    let cancelled = false;
    const engine = createStockfishEngine();
    engineRef.current = engine;
    setEvalTimeline([]);
    setNotes(new Map());
    setEngineReady(false);
    setEvalPrefetchDone(0);
    setNotesPrefetchDone(0);
    litePlyEvalRef.current = new Map();

    const onVisibility = () => {
      if (document.hidden) engine.stop();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const seedLocalNotes = (timeline: EvalPoint[]) => {
      const initial = new Map<number, ReviewCoachNote>();
      for (const step of steps) {
        const evalPt = timeline[step.ply];
        const evalBefore =
          step.ply > 0 ? timeline[step.ply - 1] : undefined;
        initial.set(
          step.ply,
          buildLegendCoachNote(
            legend,
            step,
            evalPt,
            evalBefore,
            legend.game.keyMoment
          )
        );
      }
      setNotes(initial);
    };

    const markLiteReady = () => {
      seedLocalNotes([]);
      if (!cancelled) {
        setEngineReady(true);
        setNotesPrefetchDone(steps.length);
      }
    };

    const readyPoll = window.setInterval(() => {
      if (cancelled) return;
      if (engine.ready) {
        window.clearInterval(readyPoll);
        if (lite) markLiteReady();
      }
    }, 100);

    (async () => {
      if (lite) return;

      const timeline: EvalPoint[] = [];
      for (let i = 0; i < steps.length; i++) {
        if (cancelled || document.hidden) return;
        try {
          const evalRes = await getEvaluation(
            engine,
            steps[i]!.fen,
            analysisDepth
          );
          const { cpWhite, isMate, mateIn } = evalFromResult(
            steps[i]!.fen,
            evalRes
          );
          timeline.push({
            ply: steps[i]!.ply,
            cpWhite,
            label: formatEvalLabel(cpWhite, isMate, mateIn),
          });
        } catch {
          timeline.push({
            ply: steps[i]!.ply,
            cpWhite: 0,
            label: formatEvalLabel(0),
          });
        }
        if (!cancelled) {
          setEvalTimeline([...timeline]);
          setEvalPrefetchDone(i + 1);
        }
      }

      if (cancelled) return;
      setEngineReady(true);
      seedLocalNotes(timeline);

      if (cancelled || prefetchingNotes.current) return;
      prefetchingNotes.current = true;
      const allNotes = await prefetchLegendCoachNotes(
        legend,
        steps,
        timeline,
        (done) => {
          if (!cancelled) setNotesPrefetchDone(done);
        }
      );
      if (!cancelled) {
        setNotes(allNotes);
        setNotesPrefetchDone(steps.length);
      }
      prefetchingNotes.current = false;
    })();

    return () => {
      cancelled = true;
      prefetchingNotes.current = false;
      window.clearInterval(readyPoll);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.stop();
      void engine.quit();
      engineRef.current = null;
    };
  }, [legend, steps, enabled, lite, analysisDepth]);

  const ensureLiteEval = useCallback(
    async (ply: number) => {
      const cached = litePlyEvalRef.current.get(ply);
      if (cached) return cached;
      const engine = engineRef.current;
      const step = steps[ply];
      if (!engine?.ready || !step) return undefined;
      try {
        const evalRes = await getEvaluation(engine, step.fen, analysisDepth);
        const { cpWhite, isMate, mateIn } = evalFromResult(
          step.fen,
          evalRes
        );
        const pt: EvalPoint = {
          ply,
          cpWhite,
          label: formatEvalLabel(cpWhite, isMate, mateIn),
        };
        litePlyEvalRef.current.set(ply, pt);
        setEvalTimeline((prev) => {
          const next = [...prev];
          next[ply] = pt;
          return next;
        });
        return pt;
      } catch {
        return undefined;
      }
    },
    [steps, analysisDepth]
  );

  const ensureNote = useCallback(
    async (ply: number) => {
      if (lite && enabled) {
        await ensureLiteEval(ply);
        if (ply > 0) await ensureLiteEval(ply - 1);
      }

      const existing = notesRef.current.get(ply);
      if (
        !lite &&
        existing?.source === "gpt" &&
        notesPrefetchDone >= steps.length
      ) {
        return;
      }

      const step = steps[ply];
      if (!step) return;
      setLoadingPly(ply);
      const evalPt =
        evalTimeline[ply] ??
        litePlyEvalRef.current.get(ply);
      const evalBefore =
        ply > 0
          ? evalTimeline[ply - 1] ?? litePlyEvalRef.current.get(ply - 1)
          : undefined;

      if (lite) {
        const local = buildLegendCoachNote(
          legend,
          step,
          evalPt,
          evalBefore,
          legend.game.keyMoment
        );
        setNotes((prev) => {
          const next = new Map(prev);
          next.set(ply, local);
          return next;
        });
        setLoadingPly(null);
        return;
      }

      const note = await loadLegendCoachNote(
        legend,
        step,
        evalPt,
        evalBefore
      );
      setNotes((prev) => {
        const next = new Map(prev);
        next.set(ply, note);
        return next;
      });
      setLoadingPly(null);
    },
    [
      legend,
      steps,
      evalTimeline,
      notesPrefetchDone,
      lite,
      enabled,
      ensureLiteEval,
    ]
  );

  const notesReady = lite
    ? engineReady
    : notesPrefetchDone >= steps.length && engineReady;

  return {
    steps,
    evalTimeline,
    notes,
    engineReady,
    notesReady,
    evalPrefetchDone,
    notesPrefetchDone,
    prefetchTotal: steps.length,
    loadingPly,
    ensureNote,
    analysisDepth,
    liteMode: lite,
  };
}
