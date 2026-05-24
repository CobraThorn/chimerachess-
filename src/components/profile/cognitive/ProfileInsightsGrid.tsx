import type { ProfileInsightsSnapshot } from "../../../cognitiveProfile/types";

interface ProfileInsightsGridProps {
  insights: ProfileInsightsSnapshot;
}

function InsightList({
  title,
  items,
  accent,
}: {
  title: string;
  items: { id: string; title: string; detail: string }[];
  accent: string;
}) {
  if (!items.length) return null;
  return (
    <div>
      <p className={`font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] uppercase ${accent}`}>
        {title}
      </p>
      <ul className="mt-2 space-y-2">
        {items.map((i) => (
          <li
            key={i.id}
            className="rounded-sm border border-[rgba(255,255,255,0.05)] px-3 py-2"
            title={i.detail}
          >
            <p className="font-[family-name:var(--font-body)] text-xs text-white">{i.title}</p>
            <p className="mt-0.5 text-[10px] text-[rgba(255,255,255,0.42)]">{i.detail}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function ProfileInsightsGrid({ insights }: ProfileInsightsGridProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <InsightList
        title="Biggest improvements"
        items={insights.biggestImprovements}
        accent="text-[rgba(120,255,180,0.7)]"
      />
      <InsightList
        title="Weakness cycles"
        items={insights.biggestWeaknessCycles}
        accent="text-[rgba(255,160,120,0.75)]"
      />
      <InsightList
        title="Long-term behavioral trends"
        items={insights.longTermTrends}
        accent="text-[rgba(0,229,255,0.6)]"
      />
      <InsightList
        title="Mistake family evolution"
        items={insights.mistakeFamilyEvolution}
        accent="text-[rgba(180,140,255,0.7)]"
      />
      <InsightList
        title="Cognitive heatmap trends"
        items={insights.heatmapTrends}
        accent="text-[rgba(232,197,71,0.65)]"
      />

      {insights.openingPersonality.length > 0 && (
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-gold-glow uppercase">
            Opening personality
          </p>
          <ul className="mt-2 space-y-2">
            {insights.openingPersonality.map((o) => (
              <li
                key={o.label}
                className="flex items-center justify-between rounded-sm border border-[rgba(255,255,255,0.05)] px-3 py-2"
              >
                <span className="font-[family-name:var(--font-body)] text-xs text-white">
                  {o.label}
                </span>
                <span className="font-[family-name:var(--font-hud)] text-[9px] text-[rgba(255,255,255,0.4)]">
                  {o.share}% · {o.avgOpeningAccuracy}% · {o.trend}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
