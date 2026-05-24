import { motion } from "framer-motion";
import type { ReactNode } from "react";
import type { PostGameIntelligenceReport } from "../../intelligence/types";
import { getAxisMeta } from "../../intelligence/config";
import { useMistakeGptEnrichment } from "../../hooks/useMistakeGptEnrichment";
import type { GameReviewReport } from "../../review/types";
import MistakeDeepDivePanel from "./MistakeDeepDivePanel";

interface PostGameIntelligencePanelProps {
  report: PostGameIntelligenceReport | null;
  reviewReport?: GameReviewReport | null;
  loading?: boolean;
}

export default function PostGameIntelligencePanel({
  report,
  reviewReport = null,
  loading = false,
}: PostGameIntelligencePanelProps) {
  const {
    report: mistakeReport,
    enriching: gptEnriching,
    progress: gptProgress,
    gptEnabled,
  } = useMistakeGptEnrichment(report?.mistakeIntelligence, reviewReport);
  if (loading) {
    return (
      <section className="mt-8 rounded-sm border border-[rgba(0,229,255,0.12)] bg-[rgba(0,229,255,0.03)] p-6">
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
          Performance lab
        </p>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
          Synthesizing behavioral intelligence…
        </p>
      </section>
    );
  }

  if (!report) return null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-sm border border-[rgba(120,80,255,0.2)] bg-[rgba(80,40,160,0.06)] p-6 md:p-8"
    >
      <header>
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(180,140,255,0.7)] uppercase">
          Performance lab · intelligence report
        </p>
        <h3 className="mt-2 font-[family-name:var(--font-display)] text-2xl text-gold-glow">
          {report.headline}
        </h3>
        <p className="mt-2 font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.5)]">
          {report.summary}
        </p>
        {report.compareToPrevious && (
          <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-[rgba(0,229,255,0.55)]">
            {report.compareToPrevious.message}
          </p>
        )}
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        <LabStat label="Report confidence" value={`${report.confidence.overall}%`} />
        <LabStat label="Data quality" value={report.confidence.dataQuality} />
        <LabStat label="Games sampled" value={String(report.confidence.sampleGames)} />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div>
          <LabTitle>Strengths</LabTitle>
          <ul className="mt-2 space-y-1.5">
            {report.strengths.map((s) => (
              <li key={s} className="text-sm text-[rgba(120,255,180,0.75)]">
                + {s}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <LabTitle>Focus areas</LabTitle>
          <ul className="mt-2 space-y-1.5">
            {report.weaknesses.map((w) => (
              <li key={w} className="text-sm text-[rgba(255,160,120,0.8)]">
                − {w}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8">
        <LabTitle>Phenotype movement</LabTitle>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {report.phenotypeMovement
            .filter((m) => m.direction !== "flat")
            .slice(0, 6)
            .map((m) => (
              <div
                key={m.key}
                className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2"
              >
                <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(255,255,255,0.35)] uppercase">
                  {getAxisMeta(m.key).short} · {m.confidence}% conf.
                </p>
                <p className="font-[family-name:var(--font-body)] text-xs text-white">
                  {m.label}{" "}
                  <span
                    className={
                      m.direction === "up"
                        ? "text-[rgba(120,255,180,0.9)]"
                        : "text-[rgba(255,120,120,0.9)]"
                    }
                  >
                    {m.delta > 0 ? "+" : ""}
                    {m.delta}
                  </span>
                </p>
                <p className="mt-0.5 text-[10px] text-[rgba(255,255,255,0.4)]">
                  {m.interpretation}
                </p>
              </div>
            ))}
        </div>
      </div>

      <div className="mt-8">
        <LabTitle>Trends</LabTitle>
        <div className="mt-2 flex flex-wrap gap-4 font-[family-name:var(--font-hud)] text-[9px]">
          <TrendChip metric={report.performanceTrends.accuracy} />
          <TrendChip metric={report.performanceTrends.acpl} invert />
          <span className="text-[rgba(255,255,255,0.4)]">
            {report.performanceTrends.streakLabel}
          </span>
        </div>
      </div>

      {report.coachingNotes.length > 0 && (
        <div className="mt-8">
          <LabTitle>Coaching protocol</LabTitle>
          <div className="mt-3 space-y-3">
            {report.coachingNotes.map((n) => (
              <div
                key={n.id}
                className="rounded-sm border border-[rgba(232,197,71,0.15)] bg-[rgba(232,197,71,0.04)] p-4"
              >
                <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-gold-glow uppercase">
                  P{n.priority} · {n.focusArea} · {n.timeframe}
                </p>
                <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-white">
                  {n.prescription}
                </p>
                <p className="mt-1 text-[11px] text-[rgba(255,255,255,0.4)]">
                  {n.rationale}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <MistakeDeepDivePanel
        report={mistakeReport ?? report.mistakeIntelligence}
        gptEnabled={gptEnabled}
        gptEnriching={gptEnriching}
        gptProgress={gptProgress}
      />

      {report.behavioralObservations.length > 0 && (
        <div className="mt-8">
          <LabTitle>Behavioral signals</LabTitle>
          <ul className="mt-2 space-y-2">
            {report.behavioralObservations.map((b) => (
              <li
                key={b.id}
                className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2"
              >
                <span className="font-[family-name:var(--font-hud)] text-[7px] uppercase text-[rgba(180,140,255,0.6)]">
                  {b.severity}
                </span>
                <p className="text-sm text-white">{b.title}</p>
                <p className="text-[11px] text-[rgba(255,255,255,0.45)]">{b.detail}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.section>
  );
}

function LabTitle({ children }: { children: ReactNode }) {
  return (
    <h4 className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.3em] text-[rgba(180,140,255,0.65)] uppercase">
      {children}
    </h4>
  );
}

function LabStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2">
      <p className="font-[family-name:var(--font-hud)] text-[7px] text-[rgba(255,255,255,0.35)] uppercase">
        {label}
      </p>
      <p className="font-[family-name:var(--font-display)] text-lg capitalize text-[rgba(180,140,255,0.9)]">
        {value}
      </p>
    </div>
  );
}

function TrendChip({
  metric,
  invert = false,
}: {
  metric: PostGameIntelligenceReport["performanceTrends"]["accuracy"];
  invert?: boolean;
}) {
  const good =
    metric.direction === "stable"
      ? true
      : invert
        ? metric.direction === "declining"
        : metric.direction === "improving";
  const color = good
    ? "text-[rgba(120,255,180,0.8)]"
    : metric.direction === "stable"
      ? "text-[rgba(255,255,255,0.4)]"
      : "text-[rgba(255,120,120,0.8)]";
  return (
    <span className={color}>
      {metric.label}: {metric.current}
      {metric.delta !== 0 && ` (${metric.delta > 0 ? "+" : ""}${metric.delta})`}
    </span>
  );
}
