import type { ChessMaturityModel } from "../../../cognitiveProfile/types";

interface ChessMaturityPanelProps {
  maturity: ChessMaturityModel;
}

const TREND_LABEL: Record<string, string> = {
  rising: "↑ rising",
  falling: "↓ falling",
  stable: "→ stable",
  volatile: "↕ volatile",
};

export default function ChessMaturityPanel({ maturity }: ChessMaturityPanelProps) {
  return (
    <div className="rounded-sm border border-[rgba(232,197,71,0.15)] bg-[rgba(232,197,71,0.03)] p-6">
      <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-gold-glow uppercase">
        Chess maturity index
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-xl text-white">
        {maturity.headline}
      </p>
      <p className="mt-1 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.35)]">
        Not Elo — decision quality, stability, and emotional control ({maturity.confidence}%
        confidence)
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {maturity.dimensions.map((d) => (
          <div
            key={d.key}
            className="rounded-sm border border-[rgba(255,255,255,0.06)] p-3"
            title={d.analyticalNote}
          >
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-body)] text-xs text-white">
                {d.label}
              </span>
              <span className="font-[family-name:var(--font-hud)] text-[9px] text-[rgba(255,255,255,0.4)]">
                {TREND_LABEL[d.trend]}
              </span>
            </div>
            <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-gold-glow">
              {d.score}
            </p>
            <p className="mt-2 font-[family-name:var(--font-body)] text-[10px] leading-snug text-[rgba(255,255,255,0.42)]">
              {d.analyticalNote}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
