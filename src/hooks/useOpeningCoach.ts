import { useCallback, useEffect, useState } from "react";
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

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const local = buildLocalCoachInsight(opening, focusPly);
    setInsight(local);

    try {
      const result = await loadCoachInsight(opening, focusPly);
      setInsight(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Coach unavailable");
      setInsight(local);
    } finally {
      setLoading(false);
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
