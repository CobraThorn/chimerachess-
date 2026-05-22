import { motion } from "framer-motion";
import { useChimeraElo } from "../hooks/useChimeraElo";

export default function HudOverlay() {
  const { userElo } = useChimeraElo();
  return (
    <div className="pointer-events-none absolute inset-0 z-[2] scanlines" aria-hidden>
      <div className="vignette absolute inset-0" />

      <div className="absolute inset-6 border border-[rgba(232,197,71,0.06)] md:inset-10">
        <span className="hud-corner hud-corner--tl" />
        <span className="hud-corner hud-corner--tr" />
        <span className="hud-corner hud-corner--bl" />
        <span className="hud-corner hud-corner--br" />
      </div>

      <motion.div
        className="absolute left-6 top-1/2 hidden -translate-y-1/2 flex-col gap-1 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.3em] text-[rgba(0,229,255,0.35)] md:flex lg:left-10"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
      >
        {["SYS", "NET", "AI", "ENG"].map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <span className="text-[rgba(232,197,71,0.5)]">{label}</span>
            <span className="h-px w-8 bg-gradient-to-r from-[rgba(0,229,255,0.4)] to-transparent" />
            <motion.span
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.3 }}
            >
              {["OK", "OK", "ON", "RDY"][i]}
            </motion.span>
          </div>
        ))}
      </motion.div>

      <motion.div
        className="absolute right-6 top-1/2 hidden -translate-y-1/2 text-right font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-[rgba(232,197,71,0.35)] md:block lg:right-10"
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.8 }}
      >
        <div>ELO {userElo}</div>
        <div className="mt-1 text-[rgba(0,229,255,0.4)]">RATED</div>
        <motion.div
          className="mt-3 h-16 w-px bg-gradient-to-b from-[rgba(232,197,71,0.5)] via-[rgba(0,229,255,0.3)] to-transparent ml-auto"
          animate={{ scaleY: [0.6, 1, 0.6] }}
          transition={{ duration: 3, repeat: Infinity }}
          style={{ transformOrigin: "top" }}
        />
      </motion.div>

      <div className="absolute bottom-8 left-1/2 flex -translate-x-1/2 gap-8 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.4em] text-[rgba(255,255,255,0.15)]">
        <span>CHIMERA v2.4.1</span>
        <span className="text-[rgba(232,197,71,0.25)]">◆</span>
        <span>SECURE CHANNEL</span>
      </div>
    </div>
  );
}
