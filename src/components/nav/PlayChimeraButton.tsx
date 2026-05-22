import { motion } from "framer-motion";

interface PlayChimeraButtonProps {
  compact?: boolean;
}

export default function PlayChimeraButton({ compact = false }: PlayChimeraButtonProps) {
  return (
    <motion.a
      href="#play"
      className={`btn-cta group relative flex items-center justify-center overflow-hidden rounded-sm border border-[rgba(232,197,71,0.55)] bg-gradient-to-b from-[rgba(232,197,71,0.22)] to-[rgba(168,139,42,0.08)] text-[#ffe566] shadow-[0_0_24px_rgba(232,197,71,0.18)] ${
        compact
          ? "px-3 py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.18em]"
          : "gap-2 px-4 py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.22em] sm:px-5 sm:py-2.5 sm:text-[10px]"
      }`}
      whileHover={{
        boxShadow:
          "0 0 36px rgba(232,197,71,0.45), 0 0 10px rgba(0,229,255,0.12)",
        scale: 1.02,
      }}
      whileTap={{ scale: 0.97 }}
    >
      {!compact && (
        <span className="text-[10px] opacity-70 transition-opacity group-hover:opacity-100">
          ▶
        </span>
      )}
      <span className={compact ? "" : "whitespace-nowrap"}>
        {compact ? "Play" : "Play CHIMERA"}
      </span>
      <motion.span
        className="pointer-events-none absolute inset-0 rounded-sm border border-[rgba(232,197,71,0.35)]"
        animate={{ opacity: [0.2, 0.7, 0.2] }}
        transition={{ duration: 2.2, repeat: Infinity }}
      />
    </motion.a>
  );
}
