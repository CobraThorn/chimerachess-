import type { ChimeraMemory } from "../../../ai/types";
import { useCognitiveProfile } from "../../../hooks/useCognitiveProfile";
import CognitiveTimelinePanel from "./CognitiveTimelinePanel";
import IdentityEvolutionPanel from "./IdentityEvolutionPanel";
import ChessMaturityPanel from "./ChessMaturityPanel";
import ProfileInsightsGrid from "./ProfileInsightsGrid";

interface CognitiveProfileSectionProps {
  memory: ChimeraMemory;
}

export default function CognitiveProfileSection({ memory }: CognitiveProfileSectionProps) {
  const {
    profile,
    filteredTimeline,
    filter,
    setFilter,
    gptEnabled,
    gptLoading,
    refreshGpt,
  } = useCognitiveProfile(memory);

  if (!profile || profile.gamesAnalyzed < 4) {
    return (
      <div className="rounded-sm border border-[rgba(255,255,255,0.08)] p-6">
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(255,255,255,0.35)] uppercase">
          Cognitive evolution
        </p>
        <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.4)]">
          Play at least four games with full post-game review to unlock your cognitive timeline,
          identity mixture, and maturity index.
        </p>
      </div>
    );
  }

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.4em] text-[rgba(180,140,255,0.65)] uppercase">
            Evolving chess identity
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.4)]">
            {profile.gamesAnalyzed} reviewed sessions · updated{" "}
            {new Date(profile.updatedAt).toLocaleString()}
          </p>
        </div>
        {gptEnabled && (
          <button
            type="button"
            onClick={() => void refreshGpt()}
            disabled={gptLoading}
            className="rounded-sm border border-[rgba(0,229,255,0.25)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-[rgba(0,229,255,0.7)] uppercase"
          >
            {gptLoading ? "Synthesizing…" : "Refresh AI summary"}
          </button>
        )}
      </div>

      <CognitiveTimelinePanel
        events={filteredTimeline}
        filter={filter}
        onFilterChange={setFilter}
        gptSummary={profile.gptSummary}
        gptLoading={gptLoading}
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <IdentityEvolutionPanel identity={profile.identity} />
        <ChessMaturityPanel maturity={profile.maturity} />
      </div>

      <div className="rounded-sm border border-[rgba(255,255,255,0.08)] p-6">
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(255,255,255,0.35)] uppercase">
          Longitudinal insights
        </p>
        <div className="mt-4">
          <ProfileInsightsGrid insights={profile.insights} />
        </div>
      </div>
    </section>
  );
}
