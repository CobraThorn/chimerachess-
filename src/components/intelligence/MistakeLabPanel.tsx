import { useMemo } from "react";
import type { ChimeraMemory } from "../../ai/types";
import { getIntelligenceArchive } from "../../intelligence/storage";
import type { MistakePatternFamily } from "../../mistakeIntel/types";

interface MistakeLabPanelProps {
  memory: ChimeraMemory;
}

export default function MistakeLabPanel({ memory }: MistakeLabPanelProps) {
  const archive = getIntelligenceArchive(memory);
  const families = archive.mistakeFamilies ?? [];
  const recentReports = archive.reports.slice(-5);

  const topFamilies = useMemo(
    () => [...families].sort((a, b) => b.occurrences - a.occurrences).slice(0, 8),
    [families]
  );

  if (topFamilies.length === 0 && recentReports.length === 0) {
    return (
      <div className="rounded-sm border border-[rgba(180,140,255,0.15)] bg-[rgba(80,40,160,0.04)] p-6">
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(180,140,255,0.65)] uppercase">
          Mistake lab
        </p>
        <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
          Complete a rated game and run the full Stockfish review to build your recurring
          mistake fingerprint. Decision autopsies appear in the post-game Performance lab.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-[rgba(180,140,255,0.2)] bg-[rgba(80,40,160,0.06)] p-6">
      <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(180,140,255,0.7)] uppercase">
        Mistake lab · recurring patterns
      </p>
      <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
        Cross-game themes from your decision autopsies. Focus training on families with 3+
        occurrences.
      </p>

      {topFamilies.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {topFamilies.map((f) => (
            <FamilyCard key={f.id} family={f} />
          ))}
        </div>
      )}

      {recentReports.some((r) => r.mistakeIntelligence) && (
        <div className="mt-8">
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(255,255,255,0.35)] uppercase">
            Recent sessions
          </p>
          <ul className="mt-2 space-y-2">
            {recentReports
              .filter((r) => r.mistakeIntelligence)
              .reverse()
              .map((r) => (
                <li
                  key={r.id}
                  className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2"
                >
                  <p className="font-[family-name:var(--font-body)] text-xs text-white">
                    {r.mistakeIntelligence!.summary}
                  </p>
                  <p className="mt-0.5 font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.35)]">
                    {r.mistakeIntelligence!.mistakes.length} deep dives ·{" "}
                    {new Date(r.generatedAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function FamilyCard({ family }: { family: MistakePatternFamily }) {
  const recurring = family.occurrences >= 3;
  return (
    <div
      className={`rounded-sm border px-4 py-3 ${
        recurring
          ? "border-[rgba(232,197,71,0.25)] bg-[rgba(232,197,71,0.05)]"
          : "border-[rgba(255,255,255,0.06)]"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-[family-name:var(--font-display)] text-sm text-gold-glow">
          {family.label}
        </p>
        <span className="font-[family-name:var(--font-hud)] text-[9px] text-[rgba(180,140,255,0.7)]">
          ×{family.occurrences}
        </span>
      </div>
      <p className="mt-1 font-[family-name:var(--font-hud)] text-[7px] uppercase tracking-[0.15em] text-[rgba(255,255,255,0.35)]">
        {family.theme}
        {recurring && " · recurring"}
      </p>
      <p className="mt-2 font-[family-name:var(--font-body)] text-[10px] italic text-[rgba(255,255,255,0.4)]">
        &ldquo;{family.sampleHeadline}&rdquo;
      </p>
    </div>
  );
}
