import { motion } from "framer-motion";
import { useChimeraElo } from "../hooks/useChimeraElo";
import { loadMemory } from "../ai";
import { ensureCrsState } from "../crs/profile";
import ChimeraAcronym from "./ChimeraAcronym";
import EloBadge from "./chess/EloBadge";
import CrsRatingCard from "./crs/CrsRatingCard";
const CTAS = [
  {
    id: "play",
    label: "Play",
    sub: "Live Arena",
    primary: true,
    icon: "▶",
  },
  {
    id: "train",
    label: "Train",
    sub: "Neural Drills",
    primary: false,
    icon: "◈",
  },
  {
    id: "analyze",
    label: "Analyze",
    sub: "Deep Engine",
    primary: false,
    icon: "◎",
  },
] as const;

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.5 },
  },
};

const item = {
  hidden: { opacity: 0, y: 30 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
  },
};

export default function Hero() {
  const { chimeraElo } = useChimeraElo();
  const crs = ensureCrsState(loadMemory());
  return (
    <section
      id="home"
      className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-28 pb-28 text-center md:px-8 md:pb-20"
    >
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="relative z-10 max-w-4xl"
      >
        <motion.h1
          variants={item}
          className="relative font-[family-name:var(--font-display)] text-6xl font-black leading-[1.05] tracking-[0.12em] sm:text-7xl md:text-8xl lg:text-9xl"
        >
          <span className="text-gold-glow">CHIMERA</span>
          <motion.span
            className="absolute -right-4 -top-2 font-[family-name:var(--font-hud)] text-[10px] text-[rgba(0,229,255,0.6)] md:-right-6"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ●
          </motion.span>
        </motion.h1>

        <ChimeraAcronym variant="hero" />

        <motion.p
          variants={item}
          className="mx-auto mt-8 max-w-xl font-[family-name:var(--font-body)] text-base font-light leading-relaxed tracking-wide text-[rgba(255,255,255,0.55)] md:text-lg"
        >
          <span className="text-[rgba(232,197,71,0.85)]">
            Precision meets instinct.
          </span>{" "}
          Elite chess warfare powered by neural engines, real-time analytics,
          and a command interface built for champions.
        </motion.p>

        <motion.div
          variants={item}
          className="mt-4 font-[family-name:var(--font-hud)] text-[10px] tracking-[0.5em] uppercase"
        >
          <span className="text-gold-glow">
            Think Faster · Strike Deeper · Win Cleaner
          </span>
        </motion.div>

        <motion.div
          variants={item}
          className="mt-8 flex flex-wrap items-center justify-center gap-3"
        >
          <CrsRatingCard crs={crs} compact />
          <EloBadge label="CHIMERA strength" elo={chimeraElo} variant="cyan" size="sm" />        </motion.div>

        <motion.div
          variants={item}
          className="mt-14 flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-5"
        >
          {CTAS.map((cta, i) => (
            <motion.a
              key={cta.id}
              href={`#${cta.id}`}
              className={`btn-cta group relative flex min-w-[160px] flex-col items-center rounded-sm px-8 py-5 ${
                cta.primary
                  ? "border border-[rgba(232,197,71,0.55)] bg-gradient-to-b from-[rgba(232,197,71,0.2)] to-[rgba(168,139,42,0.08)] text-[#ffe566] shadow-[0_0_40px_rgba(232,197,71,0.2),inset_0_1px_0_rgba(255,255,255,0.1)]"
                  : "glass-panel text-[rgba(255,255,255,0.85)] hover:border-[rgba(0,229,255,0.25)]"
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 + i * 0.1 }}
              whileHover={{
                boxShadow: cta.primary
                  ? "0 0 50px rgba(232,197,71,0.4), 0 0 12px rgba(0,229,255,0.15)"
                  : "0 0 30px rgba(0,229,255,0.15)",
              }}
            >
              <span className="mb-1 text-lg opacity-60 transition-opacity group-hover:opacity-100">
                {cta.icon}
              </span>
              <span className="text-sm font-bold tracking-[0.2em]">
                {cta.label}
              </span>
              <span
                className={`mt-1 font-[family-name:var(--font-body)] text-[9px] font-normal tracking-[0.2em] normal-case ${
                  cta.primary
                    ? "text-[rgba(232,197,71,0.6)]"
                    : "text-[rgba(0,229,255,0.45)]"
                }`}
              >
                {cta.sub}
              </span>
              {cta.primary && (
                <motion.div
                  className="absolute inset-0 rounded-sm border border-[rgba(232,197,71,0.3)]"
                  animate={{ opacity: [0.3, 0.8, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </motion.a>
          ))}
        </motion.div>

        <motion.div
          variants={item}
          className="mt-20 flex items-center justify-center gap-6 text-[rgba(255,255,255,0.2)]"
        >
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-[rgba(232,197,71,0.3)]" />
          <motion.span
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.3em]"
          >
            SCROLL
          </motion.span>
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-[rgba(232,197,71,0.3)]" />
        </motion.div>
      </motion.div>
    </section>
  );
}
