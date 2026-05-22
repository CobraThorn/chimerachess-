import { evalToBarPercent } from "../../engine/analysis";

interface EvalBarProps {
  cpWhite: number;
  isMate?: boolean;
  mateIn?: number;
  label: string;
  thinking?: boolean;
}

export default function EvalBar({
  cpWhite,
  isMate,
  mateIn,
  label,
  thinking,
}: EvalBarProps) {
  const pct = evalToBarPercent(cpWhite, isMate, mateIn);
  const whiteDominant = pct >= 52;
  const blackDominant = pct <= 48;

  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="relative w-7 overflow-hidden rounded-sm border border-[rgba(255,255,255,0.08)]"
        style={{ height: "min(92vw, 464px)", maxHeight: 464 }}
      >
        <div
          className="absolute bottom-0 left-0 right-0 transition-all duration-500 ease-out"
          style={{
            height: `${pct}%`,
            background: whiteDominant
              ? "linear-gradient(to top, rgba(240,235,220,0.95), rgba(232,197,71,0.35))"
              : blackDominant
                ? "linear-gradient(to top, rgba(40,40,48,0.95), rgba(80,80,90,0.5))"
                : "linear-gradient(to top, rgba(120,120,130,0.6), rgba(180,180,190,0.4))",
          }}
        />
        {thinking && (
          <div className="absolute inset-0 animate-pulse bg-[rgba(0,229,255,0.08)]" />
        )}
      </div>
      <span
        className={`font-[family-name:var(--font-hud)] text-[10px] tracking-[0.15em] ${
          cpWhite > 30
            ? "text-gold-glow"
            : cpWhite < -30
              ? "text-[rgba(180,180,190,0.85)]"
              : "text-[rgba(255,255,255,0.5)]"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
