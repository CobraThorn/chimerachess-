import type { PlayerIdentityModel } from "../../../cognitiveProfile/types";

interface IdentityEvolutionPanelProps {
  identity: PlayerIdentityModel;
}

export default function IdentityEvolutionPanel({ identity }: IdentityEvolutionPanelProps) {
  return (
    <div className="rounded-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.15)] p-6">
      <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
        Identity evolution
      </p>
      <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
        Probabilistic style mixture — not a fixed label. Weights update after each intelligence pass.
      </p>

      {identity.driftSummary && (
        <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-white">
          {identity.driftSummary}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {identity.currentIdentity.map((p) => (
          <div key={p.id}>
            <div className="flex items-center justify-between gap-2">
              <span className="font-[family-name:var(--font-display)] text-sm text-gold-glow">
                {p.label}
              </span>
              <span className="font-[family-name:var(--font-hud)] text-[10px] text-[rgba(255,255,255,0.45)]">
                {p.weight}%
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
              <div
                className="h-full bg-[rgba(180,140,255,0.55)] transition-all"
                style={{ width: `${p.weight}%` }}
              />
            </div>
            <p className="mt-1 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.4)]">
              {p.description}
            </p>
          </div>
        ))}
      </div>

      <p className="mt-4 font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.3)]">
        Model confidence: {identity.confidence}%
      </p>

      {identity.historicalShifts.length > 0 && (
        <div className="mt-6 border-t border-[rgba(255,255,255,0.06)] pt-4">
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.35)] uppercase">
            Historical shifts
          </p>
          <ul className="mt-2 space-y-2">
            {identity.historicalShifts.map((s) => (
              <li
                key={`${s.at}-${s.toLabel}`}
                className="font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.5)]"
              >
                <span className="text-[rgba(180,140,255,0.7)]">
                  {new Date(s.at).toLocaleDateString()}
                </span>
                — {s.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
