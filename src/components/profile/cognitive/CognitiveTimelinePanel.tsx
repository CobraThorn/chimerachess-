import { useState } from "react";
import type {
  CognitiveTimelineEvent,
  CognitiveTimelineEventType,
} from "../../../cognitiveProfile/types";

const FILTERS: { id: CognitiveTimelineEventType | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "breakthrough", label: "Breakthrough" },
  { id: "collapse", label: "Collapse" },
  { id: "recovery", label: "Recovery" },
  { id: "identity_shift", label: "Identity" },
  { id: "volatility", label: "Volatility" },
  { id: "opening_growth", label: "Opening" },
  { id: "mistake_pattern", label: "Mistakes" },
  { id: "time_pressure_change", label: "Clock" },
];

const TYPE_COLOR: Record<CognitiveTimelineEventType, string> = {
  breakthrough: "text-[rgba(120,255,180,0.9)]",
  collapse: "text-[rgba(255,120,120,0.9)]",
  adaptation: "text-[rgba(0,229,255,0.8)]",
  recovery: "text-[rgba(120,200,255,0.9)]",
  plateau: "text-[rgba(255,255,255,0.5)]",
  identity_shift: "text-[rgba(180,140,255,0.95)]",
  volatility: "text-[rgba(255,200,100,0.9)]",
  opening_growth: "text-gold-glow",
  mistake_pattern: "text-[rgba(255,160,120,0.9)]",
  time_pressure_change: "text-[rgba(0,229,255,0.75)]",
};

interface CognitiveTimelinePanelProps {
  events: CognitiveTimelineEvent[];
  filter: CognitiveTimelineEventType | "all";
  onFilterChange: (f: CognitiveTimelineEventType | "all") => void;
  gptSummary?: string;
  gptLoading?: boolean;
}

export default function CognitiveTimelinePanel({
  events,
  filter,
  onFilterChange,
  gptSummary,
  gptLoading,
}: CognitiveTimelinePanelProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="rounded-sm border border-[rgba(180,140,255,0.2)] bg-[rgba(80,40,160,0.05)] p-6">
      <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(180,140,255,0.7)] uppercase">
        Cognitive timeline
      </p>
      <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
        Longitudinal shifts detected from phenotype history, reviewed games, and mistake families.
      </p>

      {gptSummary && (
        <p className="mt-4 font-[family-name:var(--font-body)] text-xs leading-relaxed text-[rgba(255,255,255,0.55)]">
          {gptSummary}
        </p>
      )}
      {gptLoading && (
        <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(0,229,255,0.5)]">
          Synthesizing longitudinal summary…
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onFilterChange(f.id)}
            className={`rounded-sm border px-2 py-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.12em] uppercase transition-colors ${
              filter === f.id
                ? "border-[rgba(180,140,255,0.5)] bg-[rgba(180,140,255,0.12)] text-[rgba(180,140,255,0.95)]"
                : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.35)]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {events.length === 0 ? (
        <p className="mt-6 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.35)]">
          No events for this filter. Complete more reviewed games to populate the timeline.
        </p>
      ) : (
        <div className="relative mt-8 space-y-0 pl-4">
          <div className="absolute bottom-2 left-[7px] top-2 w-px bg-[rgba(180,140,255,0.25)]" />
          {events.map((e) => (
            <TimelineCard
              key={e.id}
              event={e}
              open={expanded === e.id}
              onToggle={() => setExpanded(expanded === e.id ? null : e.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TimelineCard({
  event,
  open,
  onToggle,
}: {
  event: CognitiveTimelineEvent;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative pb-6 pl-6">
      <span className="absolute left-0 top-1.5 h-3 w-3 rounded-full border border-[rgba(180,140,255,0.5)] bg-[rgba(20,10,40,0.9)]" />
      <button type="button" onClick={onToggle} className="w-full text-left">
        <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(255,255,255,0.35)]">
          {new Date(event.timestamp).toLocaleDateString()} · {event.type.replace(/_/g, " ")} ·{" "}
          {event.confidence}% conf.
        </p>
        <p className={`mt-1 font-[family-name:var(--font-display)] text-base ${TYPE_COLOR[event.type]}`}>
          {event.title}
        </p>
        <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.5)]">
          {event.explanation}
        </p>
      </button>
      {open && event.evidence.length > 0 && (
        <ul className="mt-3 space-y-2 rounded-sm border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] p-3">
          {event.evidence.map((ev) => (
            <li key={ev.metric + ev.change} className="text-[10px] text-[rgba(255,255,255,0.45)]">
              <span className="text-[rgba(0,229,255,0.6)]">{ev.metric}</span>
              {ev.change !== 0 && (
                <span className="ml-1">
                  ({ev.change > 0 ? "+" : ""}
                  {ev.change})
                </span>
              )}
              — {ev.explanation}
            </li>
          ))}
          {event.gameRange && (
            <li className="text-[9px] text-[rgba(255,255,255,0.3)]">
              Games {event.gameRange.from}–{event.gameRange.to}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
