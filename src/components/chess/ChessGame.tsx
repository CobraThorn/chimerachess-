import { motion } from "framer-motion";
import PlayArena from "./PlayArena";

export default function ChessGame() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="flex flex-col items-center"
    >
      <div className="mb-8 text-center">
        <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold tracking-wide text-gold-glow md:text-3xl">
          Play CHIMERA
        </h2>
        <p className="mt-2 max-w-lg font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.4)]">
          Unrated practice, rated clocks vs CHIMERA, human matchmaking, or mirror duels.
        </p>
      </div>
      <PlayArena />
    </motion.div>
  );
}
