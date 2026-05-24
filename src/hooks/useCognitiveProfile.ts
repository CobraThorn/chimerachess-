import { useCallback, useEffect, useMemo, useState } from "react";
import type { ChimeraMemory } from "../ai/types";
import { saveMemory } from "../ai/memory";
import { CHIMERA_MEMORY_EVENT } from "../ai/types";
import { getIntelligenceArchive } from "../intelligence/storage";
import {
  rebuildCognitiveProfile,
  rebuildCognitiveProfileWithGpt,
} from "../cognitiveProfile/engine";
import type {
  CognitivePlayerProfile,
  CognitiveTimelineEventType,
} from "../cognitiveProfile/types";
import { filterTimeline } from "../cognitiveProfile/timelineDetector";
import { hasOpenAiApiKey } from "../api/openaiKey";

export function useCognitiveProfile(memory: ChimeraMemory) {
  const [profile, setProfile] = useState<CognitivePlayerProfile | null>(() => {
    const archive = getIntelligenceArchive(memory);
    if (archive.reports.length >= 4) {
      return archive.cognitiveProfile ?? rebuildCognitiveProfile(memory);
    }
    return archive.cognitiveProfile ?? null;
  });
  const [filter, setFilter] = useState<CognitiveTimelineEventType | "all">("all");
  const [gptLoading, setGptLoading] = useState(false);

  useEffect(() => {
    const archive = getIntelligenceArchive(memory);
    if (archive.reports.length >= 4) {
      setProfile(archive.cognitiveProfile ?? rebuildCognitiveProfile(memory));
    } else {
      setProfile(archive.cognitiveProfile ?? null);
    }
  }, [memory]);

  const filteredTimeline = useMemo(() => {
    if (!profile) return [];
    return filterTimeline(profile.timeline, filter);
  }, [profile, filter]);

  const refreshGpt = useCallback(async () => {
    if (!hasOpenAiApiKey() || !profile) return;
    setGptLoading(true);
    try {
      const { profile: next, memory: nextMem } =
        await rebuildCognitiveProfileWithGpt(memory);
      saveMemory(nextMem);
      window.dispatchEvent(new Event(CHIMERA_MEMORY_EVENT));
      setProfile(next);
    } finally {
      setGptLoading(false);
    }
  }, [memory, profile]);

  useEffect(() => {
    if (!profile || profile.gptSummary || !hasOpenAiApiKey()) return;
    if (profile.gamesAnalyzed < 4) return;
    void refreshGpt();
  }, [profile?.updatedAt, profile?.gamesAnalyzed]);

  return {
    profile,
    filteredTimeline,
    filter,
    setFilter,
    gptEnabled: hasOpenAiApiKey(),
    gptLoading,
    refreshGpt,
  };
}
