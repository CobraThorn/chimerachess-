import { motion } from "framer-motion";
import {
  ADAPTATION_INTERVAL_GAMES,
  ensureLearning,
  gamesUntilNextAdaptation,
} from "../../ai/learning/learn";
import { counterStyleLabel, learningIsActive } from "../../ai/learning/apply";
import { phenotypeDisplayName } from "../../ai/learning/phenotype";
import { formatTraitProgress } from "../../ai/cognition/personalityEvolution";
import type { ChimeraMemory } from "../../ai/types";
import PhenotypeRadarPanel from "../chimera/PhenotypeRadarPanel";
interface ChimeraLearningPanelProps {
  memory: ChimeraMemory;
  compact?: boolean;
}

export default function ChimeraLearningPanel({
  memory,
  compact = false,
}: ChimeraLearningPanelProps) {
  const L = ensureLearning(memory);
  const adapt = L.adaptationScore;
  const untilAdapt = gamesUntilNextAdaptation(L);
  const phenotypeLabel = L.phenotype
    ? phenotypeDisplayName(L.phenotype)
    : null;
  const traitProgress = L.evolution ? formatTraitProgress(L.evolution) : [];
  if (compact) {
    return (
      <div className="rounded-sm border border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.05)] px-3 py-2">
        <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.25em] text-[rgba(0,229,255,0.55)] uppercase">
          Adaptive learning
        </p>
        <p className="font-[family-name:var(--font-display)] text-sm text-[rgba(0,229,255,0.9)]">
          {adapt}% · {counterStyleLabel(L.counterStyle)}
        </p>
        {untilAdapt > 0 && (
          <p className="font-[family-name:var(--font-hud)] text-[6px] text-[rgba(255,255,255,0.35)]">
            Adapts in {untilAdapt} game{untilAdapt === 1 ? "" : "s"}
          </p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-sm p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.55)] uppercase">
            CHIMERA adaptive learning
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.45)]">
            CHIMERA starts as a random phenotype for you. Every{" "}
            {ADAPTATION_INTERVAL_GAMES} rated games it runs a full adapt pass —
            counter-style, habit tags, and pattern punishment update together.
          </p>
          {phenotypeLabel && (
            <p className="mt-2 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(232,197,71,0.65)]">
              Phenotype · {phenotypeLabel}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="font-[family-name:var(--font-display)] text-2xl text-[rgba(0,229,255,0.9)]">
            {adapt}%
          </p>
          <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(255,255,255,0.35)]">
            {learningIsActive(memory) ? "adapted" : "observing"}
          </p>
          {untilAdapt > 0 ? (
            <p className="mt-1 font-[family-name:var(--font-hud)] text-[6px] text-[rgba(0,229,255,0.45)]">
              Next adapt in {untilAdapt}
            </p>
          ) : (
            <p className="mt-1 font-[family-name:var(--font-hud)] text-[6px] text-[rgba(0,229,255,0.55)]">
              Adapted this cycle
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[rgba(0,229,255,0.5)] to-[rgba(232,197,71,0.6)] transition-all duration-500"
          style={{ width: `${adapt}%` }}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <span className="rounded-sm border border-[rgba(232,197,71,0.25)] px-2 py-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.12em] text-gold-glow">
          {counterStyleLabel(L.counterStyle)}
        </span>
        {L.habitTags.map((tag) => (
          <span
            key={tag}
            className="rounded-sm border border-[rgba(255,255,255,0.08)] px-2 py-1 font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.45)]"
          >
            {tag}
          </span>
        ))}
      </div>

      {L.focusWeakness && (
        <p className="mt-3 font-[family-name:var(--font-body)] text-xs text-[rgba(255,200,140,0.75)]">
          Target: {L.focusWeakness}
        </p>
      )}

      {traitProgress.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {traitProgress.slice(0, 4).map((t) => (
            <span
              key={t.label}
              className="font-[family-name:var(--font-hud)] text-[7px] text-[rgba(0,229,255,0.55)]"
            >
              {t.label} {t.text}
            </span>
          ))}
        </div>
      )}

      {L.phenotype?.personalityId && (
        <div className="mt-5 border-t border-[rgba(232,197,71,0.08)] pt-5">
          <PhenotypeRadarPanel memory={memory} compact />
        </div>
      )}

      {L.lastLesson && (
        <p className="mt-3 rounded-sm border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.04)] px-3 py-2 font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-[rgba(255,255,255,0.55)]">
          Latest: {L.lastLesson}
        </p>
      )}

      {L.lessons.length > 0 && (
        <ul className="mt-4 max-h-36 space-y-2 overflow-y-auto">
          {L.lessons.slice(0, 6).map((lesson) => (
            <li
              key={lesson.id}
              className="font-[family-name:var(--font-body)] text-[10px] leading-snug text-[rgba(255,255,255,0.45)]"
            >
              <span className="mr-1 text-[rgba(0,229,255,0.45)]">▸</span>
              {lesson.text}
            </li>
          ))}
        </ul>
      )}
    </motion.div>
  );
}
