import { motion } from "framer-motion";
import { LEGENDS } from "../../content/legends";
import LegendCard from "./LegendCard";

export default function LegendsSection() {
  return (
    <div className="mt-12 space-y-16">
      <motion.div
        className="flex flex-wrap gap-2"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
      >
        {LEGENDS.map((legend) => (
          <a
            key={legend.id}
            href={`#legend-${legend.id}`}
            className="rounded-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(255,255,255,0.45)] uppercase transition hover:border-[rgba(0,229,255,0.3)] hover:text-[rgba(0,229,255,0.85)]"
          >
            {legend.name}
          </a>
        ))}
      </motion.div>

      {LEGENDS.map((legend, index) => (
        <LegendCard key={legend.id} legend={legend} index={index} />
      ))}
    </div>
  );
}
