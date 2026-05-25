import { useCallback, useEffect, useRef, useState } from "react";
import type { OpeningLine } from "../content/openings";
import {
  buildLocalCoachInsight,
  loadCoachInsight,
  type CoachInsight,
} from "../api/openingCoach";
import { hasOpenAiApiKey } from "../api/openaiKey";

export function useOpeningCoach(opening: OpeningLine, focusPly: number) {
  const [insight, setInsight] = useState<CoachInsight | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    const local = buildLocalCoachInsight(opening, focusPly);
    if (id === requestId.current) setInsight(local);

    try {
      const result = await loadCoachInsight(opening, focusPly);
      if (id === requestId.current) setInsight(result);
    } catch (e) {
      if (id === requestId.current) {
        setError(e instanceof Error ? e.message : "Coach unavailable");
        setInsight(local);
      }
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [opening, focusPly]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    insight,
    loading,
    error,
    refresh,
    gptEnabled: hasOpenAiApiKey(),
  };
}
