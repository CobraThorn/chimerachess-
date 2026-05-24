import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hasOpenAiApiKey } from "../api/openaiKey";
import type { MistakeIntelligence } from "../mistakeIntel/types";
import {
  buildCoachSummary,
  loadReviewCoachNote,
  prefetchReviewCoachNotes,
} from "../review/reviewCoach";
import type { GameReviewReport, ReviewCoachNote } from "../review/types";

export function useReviewCoach(
  report: GameReviewReport | null,
  mistakesByPly?: Map<number, MistakeIntelligence>
) {
  const [notes, setNotes] = useState<Map<number, ReviewCoachNote>>(new Map());
  const [coachSummary, setCoachSummary] = useState<string | null>(null);
  const [prefetchDone, setPrefetchDone] = useState(0);
  const [prefetchTotal, setPrefetchTotal] = useState(0);
  const [loadingPly, setLoadingPly] = useState<number | null>(null);
  const runId = useRef(0);
  const notesRef = useRef(notes);
  notesRef.current = notes;

  const mistakeKey = useMemo(() => {
    if (!mistakesByPly?.size) return "";
    return [...mistakesByPly.keys()].sort((a, b) => a - b).join(",");
  }, [mistakesByPly]);

  useEffect(() => {
    if (!report) {
      setNotes(new Map());
      setCoachSummary(null);
      setPrefetchDone(0);
      setPrefetchTotal(0);
      return;
    }

    const id = ++runId.current;
    setPrefetchTotal(report.recapSteps.length);
    setPrefetchDone(0);

    void buildCoachSummary(report).then((summary) => {
      if (runId.current === id) setCoachSummary(summary);
    });

    void prefetchReviewCoachNotes(
      report,
      (done, total) => {
        if (runId.current === id) {
          setPrefetchDone(done);
          setPrefetchTotal(total);
        }
      },
      mistakesByPly
    ).then((map) => {
      if (runId.current === id) setNotes(new Map(map));
    });
  }, [report?.id, mistakeKey]);

  useEffect(() => {
    if (!report || !mistakesByPly?.size || !hasOpenAiApiKey()) return;

    let cancelled = false;
    void (async () => {
      for (const [ply, mi] of mistakesByPly) {
        if (cancelled) break;
        const note = await loadReviewCoachNote(report, ply, {
          mistakeIntel: mi,
          forceRefresh: true,
        });
        if (!cancelled) {
          setNotes((prev) => new Map(prev).set(ply, note));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [report, mistakesByPly, mistakeKey]);

  const ensureNote = useCallback(
    async (ply: number) => {
      if (!report || notesRef.current.has(ply)) return;
      setLoadingPly(ply);
      try {
        const note = await loadReviewCoachNote(report, ply, {
          mistakeIntel: mistakesByPly?.get(ply),
        });
        setNotes((prev) => new Map(prev).set(ply, note));
      } finally {
        setLoadingPly(null);
      }
    },
    [report, mistakesByPly]
  );

  return {
    notes,
    coachSummary,
    prefetchDone,
    prefetchTotal,
    loadingPly,
    ensureNote,
    gptEnabled: hasOpenAiApiKey(),
  };
}
