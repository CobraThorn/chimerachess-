import { AnimatePresence, motion } from "framer-motion";
import type { CrsPostGameSummary } from "../../crs/types";
import { getChimeraClass } from "../../crs/classes";

interface CrsPostGamePanelProps {
  summary: CrsPostGameSummary;
  onContinue: () => void;
}

export default function CrsPostGamePanel({
  summary,
  onContinue,
}: CrsPostGamePanelProps) {
  const win = summary.result === "win";
  const draw = summary.result === "draw";
  const cls = getChimeraClass(summary.newRating);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[95] flex items-center justify-center bg-[rgba(3,3,10,0.88)] p-4 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="glass-panel relative w-full max-w-md rounded-sm p-8 md:p-10"
      >
        <span className="hud-corner hud-corner--tl" />
        <span className="hud-corner hud-corner--br" />

        <AnimatePresence>
          {summary.promoted && (
            <motion.p
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 text-center font-[family-name:var(--font-hud)] text-[10px] tracking-[0.45em] text-gold-glow uppercase"
            >
              {summary.className} achieved
            </motion.p>
          )}
        </AnimatePresence>

        <p
          className={`text-center font-[family-name:var(--font-display)] text-3xl tracking-wide ${
            win ? "text-gold-glow" : draw ? "text-[rgba(255,255,255,0.7)]" : "text-[rgba(255,255,255,0.55)]"
          }`}
        >
          {win ? "Victory" : draw ? "Draw" : "Defeat"}
        </p>

        <p
          className={`mt-4 text-center font-[family-name:var(--font-display)] text-4xl ${
            summary.delta >= 0 ? "text-[rgba(0,229,255,0.9)]" : "text-[rgba(255,140,120,0.9)]"
          }`}
        >
          {summary.delta >= 0 ? "+" : ""}
          {summary.delta} CRS
        </p>

        <p className="mt-2 text-center font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
          {summary.previousRating} → {summary.newRating}
        </p>

        <div className="mt-8 grid grid-cols-2 gap-3">
          <Stat label="Performance" value={summary.performanceLabel} />
          <Stat label="Accuracy" value={`${summary.accuracy}%`} />
          <Stat label="Decision" value={summary.decisionGrade} />
          <Stat label="Pressure" value={summary.pressureLabel} />
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-4 font-[family-name:var(--font-hud)] text-[9px] text-[rgba(255,255,255,0.4)]">
          <span>!! {summary.brilliantMoves}</span>
          <span>? {summary.mistakes}</span>
          <span>?? {summary.blunders}</span>
        </div>

        <p className="mt-6 text-center font-[family-name:var(--font-body)] text-xs leading-relaxed text-[rgba(255,255,255,0.5)]">
          {summary.insight}
        </p>

        <p
          className="mt-4 text-center font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] uppercase"
          style={{ color: cls.accent }}
        >
          {summary.className} · {summary.percentileLabel}
        </p>

        <button
          type="button"
          onClick={onContinue}
          className="mt-8 w-full rounded-sm border border-[rgba(232,197,71,0.4)] py-3 font-[family-name:var(--font-hud)] text-[10px] tracking-[0.25em] text-gold-glow transition-colors hover:bg-[rgba(232,197,71,0.08)]"
        >
          Continue to review
        </button>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2 text-center">
      <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(255,255,255,0.35)] uppercase">
        {label}
      </p>
      <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-white">{value}</p>
    </div>
  );
}
