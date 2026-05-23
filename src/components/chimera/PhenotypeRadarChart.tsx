import { AnimatePresence, motion } from "framer-motion";
import { useId, useMemo, useState } from "react";
import type { PhenotypeRadarAxisMeta } from "../../ai/cognition/personalityRadar";
import { PHENOTYPE_RADAR_AXES } from "../../ai/cognition/personalityRadar";

export interface PhenotypeRadarSeries {
  id: string;
  label: string;
  values: number[];
  accent: "cyan" | "gold" | "muted";
  opacity?: number;
}

interface PhenotypeRadarChartProps {
  series: PhenotypeRadarSeries[];
  axes?: PhenotypeRadarAxisMeta[];
  size?: number;
  selectedIndex?: number | null;
  onSelectAxis?: (index: number | null) => void;
}

function polarPoint(
  center: number,
  angle: number,
  r: number
): { x: number; y: number } {
  const a = angle - Math.PI / 2;
  return {
    x: center + r * Math.cos(a),
    y: center + r * Math.sin(a),
  };
}

function polygonPath(center: number, values: number[], maxR: number): string {
  const n = values.length;
  return (
    values
      .map((v, i) => {
        const angle = (i / n) * Math.PI * 2;
        const rad = (Math.min(100, Math.max(0, v)) / 100) * maxR;
        const { x, y } = polarPoint(center, angle, rad);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ") + " Z"
  );
}

const STROKE: Record<PhenotypeRadarSeries["accent"], string> = {
  cyan: "#00e5ff",
  gold: "#e8c547",
  muted: "rgba(255,255,255,0.35)",
};

const FILL: Record<PhenotypeRadarSeries["accent"], [string, string]> = {
  cyan: ["#00e5ff", "#006680"],
  gold: ["#ffe566", "#e8c547"],
  muted: ["rgba(255,255,255,0.25)", "rgba(255,255,255,0.05)"],
};

export default function PhenotypeRadarChart({
  series,
  axes = PHENOTYPE_RADAR_AXES,
  size = 280,
  selectedIndex = null,
  onSelectAxis,
}: PhenotypeRadarChartProps) {
  const uid = useId().replace(/:/g, "");
  const CENTER = size / 2;
  const RADIUS = size * 0.36;
  const n = axes.length;
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const activeIndex = selectedIndex ?? hoverIndex;

  const paths = useMemo(
    () =>
      series.map((s) => ({
        ...s,
        d: polygonPath(CENTER, s.values, RADIUS),
      })),
    [series, CENTER, RADIUS]
  );

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          className="touch-none overflow-visible"
          role="img"
          aria-label="Phenotype cognitive radar"
        >
          <defs>
            {series.map((s) => (
              <linearGradient
                key={`grad-${s.id}-${uid}`}
                id={`radar-${s.id}-${uid}`}
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor={FILL[s.accent][0]} stopOpacity="0.35" />
                <stop offset="100%" stopColor={FILL[s.accent][1]} stopOpacity="0.08" />
              </linearGradient>
            ))}
          </defs>

          {[0.25, 0.5, 0.75, 1].map((level) => (
            <path
              key={level}
              d={polygonPath(
                CENTER,
                axes.map(() => level * 100),
                RADIUS
              )}
              fill="none"
              stroke="rgba(232,197,71,0.08)"
              strokeWidth="0.5"
            />
          ))}

          {axes.map((_, i) => {
            const { x, y } = polarPoint(CENTER, (i / n) * Math.PI * 2, RADIUS);
            return (
              <line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={x}
                y2={y}
                stroke={
                  activeIndex === i
                    ? "rgba(0,229,255,0.35)"
                    : "rgba(232,197,71,0.1)"
                }
                strokeWidth={activeIndex === i ? 1 : 0.5}
              />
            );
          })}

          {paths.map((p) => (
            <motion.path
              key={p.id}
              d={p.d}
              fill={`url(#radar-${p.id}-${uid})`}
              stroke={STROKE[p.accent]}
              strokeWidth={p.accent === "muted" ? 0.8 : 1.2}
              strokeDasharray={p.accent === "muted" ? "4 3" : undefined}
              opacity={p.opacity ?? (p.accent === "muted" ? 0.85 : 1)}
              initial={false}
              animate={{ d: p.d, opacity: p.opacity ?? 1 }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
          ))}

          {series[0] &&
            series[0].values.map((v, i) => {
              const angle = (i / n) * Math.PI * 2;
              const rad = (v / 100) * RADIUS;
              const { x, y } = polarPoint(CENTER, angle, rad);
              const isActive = activeIndex === i;
              return (
                <circle
                  key={`dot-${i}`}
                  cx={x}
                  cy={y}
                  r={isActive ? 5 : 3}
                  fill={isActive ? "#00e5ff" : STROKE[series[0].accent]}
                  opacity={isActive ? 1 : 0.7}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onMouseLeave={() => setHoverIndex(null)}
                  onClick={() =>
                    onSelectAxis?.(selectedIndex === i ? null : i)
                  }
                />
              );
            })}

          {axes.map((axis, i) => {
            const angle = (i / n) * Math.PI * 2;
            const labelR = RADIUS + 22;
            const { x, y } = polarPoint(CENTER, angle, labelR);
            const isActive = activeIndex === i;
            const anchor =
              Math.abs(Math.cos(angle - Math.PI / 2)) < 0.2
                ? "middle"
                : Math.cos(angle - Math.PI / 2) > 0
                  ? "start"
                  : "end";

            return (
              <text
                key={axis.key}
                x={x}
                y={y}
                textAnchor={anchor}
                fill={isActive ? "#00e5ff" : "rgba(232,197,71,0.75)"}
                className="cursor-pointer select-none"
                style={{
                  fontFamily: "Orbitron, sans-serif",
                  fontSize: "5.5px",
                  letterSpacing: "0.06em",
                }}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() =>
                  onSelectAxis?.(selectedIndex === i ? null : i)
                }
              >
                {axis.short}
              </text>
            );
          })}
        </svg>

        <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-wrap justify-center gap-3">
          {series.map((s) => (
            <span
              key={s.id}
              className="font-[family-name:var(--font-hud)] text-[6px] tracking-[0.12em]"
              style={{ color: STROKE[s.accent] }}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeIndex != null && axes[activeIndex] && series[0] && (
          <motion.div
            key={activeIndex}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="mt-4 w-full max-w-md rounded-sm border border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.05)] px-4 py-3 text-left"
          >
            <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(0,229,255,0.7)] uppercase">
              {axes[activeIndex].label} · {series[0].values[activeIndex]}
            </p>
            <p className="mt-2 font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-[rgba(255,255,255,0.55)]">
              {axes[activeIndex].description}
            </p>
            {series[0].values[activeIndex] < 55 && (
              <p className="mt-2 font-[family-name:var(--font-body)] text-[10px] text-[rgba(232,197,71,0.75)]">
                Training: {axes[activeIndex].trainingHint}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
