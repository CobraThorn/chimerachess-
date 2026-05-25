import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { evalFromResult, formatEvalLabel } from "../engine/analysis";
import { createStockfishEngine, getEvaluation } from "../engine/stockfish";
import type { StockfishEngine } from "../engine/stockfish";
import type { LegendProfile } from "../content/legends";
import { buildLegendReplaySteps } from "../components/legends/legendReplay";
import {
  LEGEND_ANALYSIS_DEPTH,
  buildLegendCoachNote,
  loadLegendCoachNote,
  prefetchLegendCoachNotes,
} from "../components/legends/legendCoach";
import type { EvalPoint } from "../review/types";
import type { ReviewCoachNote } from "../review/types";

export function useLegendLiveAnalysis(legend: LegendProfile) {
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

  useEffect(() => {
    let cancelled = false;
    const engine = createStockfishEngine();
    engineRef.current = engine;
    setEvalTimeline([]);
    setNotes(new Map());
    setEngineReady(false);
    setEvalPrefetchDone(0);
    setNotesPrefetchDone(0);

    (async () => {
      const timeline: EvalPoint[] = [];
      for (let i = 0; i < steps.length; i++) {
        if (cancelled) return;
        try {
          const evalRes = await getEvaluation(
            engine,
            steps[i]!.fen,
            LEGEND_ANALYSIS_DEPTH
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
      if (!cancelled) setNotes(initial);

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
      engine.stop();
      void engine.quit();
      engineRef.current = null;
    };
  }, [legend, steps]);

  const ensureNote = useCallback(
    async (ply: number) => {
      const existing = notesRef.current.get(ply);
      if (existing && (existing.source === "gpt" || notesPrefetchDone >= steps.length)) {
        return;
      }
      const step = steps[ply];
      if (!step) return;
      setLoadingPly(ply);
      const evalPt = evalTimeline[ply];
      const evalBefore = ply > 0 ? evalTimeline[ply - 1] : undefined;
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
    [legend, steps, evalTimeline, notesPrefetchDone]
  );

  const notesReady = notesPrefetchDone >= steps.length && engineReady;

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
    analysisDepth: LEGEND_ANALYSIS_DEPTH,
  };
}
