import { motion } from "framer-motion";
import { getChimeraClass, percentileLabel } from "../../crs/classes";
import type { ChimeraRatingState } from "../../crs/types";

interface CrsRatingCardProps {
  crs: ChimeraRatingState;
  mode?: keyof ChimeraRatingState["modeRatings"];
  delta?: number;
  compact?: boolean;
}

export default function CrsRatingCard({
  crs,
  mode = "chimera",
  delta,
  compact = false,
}: CrsRatingCardProps) {
  const rating = crs.modeRatings[mode] ?? crs.chimeraRating;
  const cls = getChimeraClass(rating);

  if (compact) {
    return (
      <motion.div
        initial={delta !== undefined ? { scale: 1.05 } : false}
        animate={{ scale: 1 }}
        className="inline-flex flex-col items-center rounded-sm border border-[rgba(232,197,71,0.25)] bg-[rgba(232,197,71,0.05)] px-3 py-1.5"
      >
        <span className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.25em] text-[rgba(255,255,255,0.4)]">
          CRS
        </span>
        <span className="font-[family-name:var(--font-display)] text-lg text-gold-glow">
          {rating}
        </span>
        {delta !== undefined && delta !== 0 && (
          <span
            className={`font-[family-name:var(--font-hud)] text-[8px] tracking-[0.1em] ${
              delta > 0 ? "text-[rgba(0,229,255,0.85)]" : "text-[rgba(255,120,120,0.85)]"
            }`}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-sm border px-6 py-5"
      style={{
        borderColor: `${cls.accent}44`,
        background: `linear-gradient(135deg, rgba(8,8,14,0.95), ${cls.accent}08)`,
      }}
    >
      <span
        className="absolute right-4 top-4 font-[family-name:var(--font-display)] text-4xl opacity-20"
        style={{ color: cls.accent }}
        aria-hidden
      >
        {cls.emblem}
      </span>
      <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.4em] text-[rgba(0,229,255,0.55)] uppercase">
        Chimera Rating
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-wide text-gold-glow">
        {rating}
        <span className="ml-2 text-lg text-[rgba(255,255,255,0.35)]">CRS</span>
      </p>
      <p
        className="mt-1 font-[family-name:var(--font-hud)] text-[10px] tracking-[0.3em] uppercase"
        style={{ color: cls.accent }}
      >
        {cls.name} Class
      </p>
      <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
        {percentileLabel(rating)}
      </p>
      {delta !== undefined && delta !== 0 && (
        <motion.p
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`mt-3 font-[family-name:var(--font-hud)] text-sm tracking-[0.15em] ${
            delta > 0 ? "text-[rgba(0,229,255,0.85)]" : "text-[rgba(255,120,120,0.85)]"
          }`}
        >
          {delta > 0 ? "+" : ""}
          {delta} CRS
        </motion.p>
      )}
    </motion.div>
  );
}
