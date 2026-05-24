import { motion } from "framer-motion";
import {
  TIME_CONTROLS,
  formatClock,
  type TimeControlId,
} from "../../online/timeControls";

interface RatedLobbyProps {
  onSelect: (tc: TimeControlId) => void;
}

/** Instant rated vs CHIMERA — bullet / blitz / rapid clocks, CRS updates. */
export default function RatedLobby({ onSelect }: RatedLobbyProps) {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-6 text-center">
        <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-[rgba(232,197,71,0.55)] uppercase">
          Rated clocks
        </p>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
          Timed games vs CHIMERA — your CRS rating updates after every result.
          No queue, no wait.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {TIME_CONTROLS.map((tc) => (
          <motion.button
            key={tc.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onSelect(tc.id)}
            className="glass-panel rounded-sm p-5 text-left transition-all hover:border-[rgba(232,197,71,0.4)] hover:shadow-[0_0_28px_rgba(232,197,71,0.12)]"
          >
            <span className="font-[family-name:var(--font-display)] text-xl text-gold-glow">
              {tc.label}
            </span>
            <span className="mt-1 block font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-[rgba(0,229,255,0.6)]">
              {tc.tagline}
            </span>
            <span className="mt-3 block font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
              {formatClock(tc.initialMs)}
              {tc.incrementMs > 0
                ? ` + ${tc.incrementMs / 1000}s`
                : " · no increment"}
            </span>
            <span className="mt-4 block font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[#ffe566] uppercase">
              Play now
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}
