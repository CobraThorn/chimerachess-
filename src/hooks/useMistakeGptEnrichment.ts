import { useEffect, useRef, useState } from "react";
import { hasOpenAiApiKey } from "../api/openaiKey";
import { enrichMistakeReportWithGpt } from "../mistakeIntel/gptEnrichment";
import type { MistakeIntelligenceReport } from "../mistakeIntel/types";
import type { GameReviewReport } from "../review/types";

export function useMistakeGptEnrichment(
  report: MistakeIntelligenceReport | null | undefined,
  reviewReport: GameReviewReport | null
) {
  const [enriched, setEnriched] = useState<MistakeIntelligenceReport | null>(null);
  const [enriching, setEnriching] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const runKey = useRef<string | null>(null);

  useEffect(() => {
    if (!report || !reviewReport) {
      setEnriched(null);
      runKey.current = null;
      return;
    }

    const key = `${report.reviewId}:${report.mistakes.length}`;
    if (!hasOpenAiApiKey()) {
      setEnriched(report);
      runKey.current = key;
      return;
    }

    if (runKey.current === key) return;

    runKey.current = key;
    setEnriched(report);
    setEnriching(true);
    setProgress({ done: 0, total: report.mistakes.length });

    let cancelled = false;
    void enrichMistakeReportWithGpt(report, reviewReport, (done, total) => {
      if (!cancelled) setProgress({ done, total });
    }).then((next) => {
      if (!cancelled) {
        setEnriched(next);
        setEnriching(false);
      }
    });

    return () => {
      cancelled = true;
      setEnriching(false);
    };
  }, [report, reviewReport?.id]);

  return {
    report: enriched ?? report ?? null,
    enriching,
    progress,
    gptEnabled: hasOpenAiApiKey(),
  };
}
