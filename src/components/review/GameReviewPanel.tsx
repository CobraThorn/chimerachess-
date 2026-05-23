import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { formatEvalLabel, evalToBarPercent } from "../../engine/analysis";
import type { GameReviewReport, MoveGrade, ReviewProgress } from "../../review/types";

const GRADE_STYLES: Record<
  MoveGrade,
  { label: string; className: string }
> = {
  brilliant: {
    label: "!!",
    className: "text-[rgba(0,229,255,0.95)] border-[rgba(0,229,255,0.4)]",
  },
  great: { label: "!", className: "text-[rgba(52,211,153,0.9)] border-[rgba(52,211,153,0.35)]" },
  good: { label: "✓", className: "text-[rgba(255,255,255,0.7)] border-[rgba(255,255,255,0.15)]" },
  book: { label: "📖", className: "text-[rgba(232,197,71,0.8)] border-[rgba(232,197,71,0.3)]" },
  inaccuracy: {
    label: "?!",
    className: "text-[rgba(255,200,100,0.85)] border-[rgba(255,200,100,0.3)]",
  },
  mistake: {
    label: "?",
    className: "text-[rgba(255,160,80,0.9)] border-[rgba(255,160,80,0.35)]",
  },
  blunder: {
    label: "??",
    className: "text-[rgba(255,100,100,0.95)] border-[rgba(255,100,100,0.4)]",
  },
};

interface GameReviewPanelProps {
  report: GameReviewReport | null;
  loading: boolean;
  progress: ReviewProgress | null;
  onClose: () => void;
  onNewGame?: () => void;
}

export default function GameReviewPanel({
  report,
  loading,
  progress,
  onClose,
  onNewGame,
}: GameReviewPanelProps) {
  if (!loading && !report) return null;

  const pct = progress
    ? Math.round((progress.step / Math.max(1, progress.total)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(3,3,8,0.92)] p-4 pt-8 pb-16 backdrop-blur-sm"
    >
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel relative w-full max-w-3xl rounded-sm p-6 md:p-10"
      >
        <span className="hud-corner hud-corner--tl" />
        <span className="hud-corner hud-corner--br" />

        {loading && (
          <div className="py-16 text-center">
            <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.4em] text-[rgba(0,229,255,0.6)] uppercase">
              Game review
            </p>
            <p className="mt-4 font-[family-name:var(--font-display)] text-2xl text-gold-glow">
              Analysing every move…
            </p>
            <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
              {progress?.label ?? "Stockfish deep pass"}
            </p>
            <div className="mx-auto mt-8 h-1 max-w-xs overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <div
                className="h-full bg-[rgba(0,229,255,0.5)] transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.3)]">
              {pct}%
            </p>
          </div>
        )}

        {report && !loading && (
          <>
            <header className="border-b border-[rgba(232,197,71,0.12)] pb-6">
              <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
                Post-game report · {report.mode === "online" ? "Online" : "vs CHIMERA"}
              </p>
              <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-gold-glow">
                {report.resultLabel}
              </h2>
              <p className="mt-1 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
                vs {report.opponentLabel} · you played{" "}
                {report.userColor === "w" ? "White" : "Black"} · {report.totalPlies}{" "}
                plies
              </p>
              <div className="mt-6 flex flex-wrap gap-4">
                <StatRing label="Accuracy" value={`${report.accuracy}%`} accent="cyan" />
                <StatRing
                  label="Avg loss"
                  value={`${report.averageCpLoss}cp`}
                  accent="gold"
                />
                <StatRing label="Blunders" value={String(report.blunders)} accent="red" />
                <StatRing label="Mistakes" value={String(report.mistakes)} accent="gold" />
              </div>
            </header>

            <section className="mt-8">
              <SectionTitle>Evaluation timeline</SectionTitle>
              <div className="mt-3 flex h-24 items-end gap-px rounded-sm bg-[rgba(0,0,0,0.3)] p-2">
                {report.evalTimeline.map((pt, i) => {
                  const bar = evalToBarPercent(pt.cpWhite);
                  return (
                    <div
                      key={i}
                      className="min-w-[3px] flex-1 rounded-t-sm transition-colors"
                      style={{
                        height: `${bar}%`,
                        background:
                          bar > 55
                            ? "rgba(255,255,255,0.55)"
                            : bar < 45
                              ? "rgba(80,80,90,0.7)"
                              : "rgba(232,197,71,0.45)",
                      }}
                      title={`${pt.ply}: ${pt.label}`}
                    />
                  );
                })}
              </div>
              <p className="mt-2 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(255,255,255,0.25)]">
                White advantage ↑ · move 0 → end
              </p>
            </section>

            <section className="mt-8">
              <SectionTitle>Coach summary</SectionTitle>
              <ul className="mt-3 space-y-2">
                {report.narrative.map((line, i) => (
                  <li
                    key={i}
                    className="font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.55)]"
                  >
                    <span className="mr-2 text-[rgba(0,229,255,0.5)]">▸</span>
                    {line}
                  </li>
                ))}
              </ul>
            </section>

            {report.phases.length > 0 && (
              <section className="mt-8">
                <SectionTitle>Phase breakdown</SectionTitle>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {report.phases.map((ph) => (
                    <div
                      key={ph.phase}
                      className="rounded-sm border border-[rgba(255,255,255,0.06)] p-4"
                    >
                      <p className="font-[family-name:var(--font-display)] text-sm capitalize text-gold-glow">
                        {ph.phase}
                      </p>
                      <p className="mt-2 font-[family-name:var(--font-hud)] text-[10px] text-[rgba(0,229,255,0.7)]">
                        {ph.avgAccuracy}% accuracy
                      </p>
                      <p className="mt-1 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.35)]">
                        {ph.moves} of your moves · worst −{ph.worstLoss}cp
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {report.criticalMoments.length > 0 && (
              <section className="mt-8">
                <SectionTitle>Critical moments</SectionTitle>
                <div className="mt-3 space-y-3">
                  {report.criticalMoments.map((m) => (
                    <CriticalCard key={m.ply} move={m} />
                  ))}
                </div>
              </section>
            )}

            <section className="mt-8">
              <SectionTitle>Your moves — full breakdown</SectionTitle>
              <div className="mt-2 flex flex-wrap gap-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.35)]">
                <span>!! {report.brilliant}</span>
                <span>! {report.great}</span>
                <span>✓ {report.good}</span>
                <span>?! {report.inaccuracies}</span>
                <span>? {report.mistakes}</span>
                <span>?? {report.blunders}</span>
              </div>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                {report.userMoves.map((m) => (
                  <MoveRow key={m.ply} move={m} />
                ))}
              </div>
            </section>

            {report.openingLine && (
              <section className="mt-8">
                <SectionTitle>Opening</SectionTitle>
                <p className="mt-2 font-mono text-xs leading-relaxed text-[rgba(255,255,255,0.45)]">
                  {report.openingLine}
                </p>
              </section>
            )}

            <div className="mt-10 flex flex-wrap gap-3 border-t border-[rgba(232,197,71,0.1)] pt-6">
              {onNewGame && (
                <button
                  type="button"
                  onClick={onNewGame}
                  className="rounded-sm border border-[rgba(232,197,71,0.35)] px-5 py-2.5 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-gold-glow"
                >
                  Play again
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="nav-link rounded-sm px-5 py-2.5 text-[9px]"
              >
                Close review
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.3em] text-[rgba(232,197,71,0.65)] uppercase">
      {children}
    </h3>
  );
}

function StatRing({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "cyan" | "gold" | "red";
}) {
  const color =
    accent === "cyan"
      ? "text-[rgba(0,229,255,0.9)]"
      : accent === "red"
        ? "text-[rgba(255,120,120,0.9)]"
        : "text-gold-glow";
  return (
    <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-4 py-3">
      <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(255,255,255,0.35)] uppercase">
        {label}
      </p>
      <p className={`mt-1 font-[family-name:var(--font-display)] text-xl ${color}`}>
        {value}
      </p>
    </div>
  );
}

function CriticalCard({
  move,
}: {
  move: GameReviewReport["criticalMoments"][0];
}) {
  const g = GRADE_STYLES[move.grade];
  return (
    <div className="rounded-sm border border-[rgba(255,100,100,0.2)] bg-[rgba(255,80,80,0.04)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,120,120,0.7)]">
            Move {Math.ceil(move.ply / 2)} · ply {move.ply}
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-white">
            {move.san ?? move.uci}{" "}
            <span className="text-[rgba(255,255,255,0.35)]">→ best {move.bestUci}</span>
          </p>
        </div>
        <span
          className={`rounded-sm border px-2 py-0.5 font-[family-name:var(--font-hud)] text-[10px] ${g.className}`}
        >
          {g.label}
        </span>
      </div>
      <p className="mt-2 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.5)]">
        {move.insight}
      </p>
      <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(0,229,255,0.45)]">
        Eval {formatEvalLabel(move.evalBeforeWhite)} →{" "}
        {formatEvalLabel(move.evalAfterWhite)} (−{move.cpLoss}cp)
      </p>
    </div>
  );
}

function MoveRow({ move }: { move: GameReviewReport["userMoves"][0] }) {
  const g = GRADE_STYLES[move.grade];
  return (
    <div className="flex gap-3 rounded-sm border border-[rgba(255,255,255,0.04)] px-3 py-2.5">
      <span
        className={`flex h-7 w-8 shrink-0 items-center justify-center rounded-sm border font-[family-name:var(--font-hud)] text-[9px] ${g.className}`}
      >
        {g.label}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-body)] text-sm text-white">
          <span className="text-[rgba(255,255,255,0.35)]">{Math.ceil(move.ply / 2)}.</span>{" "}
          {move.san ?? move.uci}
          {move.cpLoss > 0 && (
            <span className="ml-2 text-[rgba(255,160,80,0.8)]">−{move.cpLoss}cp</span>
          )}
        </p>
        <p className="mt-0.5 truncate font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.35)]">
          {move.insight}
        </p>
      </div>
      <span className="shrink-0 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(0,229,255,0.4)]">
        {formatEvalLabel(move.evalAfterWhite)}
      </span>
    </div>
  );
}
