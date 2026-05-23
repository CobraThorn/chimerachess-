import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEvalLabel, evalToBarPercent } from "../../engine/analysis";
import { stateAtPly } from "../../review/replay";
import type { GameReviewReport, MoveGrade, ReviewCoachNote } from "../../review/types";
import { uciToMove } from "../../chess";
import ChessBoardGrid from "../chess/ChessBoardGrid";
import EvalBar from "../analyze/EvalBar";

const GRADE_STYLES: Record<
  MoveGrade,
  { label: string; className: string }
> = {
  brilliant: { label: "!!", className: "text-[rgba(0,229,255,0.95)]" },
  great: { label: "!", className: "text-[rgba(52,211,153,0.9)]" },
  good: { label: "✓", className: "text-[rgba(255,255,255,0.7)]" },
  book: { label: "📖", className: "text-[rgba(232,197,71,0.8)]" },
  inaccuracy: { label: "?!", className: "text-[rgba(255,200,100,0.85)]" },
  mistake: { label: "?", className: "text-[rgba(255,160,80,0.9)]" },
  blunder: { label: "??", className: "text-[rgba(255,100,100,0.95)]" },
};

interface GameReviewRecapProps {
  report: GameReviewReport;
  notes: Map<number, ReviewCoachNote>;
  coachSummary: string | null;
  prefetchDone: number;
  prefetchTotal: number;
  loadingPly: number | null;
  gptEnabled: boolean;
  onEnsureNote: (ply: number) => void;
}

export default function GameReviewRecap({
  report,
  notes,
  coachSummary,
  prefetchDone,
  prefetchTotal,
  loadingPly,
  gptEnabled,
  onEnsureNote,
}: GameReviewRecapProps) {
  const maxPly = report.recapSteps.length - 1;
  const [ply, setPly] = useState(maxPly);

  useEffect(() => {
    setPly(maxPly);
  }, [report.id, maxPly]);

  useEffect(() => {
    onEnsureNote(ply);
  }, [ply, onEnsureNote]);

  const boardState = useMemo(
    () => stateAtPly(report.moves, ply),
    [report.moves, ply]
  );

  const step = report.recapSteps[ply];
  const note = notes.get(ply);
  const userMove = report.userMoves.find((u) => u.ply === ply);
  const evalPt = report.evalTimeline[ply];

  const engineHighlight = useMemo(() => {
    if (!userMove?.bestUci || userMove.uci === userMove.bestUci) return null;
    const before = stateAtPly(report.moves, Math.max(0, ply - 1)).state;
    const played = uciToMove(before, userMove.uci);
    const best = uciToMove(before, userMove.bestUci);
    if (!best) return null;
    return { from: played?.from ?? best.from, to: best.to };
  }, [userMove, report.moves, ply]);

  const go = useCallback(
    (next: number) => setPly(Math.max(0, Math.min(maxPly, next))),
    [maxPly]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") go(ply - 1);
      if (e.key === "ArrowRight") go(ply + 1);
      if (e.key === "Home") go(0);
      if (e.key === "End") go(maxPly);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ply, maxPly, go]);

  const coachLoading = loadingPly === ply && !note;

  return (
    <section className="border-b border-[rgba(232,197,71,0.12)] pb-8">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
            Move-by-move recap
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.4)]">
            {gptEnabled
              ? "GPT coach on every ply · engine best-move ghost"
              : "Local coach notes · add OpenAI key in Settings for full GPT"}
            {prefetchTotal > 0 && (
              <span className="ml-2 text-[rgba(0,229,255,0.45)]">
                ({prefetchDone}/{prefetchTotal} loaded)
              </span>
            )}
          </p>
        </div>
        <p className="font-[family-name:var(--font-display)] text-lg text-gold-glow">
          {step?.moveLabel ?? "—"}
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-6 lg:z-10">
          <div className="flex items-stretch justify-center gap-2">
            <EvalBar
              cpWhite={evalPt?.cpWhite ?? 0}
              label={evalPt?.label ?? formatEvalLabel(0)}
              boardSize="min(calc(100vw - 3.5rem), 20rem)"
            />
            <div className="w-[min(calc(100vw-3.5rem),20rem)] min-w-[220px] shrink-0">
              <ChessBoardGrid
                state={boardState.state}
                orientation={report.userColor}
                lastMove={boardState.lastMove}
                disabled
                engineHighlight={engineHighlight}
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-2">
            <NavBtn onClick={() => go(0)} label="⏮" title="Start" />
            <NavBtn onClick={() => go(ply - 1)} label="◀" title="Previous" disabled={ply <= 0} />
            <span className="min-w-[4rem] text-center font-[family-name:var(--font-hud)] text-[10px] tracking-[0.15em] text-[rgba(255,255,255,0.5)]">
              {ply}/{maxPly}
            </span>
            <NavBtn onClick={() => go(ply + 1)} label="▶" title="Next" disabled={ply >= maxPly} />
            <NavBtn onClick={() => go(maxPly)} label="⏭" title="End" />
          </div>

          <input
            type="range"
            min={0}
            max={maxPly}
            value={ply}
            onChange={(e) => go(Number(e.target.value))}
            className="mt-3 w-full accent-[rgba(0,229,255,0.6)]"
            aria-label="Scrub through game"
          />

          <div className="mt-3 flex h-14 items-end gap-px overflow-hidden rounded-sm bg-[rgba(0,0,0,0.25)] p-1">
            {report.evalTimeline.map((pt, i) => {
              const h = evalToBarPercent(pt.cpWhite);
              const active = i === ply;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  className={`min-w-[4px] flex-1 rounded-t-sm transition-all ${
                    active ? "ring-1 ring-[rgba(0,229,255,0.6)]" : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    height: `${Math.max(12, h)}%`,
                    background: active
                      ? "rgba(0,229,255,0.55)"
                      : "rgba(232,197,71,0.35)",
                  }}
                  title={`Ply ${i}: ${pt.label}`}
                />
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {coachSummary && (
            <div className="rounded-sm border border-[rgba(232,197,71,0.15)] bg-[rgba(232,197,71,0.04)] p-4">
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-gold-glow uppercase">
                Coach overview
              </p>
              <p className="mt-2 font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.6)]">
                {coachSummary}
              </p>
            </div>
          )}

          <div className="glass-panel rounded-sm p-5">
            {coachLoading ? (
              <p className="animate-pulse font-[family-name:var(--font-body)] text-sm text-[rgba(0,229,255,0.5)]">
                Coach is writing notes for this position…
              </p>
            ) : note ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h4 className="font-[family-name:var(--font-display)] text-xl text-white">
                    {note.title}
                  </h4>
                  <span
                    className={`font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] uppercase ${
                      note.source === "gpt"
                        ? "text-[rgba(0,229,255,0.7)]"
                        : "text-[rgba(255,255,255,0.35)]"
                    }`}
                  >
                    {note.source === "gpt" ? "GPT coach" : "Local coach"}
                  </span>
                </div>
                {userMove && (
                  <span
                    className={`mt-2 inline-block font-[family-name:var(--font-hud)] text-sm ${GRADE_STYLES[userMove.grade].className}`}
                  >
                    {GRADE_STYLES[userMove.grade].label} · −{userMove.cpLoss}cp · best{" "}
                    {userMove.bestUci}
                  </span>
                )}
                <p className="mt-4 font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.62)]">
                  {note.explanation}
                </p>
                <p className="mt-4 border-t border-[rgba(255,255,255,0.06)] pt-4 font-[family-name:var(--font-body)] text-xs italic leading-relaxed text-[rgba(232,197,71,0.75)]">
                  💡 {note.teachingPoint}
                </p>
                {evalPt && (
                  <p className="mt-3 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(0,229,255,0.45)]">
                    Eval (White): {evalPt.label}
                  </p>
                )}
              </>
            ) : null}
          </div>

          <div className="max-h-48 space-y-1 overflow-y-auto rounded-sm border border-[rgba(255,255,255,0.05)] p-2">
            {report.recapSteps.map((s) => (
              <button
                key={s.ply}
                type="button"
                onClick={() => go(s.ply)}
                className={`flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[11px] transition-colors ${
                  s.ply === ply
                    ? "bg-[rgba(0,229,255,0.12)] text-white"
                    : "text-[rgba(255,255,255,0.45)] hover:bg-[rgba(255,255,255,0.04)]"
                }`}
              >
                <span className="w-8 shrink-0 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.3)]">
                  {s.ply}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono">{s.moveLabel}</span>
                {notes.get(s.ply)?.source === "gpt" && (
                  <span className="text-[8px] text-[rgba(0,229,255,0.5)]">AI</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function NavBtn({
  onClick,
  label,
  title,
  disabled,
}: {
  onClick: () => void;
  label: string;
  title: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-sm border border-[rgba(255,255,255,0.1)] px-3 py-2 font-[family-name:var(--font-hud)] text-[10px] text-[rgba(255,255,255,0.6)] transition-colors hover:border-[rgba(0,229,255,0.35)] disabled:opacity-30"
    >
      {label}
    </button>
  );
}
