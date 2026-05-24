import { AnimatePresence, motion } from "framer-motion";
import { useState, type ReactNode } from "react";
import { mergeMistakeDisplay } from "../../mistakeIntel/gptEnrichment";
import type { MistakeIntelligence, MistakeIntelligenceReport } from "../../mistakeIntel/types";

interface MistakeDeepDivePanelProps {
  report: MistakeIntelligenceReport | null | undefined;
  gptEnabled?: boolean;
  gptEnriching?: boolean;
  gptProgress?: { done: number; total: number };
}

const SEVERITY_STYLES: Record<
  MistakeIntelligence["severity"],
  { border: string; text: string; bg: string }
> = {
  inaccuracy: {
    border: "border-[rgba(255,200,100,0.25)]",
    text: "text-[rgba(255,200,100,0.9)]",
    bg: "bg-[rgba(255,200,100,0.04)]",
  },
  mistake: {
    border: "border-[rgba(255,140,80,0.3)]",
    text: "text-[rgba(255,160,100,0.95)]",
    bg: "bg-[rgba(255,120,60,0.06)]",
  },
  blunder: {
    border: "border-[rgba(255,80,80,0.35)]",
    text: "text-[rgba(255,120,120,0.95)]",
    bg: "bg-[rgba(255,60,60,0.08)]",
  },
  critical: {
    border: "border-[rgba(255,60,120,0.4)]",
    text: "text-[rgba(255,100,160,0.95)]",
    bg: "bg-[rgba(255,40,100,0.08)]",
  },
};

export default function MistakeDeepDivePanel({
  report,
  gptEnabled = false,
  gptEnriching = false,
  gptProgress,
}: MistakeDeepDivePanelProps) {
  if (!report || report.mistakes.length === 0) return null;

  const pct =
    gptProgress && gptProgress.total > 0
      ? Math.round((gptProgress.done / gptProgress.total) * 100)
      : 0;

  return (
    <section className="mt-8 border-t border-[rgba(180,140,255,0.15)] pt-8">
      <header>
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(180,140,255,0.7)] uppercase">
          Decision autopsy · mistake intelligence
        </p>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.5)]">
          {report.summary}
        </p>
        {gptEnabled && (
          <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-[rgba(0,229,255,0.55)]">
            {gptEnriching
              ? `AI coach rewriting autopsies… ${pct}%`
              : "AI coach layer active — engine facts preserved"}
          </p>
        )}
      </header>

      {report.recurringPatterns.length > 0 && (
        <div className="mt-4 rounded-sm border border-[rgba(232,197,71,0.2)] bg-[rgba(232,197,71,0.04)] p-4">
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-gold-glow uppercase">
            Recurring patterns
          </p>
          <ul className="mt-2 space-y-1">
            {report.recurringPatterns.map((line) => (
              <li
                key={line}
                className="font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.55)]"
              >
                {line}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {report.mistakes.map((m) => (
          <MistakeCard key={m.id} mistake={m} />
        ))}
      </div>
    </section>
  );
}

function MistakeCard({ mistake }: { mistake: MistakeIntelligence }) {
  const [open, setOpen] = useState(mistake.severity === "blunder" || mistake.severity === "critical");
  const style = SEVERITY_STYLES[mistake.severity];
  const d = mergeMistakeDisplay(mistake);

  return (
    <div className={`rounded-sm border ${style.border} ${style.bg}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-start justify-between gap-3 p-4 text-left"
      >
        <div>
          <p className={`font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] uppercase ${style.text}`}>
            {mistake.severity} · {mistake.confidence}% confidence
            {d.hasGpt && (
              <span className="ml-2 text-[rgba(0,229,255,0.7)]">· AI coach</span>
            )}
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-white">
            {d.headline}
          </p>
          <p className="mt-1 font-mono text-[11px] text-[rgba(255,255,255,0.45)]">
            {mistake.playerMove} → engine {mistake.bestMove} (
            {Math.round((mistake.evaluationSwing / 100) * 10) / 10} pawns)
          </p>
        </div>
        <span className="shrink-0 font-[family-name:var(--font-hud)] text-[10px] text-[rgba(255,255,255,0.35)]">
          {open ? "−" : "+"}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-[rgba(255,255,255,0.06)]"
          >
            <div className="space-y-4 p-4 pt-3">
              <WhyItMatters text={d.whyItMatters} ai={d.hasGpt} />

              {mistake.patternTags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {mistake.patternTags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-sm border border-[rgba(180,140,255,0.25)] px-2 py-0.5 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.1em] text-[rgba(180,140,255,0.8)] uppercase"
                    >
                      {tag.replace(":recurring", " · recurring")}
                    </span>
                  ))}
                </div>
              )}

              <ExplainBlock title="What happened" body={d.explanation.whatHappened} ai={d.hasGpt} />
              <ExplainBlock title="Why it was wrong" body={d.explanation.whyWrong} ai={d.hasGpt} />

              {d.explanation.violatedConcepts.length > 0 && (
                <div>
                  <BlockTitle>Concepts violated</BlockTitle>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {d.explanation.violatedConcepts.map((c) => (
                      <span
                        key={c}
                        className="rounded-sm bg-[rgba(255,255,255,0.05)] px-2 py-0.5 text-[10px] text-[rgba(0,229,255,0.7)]"
                      >
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <ExplainBlock title="Stronger move" body={d.explanation.whyBestMoveWorks} ai={d.hasGpt} />
              <ExplainBlock
                title="Likely thought process"
                body={d.explanation.likelyThoughtProcess}
                ai={d.hasGpt}
              />

              {d.explanation.cognitiveFailure.length > 0 && (
                <div>
                  <BlockTitle>Cognitive signals</BlockTitle>
                  <ul className="mt-1 space-y-1">
                    {d.explanation.cognitiveFailure.map((line) => (
                      <li
                        key={line}
                        className="font-[family-name:var(--font-body)] text-[11px] text-[rgba(210,190,255,0.75)]"
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {d.explanation.boardConsequences.length > 0 && (
                <div>
                  <BlockTitle>Board consequences</BlockTitle>
                  <ul className="mt-1 list-inside list-disc space-y-0.5 text-[11px] text-[rgba(255,255,255,0.5)]">
                    {d.explanation.boardConsequences.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}

              {(mistake.tacticalTheme?.length ?? 0) > 0 && (
                <ThemeRow label="Tactical themes" items={mistake.tacticalTheme!} />
              )}
              {(mistake.strategicTheme?.length ?? 0) > 0 && (
                <ThemeRow label="Strategic themes" items={mistake.strategicTheme!} />
              )}

              {mistake.openingContext && (
                <ExplainBlock title="Opening context" body={mistake.openingContext} />
              )}
              {mistake.endgameContext && (
                <ExplainBlock title="Endgame context" body={mistake.endgameContext} />
              )}

              <div>
                <BlockTitle>How to avoid repeating this</BlockTitle>
                <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.55)]">
                  {d.explanation.preventionAdvice}
                </p>
              </div>

              {d.trainingRecommendation.length > 0 && (
                <div>
                  <BlockTitle>Training prescription</BlockTitle>
                  <ul className="mt-1 space-y-1">
                    {d.trainingRecommendation.map((t) => (
                      <li
                        key={t}
                        className="font-[family-name:var(--font-body)] text-[11px] text-[rgba(120,255,180,0.8)]"
                      >
                        ▸ {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function WhyItMatters({ text, ai }: { text: string; ai?: boolean }) {
  return (
    <div className="rounded-sm border border-[rgba(0,229,255,0.15)] bg-[rgba(0,229,255,0.04)] p-3">
      <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(0,229,255,0.6)] uppercase">
        Why this matters{ai ? " · AI coach" : ""}
      </p>
      <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-white">{text}</p>
    </div>
  );
}

function ExplainBlock({
  title,
  body,
  ai,
}: {
  title: string;
  body: string;
  ai?: boolean;
}) {
  return (
    <div>
      <BlockTitle>
        {title}
        {ai ? " · AI" : ""}
      </BlockTitle>
      <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] leading-relaxed text-[rgba(255,255,255,0.55)]">
        {body}
      </p>
    </div>
  );
}

function BlockTitle({ children }: { children: ReactNode }) {
  return (
    <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.35)] uppercase">
      {children}
    </p>
  );
}

function ThemeRow({ label, items }: { label: string; items: string[] }) {
  return (
    <div>
      <BlockTitle>{label}</BlockTitle>
      <p className="mt-0.5 text-[11px] capitalize text-[rgba(255,255,255,0.5)]">
        {items.join(" · ")}
      </p>
    </div>
  );
}
