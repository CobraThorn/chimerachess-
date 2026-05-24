interface EloBadgeProps {
  label: string;
  elo: number;
  delta?: number;
  /** e.g. "Calibrating · 42%" */
  sublabel?: string | null;
  variant?: "gold" | "cyan" | "neutral";
  size?: "sm" | "md" | "lg";
}

export default function EloBadge({
  label,
  elo,
  delta,
  sublabel,
  variant = "gold",
  size = "md",
}: EloBadgeProps) {
  const colors = {
    gold: {
      border: "rgba(232,197,71,0.4)",
      bg: "rgba(232,197,71,0.08)",
      text: "text-gold-glow",
      sub: "text-[rgba(232,197,71,0.55)]",
    },
    cyan: {
      border: "rgba(0,229,255,0.35)",
      bg: "rgba(0,229,255,0.06)",
      text: "text-[rgba(0,229,255,0.9)]",
      sub: "text-[rgba(0,229,255,0.45)]",
    },
    neutral: {
      border: "rgba(255,255,255,0.15)",
      bg: "rgba(255,255,255,0.04)",
      text: "text-[rgba(255,255,255,0.85)]",
      sub: "text-[rgba(255,255,255,0.35)]",
    },
  }[variant];

  const sizes = {
    sm: { pad: "px-2 py-1", elo: "text-sm", label: "text-[7px]" },
    md: { pad: "px-3 py-1.5", elo: "text-lg", label: "text-[8px]" },
    lg: { pad: "px-4 py-2", elo: "text-2xl", label: "text-[9px]" },
  }[size];

  return (
    <div
      className={`inline-flex flex-col items-center rounded-sm border ${sizes.pad}`}
      style={{ borderColor: colors.border, background: colors.bg }}
    >
      <span
        className={`font-[family-name:var(--font-hud)] tracking-[0.2em] uppercase ${sizes.label} ${colors.sub}`}
      >
        {label}
      </span>
      <span className={`font-[family-name:var(--font-display)] font-bold leading-none ${sizes.elo} ${colors.text}`}>
        {elo}
      </span>
      {sublabel && (
        <span
          className={`mt-0.5 max-w-[8rem] text-center font-[family-name:var(--font-hud)] text-[7px] leading-tight tracking-[0.12em] ${colors.sub}`}
        >
          {sublabel}
        </span>
      )}
      {delta !== undefined && delta !== 0 && (
        <span
          className={`mt-0.5 font-[family-name:var(--font-hud)] text-[8px] tracking-wider ${
            delta > 0 ? "text-[rgba(0,229,255,0.8)]" : "text-[rgba(255,100,100,0.8)]"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta}
        </span>
      )}
    </div>
  );
}
