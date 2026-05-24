import { algebraic, parseSquare } from "../../chess/square";
import type { Color, Square } from "../../chess";

export type ArrowColor = "green" | "red" | "blue" | "gold" | "cyan";

export interface BoardArrow {
  from: Square;
  to: Square;
  color: ArrowColor;
}

const ARROW_STROKE: Record<ArrowColor, string> = {
  green: "rgba(80,220,120,0.92)",
  red: "rgba(255,90,90,0.9)",
  blue: "rgba(90,160,255,0.9)",
  gold: "rgba(232,197,71,0.95)",
  cyan: "rgba(0,229,255,0.9)",
};

interface BoardAnnotationsProps {
  orientation?: Color;
  heatMap?: number[] | null;
  showHeatMap?: boolean;
  arrows?: BoardArrow[];
  showArrows?: boolean;
}

function squareCenterPercent(
  sq: Square,
  orientation: Color
): { x: number; y: number } {
  const flip = orientation === "b";
  const f = sq & 7;
  const r = sq >> 3;
  const vf = flip ? 7 - f : f;
  const vr = flip ? r : 7 - r;
  return { x: ((vf + 0.5) / 8) * 100, y: ((vr + 0.5) / 8) * 100 };
}

function heatColor(intensity: number): string {
  if (intensity < 0.08) return "transparent";
  const a = 0.15 + intensity * 0.55;
  if (intensity > 0.65) {
    return `rgba(0,229,255,${a})`;
  }
  return `rgba(232,197,71,${a * 0.85})`;
}

export function parseArrowSpec(
  from: string,
  to: string,
  color?: string
): BoardArrow | null {
  const f = parseSquare(from);
  const t = parseSquare(to);
  if (f === null || t === null) return null;
  const c = (color ?? "green") as ArrowColor;
  if (!ARROW_STROKE[c]) return { from: f, to: t, color: "green" };
  return { from: f, to: t, color: c };
}

export default function BoardAnnotations({
  orientation = "w",
  heatMap = null,
  showHeatMap = false,
  arrows = [],
  showArrows = false,
}: BoardAnnotationsProps) {
  const flip = orientation === "b";
  const displayRank = (visualRank: number) => (flip ? visualRank : 7 - visualRank);
  const displayFile = (visualFile: number) => (flip ? 7 - visualFile : visualFile);

  return (
    <div
      className="pointer-events-none absolute inset-0 z-10"
      aria-hidden
    >
      {showHeatMap && heatMap && (
      <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 gap-0">
        {Array.from({ length: 64 }, (_, visualIndex) => {
          const vr = Math.floor(visualIndex / 8);
          const vf = visualIndex % 8;
          const sq = displayRank(vr) * 8 + displayFile(vf);
          const intensity = heatMap[sq] ?? 0;
          return (
            <div
              key={`heat-${sq}`}
              className="size-full min-h-0 min-w-0 transition-opacity duration-300"
              style={{ backgroundColor: heatColor(intensity) }}
            />
          );
        })}
      </div>
      )}

      {showArrows && arrows.length > 0 && (
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          <defs>
            {(["green", "red", "blue", "gold", "cyan"] as ArrowColor[]).map(
              (c) => (
                <marker
                  key={c}
                  id={`arrowhead-${c}`}
                  markerWidth="4"
                  markerHeight="4"
                  refX="3.2"
                  refY="2"
                  orient="auto"
                >
                  <polygon
                    points="0 0, 4 2, 0 4"
                    fill={ARROW_STROKE[c]}
                  />
                </marker>
              )
            )}
          </defs>
          {arrows.map((arrow, i) => {
            const from = squareCenterPercent(arrow.from, orientation);
            const to = squareCenterPercent(arrow.to, orientation);
            const stroke = ARROW_STROKE[arrow.color];
            const dx = to.x - from.x;
            const dy = to.y - from.y;
            const len = Math.hypot(dx, dy) || 1;
            const shrink = 4.5;
            const x1 = from.x + (dx / len) * shrink;
            const y1 = from.y + (dy / len) * shrink;
            const x2 = to.x - (dx / len) * shrink;
            const y2 = to.y - (dy / len) * shrink;

            return (
              <line
                key={`${algebraic(arrow.from)}-${algebraic(arrow.to)}-${i}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={stroke}
                strokeWidth="1.35"
                strokeLinecap="round"
                markerEnd={`url(#arrowhead-${arrow.color})`}
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
