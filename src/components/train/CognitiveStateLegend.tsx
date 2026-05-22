import { motion } from "framer-motion";
import {
  COGNITIVE_LEGEND,
  OVERLAY_MODE_LABELS,
  type CognitiveOverlayMode,
} from "../../cognition/cognitiveState";
import type { CognitiveMapResult } from "../../cognition/cognitiveState";

interface CognitiveStateLegendProps {
  map: CognitiveMapResult | null;
  overlayMode: CognitiveOverlayMode;
  onModeChange: (mode: CognitiveOverlayMode) => void;
  showMap: boolean;
  onToggleMap: () => void;
}

const MODES = Object.keys(OVERLAY_MODE_LABELS) as CognitiveOverlayMode[];

export default function CognitiveStateLegend({
  map,
  overlayMode,
  onModeChange,
  showMap,
  onToggleMap,
}: CognitiveStateLegendProps) {
  return (
    <div className="glass-panel rounded-sm p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.35em] text-[rgba(0,229,255,0.55)]">
          COGNITIVE STATE MAP
        </p>
        <button
          type="button"
          onClick={onToggleMap}
          className={`rounded-sm px-2 py-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.12em] ${
            showMap
              ? "border border-[rgba(0,229,255,0.4)] text-[rgba(0,229,255,0.85)]"
              : "text-[rgba(255,255,255,0.35)]"
          }`}
        >
          {showMap ? "Map on" : "Map off"}
        </button>
      </div>

      {map?.tilt?.active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-3 rounded-sm border border-[rgba(220,38,38,0.45)] bg-[rgba(220,38,38,0.08)] px-3 py-2"
        >
          <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(248,113,113,0.9)]">
            TILT EVENT DETECTED
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.6)]">
            {map.tilt.message}
          </p>
        </motion.div>
      )}

      {map?.engineAlarm && (
        <p className="mt-2 font-[family-name:var(--font-body)] text-[11px] text-[rgba(248,113,113,0.85)]">
          {map.headline}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-1">
        {MODES.map((mode) => (
          <button
            key={mode}
            type="button"
            onClick={() => onModeChange(mode)}
            className={`rounded-sm px-2 py-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.08em] ${
              overlayMode === mode
                ? "border border-[rgba(232,197,71,0.4)] text-gold-glow"
                : "text-[rgba(255,255,255,0.3)]"
            }`}
          >
            {OVERLAY_MODE_LABELS[mode].title}
          </button>
        ))}
      </div>

      <p className="mt-2 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.35)]">
        {OVERLAY_MODE_LABELS[overlayMode].description}
      </p>

      <table className="mt-4 w-full text-left">
        <thead>
          <tr className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(255,255,255,0.25)]">
            <th className="pb-2">Colour</th>
            <th className="pb-2">Meaning</th>
          </tr>
        </thead>
        <tbody>
          {COGNITIVE_LEGEND.map((row) => (
            <tr key={row.state} className="border-t border-[rgba(255,255,255,0.04)]">
              <td className="py-2 pr-2">
                <span
                  className="inline-block h-3 w-3 rounded-sm"
                  style={{ background: row.swatch }}
                />
                <span className="ml-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.5)]">
                  {row.label}
                </span>
              </td>
              <td className="py-2 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.45)]">
                {row.meaning}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 font-[family-name:var(--font-body)] text-[10px] italic text-[rgba(255,255,255,0.3)]">
        Hover any glowing square for how CHIMERA reads your thinking — not just
        “best moves.”
      </p>
    </div>
  );
}
