import type { Color } from "../../chess";
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
  if (!show) return null;

  const flip = orientation === "b";
  const displayRank = (visualRank: number) => (flip ? visualRank : 7 - visualRank);
  const displayFile = (visualFile: number) => (flip ? 7 - visualFile : visualFile);

  const cellBySq = new Map(cells.map((c) => [c.square, c]));

  return (
    <div
      className={`pointer-events-none absolute inset-2 z-10 grid grid-cols-8 grid-rows-8 gap-0 ${
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
            return <div key={`cog-${sq}`} className="size-full min-h-0 min-w-0" />;
          }
          const rgb = STATE_RGB[cell.state];
          const alpha = 0.22 + cell.intensity * 0.58;
          const pulse = STATE_PULSE[cell.state];

          return (
            <div
              key={`cog-${sq}`}
              className={`pointer-events-none size-full min-h-0 min-w-0 transition-opacity duration-300 ${
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
              title={cell.tooltip}
            />
          );
        })}
    </div>
  );
}
