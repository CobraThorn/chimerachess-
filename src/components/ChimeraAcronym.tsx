import { motion } from "framer-motion";
import {
  CHIMERA_EXPANSION,
  CHIMERA_EXPANSION_TAIL,
  CHIMERA_FULL_NAME,
} from "../content/chimera";

interface ChimeraAcronymProps {
  variant?: "hero" | "compact";
}

export default function ChimeraAcronym({ variant = "hero" }: ChimeraAcronymProps) {
  const isHero = variant === "hero";

  if (!isHero) {
    return (
      <p className="font-[family-name:var(--font-hud)] text-[7px] leading-snug tracking-[0.12em] text-[rgba(0,229,255,0.45)] uppercase">
        {CHIMERA_FULL_NAME}
      </p>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.7, duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      className="mx-auto mt-5 max-w-2xl px-2"
      aria-label={CHIMERA_FULL_NAME}
    >
      <div className="mb-4 flex items-center justify-center gap-4">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-[rgba(232,197,71,0.35)] sm:w-20" />
        <motion.span
          className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.5em] text-[rgba(0,229,255,0.45)]"
          animate={{ opacity: [0.35, 0.7, 0.35] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          ◆
        </motion.span>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-[rgba(232,197,71,0.35)] sm:w-20" />
      </div>

      <p className="font-[family-name:var(--font-body)] text-sm font-light leading-[1.85] tracking-wide text-[rgba(255,255,255,0.42)] md:text-[15px]">
        {CHIMERA_EXPANSION.map((seg, i) => (
          <span key={seg.letter}>
            <AcronymWord seg={seg} />
            {i < CHIMERA_EXPANSION.length - 1 ? " " : " "}
          </span>
        ))}
        <span className="text-[rgba(255,255,255,0.22)]">for </span>
        {CHIMERA_EXPANSION_TAIL.map((seg, i) => (
          <span key={seg.letter}>
            <AcronymWord seg={seg} />
            {i < CHIMERA_EXPANSION_TAIL.length - 1 ? " " : ""}
          </span>
        ))}
      </p>
    </motion.div>
  );
}

function AcronymWord({ seg }: { seg: { letter: string; word: string } }) {
  const rest = seg.word.slice(1);
  return (
    <span>
      <span className="font-[family-name:var(--font-display)] font-semibold text-[rgba(232,197,71,0.9)]">
        {seg.letter}
      </span>
      <span>{rest}</span>
    </span>
  );
}
