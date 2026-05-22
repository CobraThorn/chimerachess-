import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Color, Square } from "../../chess";
import type { CognitiveCell, CognitiveState } from "../../cognition/cognitiveState";

const STATE_RGB: Record<CognitiveState, string> = {
  peak: "232,197,71",
  stable: "52,211,153",
  theory: "59,130,246",
  strain: "251,146,60",
  collapse: "220,38,38",
  blind: "127,29,29",
};

const STATE_PULSE: Record<CognitiveState, boolean> = {
  peak: true,
  stable: false,
  theory: false,
  strain: true,
  collapse: true,
  blind: true,
};

interface CognitiveBoardOverlayProps {
  orientation?: Color;
  cells: CognitiveCell[];
  show: boolean;
  tiltPulse?: boolean;
}

export default function CognitiveBoardOverlay({
  orientation = "w",
  cells,
  show,
  tiltPulse = false,
}: CognitiveBoardOverlayProps) {
  const [hover, setHover] = useState<{
    sq: Square;
    tooltip: string;
    x: number;
    y: number;
  } | null>(null);

  if (!show) return null;

  const flip = orientation === "b";
  const displayRank = (visualRank: number) => (flip ? visualRank : 7 - visualRank);
  const displayFile = (visualFile: number) => (flip ? 7 - visualFile : visualFile);

  const cellBySq = new Map(cells.map((c) => [c.square, c]));

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-2 grid grid-cols-8 gap-0 ${
          tiltPulse ? "animate-[tilt-pulse_2s_ease-in-out_infinite]" : ""
        }`}
        aria-hidden
      >
        {Array.from({ length: 64 }, (_, visualIndex) => {
          const vr = Math.floor(visualIndex / 8);
          const vf = visualIndex % 8;
          const sq = displayRank(vr) * 8 + displayFile(vf);
          const cell = cellBySq.get(sq);
          if (!cell) {
            return <div key={`cog-${sq}`} className="aspect-square" />;
          }
          const rgb = STATE_RGB[cell.state];
          const alpha = 0.22 + cell.intensity * 0.58;
          const pulse = STATE_PULSE[cell.state];

          return (
            <div
              key={`cog-${sq}`}
              className={`pointer-events-auto aspect-square transition-opacity duration-300 ${
                pulse ? "cognitive-pulse" : ""
              }`}
              style={{
                backgroundColor: `rgba(${rgb},${alpha})`,
                boxShadow:
                  cell.state === "peak"
                    ? `inset 0 0 12px rgba(232,197,71,${cell.intensity * 0.5})`
                    : cell.state === "collapse"
                      ? `inset 0 0 14px rgba(220,38,38,${cell.intensity * 0.45})`
                      : undefined,
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHover({
                  sq,
                  tooltip: cell.tooltip,
                  x: rect.left + rect.width / 2,
                  y: rect.top,
                });
              }}
              onMouseLeave={() => setHover(null)}
            />
          );
        })}
      </div>

      <AnimatePresence>
        {hover && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="pointer-events-none fixed z-[200] max-w-[260px] -translate-x-1/2 -translate-y-full rounded-sm border border-[rgba(232,197,71,0.2)] bg-[rgba(8,8,16,0.96)] px-3 py-2 shadow-lg"
            style={{ left: hover.x, top: hover.y - 8 }}
          >
            <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(0,229,255,0.55)]">
              COGNITIVE READ
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] leading-snug text-[rgba(255,255,255,0.75)]">
              {hover.tooltip}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
