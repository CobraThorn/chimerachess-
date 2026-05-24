import { motion } from "framer-motion";
import { useState } from "react";
import { loadMemory } from "../../ai/memory";
import { PERSONAL_PUZZLE_CONFIG } from "../../personalPuzzles/config";
import type { PersonalPuzzle } from "../../personalPuzzles/types";
import { usePersonalPuzzles } from "../../hooks/usePersonalPuzzles";
import PersonalPuzzleDrill from "./PersonalPuzzleDrill";

const THEME_COLOR: Record<string, string> = {
  tactical: "text-[rgba(255,160,120,0.85)]",
  positional: "text-[rgba(210,190,255,0.85)]",
  cognitive: "text-[rgba(0,229,255,0.75)]",
  phase: "text-gold-glow",
};

export default function WeaknessPuzzleTrainer() {
  const memory = loadMemory();
  const { deck, refreshDeck } = usePersonalPuzzles(memory);
  const [active, setActive] = useState<PersonalPuzzle | null>(null);
  const [filterWp, setFilterWp] = useState<string | "all">("all");

  const filtered =
    filterWp === "all"
      ? deck.puzzles
      : deck.puzzles.filter((p) => p.weakpointId === filterWp);

  const activeIndex = active
    ? filtered.findIndex((p) => p.id === active.id)
    : -1;

  if (active && activeIndex >= 0) {
    return (
      <PersonalPuzzleDrill
        puzzle={active}
        index={activeIndex}
        total={filtered.length}
        onBack={() => setActive(null)}
        onNext={() => {
          const next = filtered[activeIndex + 1];
          if (next) setActive(next);
          else setActive(null);
        }}
      />
    );
  }

  return (
    <div id="train-weakness" className="mt-14 scroll-mt-28">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(180,140,255,0.65)] uppercase">
            Adaptive weakness training
          </p>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-gold-glow">
            Your custom puzzles
          </h3>
          <p className="mt-2 max-w-xl font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
            {deck.summary}
          </p>
        </div>
        {deck.unlocked && (
          <button
            type="button"
            onClick={refreshDeck}
            className="rounded-sm border border-[rgba(255,255,255,0.12)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-[rgba(255,255,255,0.45)] uppercase hover:text-white"
          >
            Refresh deck
          </button>
        )}
      </div>

      {!deck.unlocked && (
        <div className="mt-8 rounded-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.25)] p-8 text-center">
          <p className="font-[family-name:var(--font-display)] text-xl text-white">
            {deck.gamesSampled}/{PERSONAL_PUZZLE_CONFIG.minGamesToUnlock} games logged
          </p>
          <p className="mt-3 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
            Finish {PERSONAL_PUZZLE_CONFIG.minGamesToUnlock} rated games vs CHIMERA with post-game
            review. We extract positions from your real mistakes and build a personal puzzle set.
          </p>
        </div>
      )}

      {deck.unlocked && deck.weakpoints.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          <FilterChip
            active={filterWp === "all"}
            label="All weak points"
            onClick={() => setFilterWp("all")}
          />
          {deck.weakpoints.map((w) => (
            <FilterChip
              key={w.id}
              active={filterWp === w.id}
              label={w.label}
              onClick={() => setFilterWp(w.id)}
            />
          ))}
        </div>
      )}

      {deck.unlocked && deck.weakpoints.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {deck.weakpoints.map((w) => (
            <div
              key={w.id}
              className="rounded-sm border border-[rgba(255,255,255,0.06)] bg-[rgba(0,0,0,0.2)] p-4"
            >
              <p
                className={`font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] uppercase ${THEME_COLOR[w.theme] ?? ""}`}
              >
                {w.theme}
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-base text-white">
                {w.label}
              </p>
              <p className="mt-2 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.42)]">
                {w.insight}
              </p>
              <p className="mt-2 font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.3)]">
                Priority {w.priority} · {w.occurrences} signal{w.occurrences > 1 ? "s" : ""}
              </p>
            </div>
          ))}
        </div>
      )}

      {deck.unlocked && filtered.length === 0 && (
        <p className="mt-8 text-center text-sm text-[rgba(255,255,255,0.4)]">
          No puzzles for this filter yet — play more reviewed games with mistakes to study.
        </p>
      )}

      {deck.unlocked && filtered.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p, i) => (
            <motion.button
              key={p.id}
              type="button"
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.03 }}
              onClick={() => setActive(p)}
              className="group rounded-sm border border-[rgba(255,255,255,0.08)] bg-[rgba(0,0,0,0.3)] p-4 text-left transition hover:border-[rgba(180,140,255,0.35)]"
            >
              <span
                className={`font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] uppercase ${THEME_COLOR[p.theme] ?? ""}`}
              >
                {p.weakpointLabel}
              </span>
              <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-white group-hover:text-gold-glow">
                {p.headline}
              </p>
              <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.35)]">
                {p.moveLabel} · {p.severity}
              </p>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-2.5 py-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.12em] uppercase transition ${
        active
          ? "border-[rgba(180,140,255,0.45)] bg-[rgba(180,140,255,0.12)] text-white"
          : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.4)]"
      }`}
    >
      {label}
    </button>
  );
}
