import { motion } from "framer-motion";
import { useState } from "react";
import { OPENING_LINES } from "../../content/openings";
import OpeningDrill from "./OpeningDrill";

export default function OpeningTrainer() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = OPENING_LINES.find((o) => o.id === activeId) ?? null;

  return (
    <div id="train-openings" className="mt-12 scroll-mt-28">
      <div className="mb-6">
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
          Opening repertoire · 10 lines
        </p>
        <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.4)]">
          Interactive boards — play your moves; opponent replies automatically.
        </p>
      </div>

      {!active && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {OPENING_LINES.map((opening, i) => (
            <motion.button
              key={opening.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04 }}
              onClick={() => setActiveId(opening.id)}
              className="group glass-panel rounded-sm p-4 text-left transition-colors hover:border-[rgba(232,197,71,0.25)]"
            >
              <span className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(0,229,255,0.5)]">
                {opening.eco}
              </span>
              <h3 className="mt-2 font-[family-name:var(--font-display)] text-sm font-semibold text-white group-hover:text-gold-glow">
                {opening.name}
              </h3>
              <p className="mt-2 line-clamp-2 font-[family-name:var(--font-body)] text-[11px] leading-snug text-[rgba(255,255,255,0.38)]">
                {opening.tagline}
              </p>
              <p className="mt-3 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(232,197,71,0.45)]">
                {opening.userColor === "w" ? "WHITE" : "BLACK"} · {opening.moves.length} plies
              </p>
            </motion.button>
          ))}
        </div>
      )}

      {active && (
        <OpeningDrill
          key={active.id}
          opening={active}
          onBack={() => setActiveId(null)}
        />
      )}
    </div>
  );
}
