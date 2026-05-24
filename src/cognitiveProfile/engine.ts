import type { ChimeraMemory } from "../ai/types";
import type { IntelligenceArchive } from "../intelligence/types";
import { getIntelligenceArchive } from "../intelligence/storage";
import { buildGameSeries } from "./seriesBuilder";
import { detectCognitiveTimeline } from "./timelineDetector";
import { buildPlayerIdentity } from "./identityEngine";
import { buildChessMaturity } from "./maturityEngine";
import { buildProfileInsights } from "./insightsEngine";
import type { CognitivePlayerProfile } from "./types";

export function rebuildCognitiveProfile(memory: ChimeraMemory): CognitivePlayerProfile {
  const archive = getIntelligenceArchive(memory);
  const series = buildGameSeries(memory);
  const previous = archive.cognitiveProfile;

  let timeline = detectCognitiveTimeline(
    series,
    archive.mistakeFamilies ?? []
  );

  const identity = buildPlayerIdentity(archive, series, previous?.identity);

  for (const shift of identity.historicalShifts.slice(0, 3)) {
    timeline.push({
      id: `id-shift-${shift.at}`,
      timestamp: shift.at,
      type: "identity_shift",
      title: `Identity: ${shift.toLabel}`,
      explanation: shift.message,
      confidence: shift.confidence,
      importanceScore: 72,
      evidence: [
        {
          metric: "identity",
          change: 1,
          explanation: `Prior dominant: ${shift.fromLabel}.`,
        },
      ],
    });
  }
  timeline = timeline
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 28);

  const maturity = buildChessMaturity(archive, series);

  const insights = buildProfileInsights(series, archive.mistakeFamilies ?? []);

  return {
    version: 1,
    timeline,
    identity,
    maturity,
    insights,
    updatedAt: Date.now(),
    gamesAnalyzed: series.length,
    gptSummary: previous?.gptSummary,
  };
}

export function attachCognitiveProfile(
  archive: IntelligenceArchive,
  profile: CognitivePlayerProfile
): IntelligenceArchive {
  return {
    ...archive,
    cognitiveProfile: profile,
    updatedAt: Date.now(),
  };
}

export async function rebuildCognitiveProfileWithGpt(
  memory: ChimeraMemory
): Promise<{ profile: CognitivePlayerProfile; memory: ChimeraMemory }> {
  const profile = rebuildCognitiveProfile(memory);
  const { generateProfileGptSummary } = await import("./gptProfileSummary");
  const gptSummary = await generateProfileGptSummary(profile);
  const withGpt = gptSummary ? { ...profile, gptSummary } : profile;

  const archive = attachCognitiveProfile(
    getIntelligenceArchive(memory),
    withGpt
  );

  return {
    profile: withGpt,
    memory: { ...memory, intelligence: archive },
  };
}
