import { motion } from "framer-motion";
import { useId, useMemo } from "react";
import type { RadarAxis } from "../../ai/memoryRadar";

interface ChimeraMemoryRadarProps {
  title: string;
  elo: number;
  axes: RadarAxis[];
  subtitle?: string;
  accent?: "gold" | "cyan";
  size?: "md" | "sm";
}

const SIZES = { md: 200, sm: 160 } as const;

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

function polygonPath(
  center: number,
  values: number[],
  maxR: number
): string {
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

export default function ChimeraMemoryRadar({
  title,
  elo,
  axes,
  subtitle,
  accent = "gold",
  size = "md",
}: ChimeraMemoryRadarProps) {
  const uid = useId().replace(/:/g, "");
  const SIZE = SIZES[size];
  const CENTER = SIZE / 2;
  const RADIUS = size === "sm" ? 58 : 72;
  const n = axes.length;

  const stroke = accent === "gold" ? "#e8c547" : "#00e5ff";
  const fillId = accent === "gold" ? `radarGold-${uid}` : `radarCyan-${uid}`;

  const dataPath = useMemo(
    () => polygonPath(CENTER, axes.map((a) => a.value), RADIUS),
    [axes, CENTER, RADIUS]
  );

  return (
    <div className="flex flex-col items-center">
      <div className="text-center">
        <h4 className="font-[family-name:var(--font-display)] text-sm tracking-wide text-gold-glow">
          {title}
        </h4>
        <p
          className={`mt-1 font-[family-name:var(--font-hud)] text-[10px] tracking-[0.2em] ${
            accent === "gold"
              ? "text-[rgba(232,197,71,0.85)]"
              : "text-[rgba(0,229,255,0.75)]"
          }`}
        >
          {elo} ELO
        </p>
        {subtitle && (
          <p className="mt-0.5 font-[family-name:var(--font-body)] text-[9px] text-[rgba(255,255,255,0.3)]">
            {subtitle}
          </p>
        )}
      </div>

      <div className="relative mt-3" style={{ width: SIZE, height: SIZE }}>
        <svg
          width={SIZE}
          height={SIZE}
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="overflow-visible"
          role="img"
          aria-label={`${title} play style radar`}
        >
          <defs>
            <linearGradient id={fillId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop
                offset="0%"
                stopColor={accent === "gold" ? "#ffe566" : "#00e5ff"}
                stopOpacity="0.4"
              />
              <stop
                offset="100%"
                stopColor={accent === "gold" ? "#e8c547" : "#006680"}
                stopOpacity="0.1"
              />
            </linearGradient>
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
              stroke="rgba(232,197,71,0.1)"
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
                stroke="rgba(232,197,71,0.12)"
                strokeWidth="0.5"
              />
            );
          })}

          <motion.path
            d={dataPath}
            fill={`url(#${fillId})`}
            stroke={stroke}
            strokeWidth="1.1"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}
          />

          {axes.map((axis, i) => {
            const angle = (i / n) * Math.PI * 2;
            const labelR = RADIUS + (size === "sm" ? 16 : 20);
            const { x, y } = polarPoint(CENTER, angle, labelR);
            const anchor =
              Math.abs(Math.cos(angle - Math.PI / 2)) < 0.2
                ? "middle"
                : Math.cos(angle - Math.PI / 2) > 0
                  ? "start"
                  : "end";

            return (
              <g key={axis.short}>
                <text
                  x={x}
                  y={y - 3}
                  textAnchor={anchor}
                  fill={stroke}
                  opacity="0.85"
                  style={{
                    fontFamily: "Orbitron, sans-serif",
                    fontSize: size === "sm" ? "5px" : "6px",
                    letterSpacing: "0.08em",
                  }}
                >
                  {axis.short}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div
        className={`mt-3 grid w-full gap-1 font-[family-name:var(--font-body)] text-[8px] text-[rgba(255,255,255,0.32)] ${
          size === "sm" ? "grid-cols-1" : "grid-cols-2"
        }`}
      >
        {axes.slice(0, 4).map((axis) => (
          <div key={axis.label} className="flex justify-between gap-1">
            <span>{axis.label}</span>
            <span className="text-[rgba(232,197,71,0.7)]">{axis.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
