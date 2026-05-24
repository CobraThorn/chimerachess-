import { useCallback, useEffect, useMemo, useState } from "react";
import { formatEvalLabel, evalToBarPercent } from "../../engine/analysis";
import { isPositiveGrade, MOVE_GRADE_META } from "../../review/moveGrades";
import { stateAtPly } from "../../review/replay";
import type { GameReviewReport, MoveGrade, ReviewCoachNote } from "../../review/types";
import { uciToMove } from "../../chess";
import BoardAnnotations, { type BoardArrow } from "../chess/BoardAnnotations";
import ChessBoardGrid from "../chess/ChessBoardGrid";
import EvalBar from "../analyze/EvalBar";

const REVIEW_DEPTH = 14;

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
  const maxPly = Math.max(0, report.recapSteps.length - 1);
  const [ply, setPly] = useState(maxPly);
  const [filter, setFilter] = useState<MoveGrade | "all">("all");

  useEffect(() => {
    setPly(maxPly);
  }, [report.id, maxPly]);

  useEffect(() => {
    onEnsureNote(ply);
  }, [ply, onEnsureNote]);

  const userMove = report.userMoves.find((u) => u.ply === ply);
  const boardState = useMemo(() => stateAtPly(report.moves, ply), [report.moves, ply]);
  const step = report.recapSteps[ply];
  const evalPt = report.evalTimeline[ply] ?? report.evalTimeline[report.evalTimeline.length - 1];
  const note = notes.get(ply);

  const arrows = useMemo((): BoardArrow[] => {
    if (!userMove) return [];
    const before = stateAtPly(report.moves, Math.max(0, userMove.ply - 1)).state;
    const list: BoardArrow[] = [];
    const best = uciToMove(before, userMove.bestUci);
    const played = uciToMove(before, userMove.uci);
    if (best) list.push({ from: best.from, to: best.to, color: "green" });
    if (played && userMove.uci !== userMove.bestUci) {
      list.push({ from: played.from, to: played.to, color: "red" });
    }
    return list;
  }, [userMove, report.moves]);

  const filteredMoves = useMemo(() => {
    if (filter === "all") return report.userMoves;
    return report.userMoves.filter((m) => m.grade === filter);
  }, [report.userMoves, filter]);

  const go = useCallback(
    (next: number) => setPly(Math.max(0, Math.min(maxPly, next))),
    [maxPly]
  );

  const jumpToUserMove = (um: (typeof report.userMoves)[0]) => {
    setPly(um.ply);
  };

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

  const gradeMeta = userMove ? MOVE_GRADE_META[userMove.grade] : null;

  return (
    <section className="border-b border-[rgba(232,197,71,0.12)] pb-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
            Game review · depth {REVIEW_DEPTH}
          </p>
          <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.4)]">
            Green arrow = best move · Red = your move · {gptEnabled ? "AI coach" : "Local coach"}
            {prefetchTotal > 0 && ` · notes ${prefetchDone}/${prefetchTotal}`}
          </p>
        </div>
        <p className="font-[family-name:var(--font-display)] text-lg text-gold-glow">
          {step?.moveLabel ?? "Start"}
        </p>
      </div>

      {/* Classification summary — Chess.com style */}
      <div className="mb-6 flex flex-wrap gap-2">
        {(
          [
            ["all", "All", report.userMoves.length],
            ["best", "Best", report.best],
            ["excellent", "Excellent", report.excellent],
            ["good", "Good", report.good],
            ["inaccuracy", "Inaccuracy", report.inaccuracies],
            ["mistake", "Mistake", report.mistakes],
            ["miss", "Miss", report.misses],
            ["blunder", "Blunder", report.blunders],
            ["brilliant", "Brilliant", report.brilliant],
          ] as const
        ).map(([key, label, count]) => {
          if (key !== "all" && count === 0) return null;
          const meta = key !== "all" ? MOVE_GRADE_META[key] : null;
          const active = filter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-sm border px-2.5 py-1.5 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.12em] transition-colors ${
                active
                  ? "border-[rgba(0,229,255,0.45)] bg-[rgba(0,229,255,0.1)] text-white"
                  : "border-[rgba(255,255,255,0.08)] text-[rgba(255,255,255,0.45)] hover:border-[rgba(255,255,255,0.15)]"
              }`}
            >
              {meta && (
                <span className={`mr-1 ${meta.textClass}`}>{meta.short}</span>
              )}
              {label} {key !== "all" && <span className="opacity-60">({count})</span>}
            </button>
          );
        })}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] lg:items-start">
        <div className="lg:sticky lg:top-6">
          <div className="flex items-stretch justify-center gap-2">
            <EvalBar
              cpWhite={evalPt?.cpWhite ?? 0}
              label={evalPt?.label ?? formatEvalLabel(0)}
              boardSize="min(calc(100vw - 3.5rem), 22rem)"
            />
            <div className="relative w-[min(calc(100vw-3.5rem),22rem)] min-w-[220px] shrink-0">
              <ChessBoardGrid
                state={boardState.state}
                orientation={report.userColor}
                lastMove={boardState.lastMove}
                disabled
                showCorners={false}
              />
              <BoardAnnotations
                orientation={report.userColor}
                arrows={arrows}
                showArrows={arrows.length > 0}
              />
            </div>
          </div>

          {userMove && gradeMeta && (
            <div
              className={`mt-4 rounded-sm border px-4 py-3 text-center ${gradeMeta.borderClass} ${gradeMeta.bgClass}`}
            >
              <p className={`font-[family-name:var(--font-display)] text-xl ${gradeMeta.textClass}`}>
                {gradeMeta.name}
              </p>
              <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.55)]">
                {userMove.san ?? userMove.uci}
                {userMove.uci !== userMove.bestUci && (
                  <>
                    {" "}
                    · best <span className="font-mono text-[rgba(134,239,172,0.9)]">{userMove.bestUci}</span>
                  </>
                )}
              </p>
              <p className="mt-1 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.35)]">
                {userMove.accuracyPct}% accuracy · {(userMove.cpLoss / 100).toFixed(2)} pawn loss
              </p>
            </div>
          )}

          <div className="mt-4 flex items-center justify-center gap-2">
            <NavBtn onClick={() => go(0)} label="⏮" title="Start" />
            <NavBtn onClick={() => go(ply - 1)} label="◀" disabled={ply <= 0} />
            <span className="min-w-[4rem] text-center font-[family-name:var(--font-hud)] text-[10px] tracking-[0.15em] text-[rgba(255,255,255,0.5)]">
              {ply}/{maxPly}
            </span>
            <NavBtn onClick={() => go(ply + 1)} label="▶" disabled={ply >= maxPly} />
            <NavBtn onClick={() => go(maxPly)} label="⏭" />
          </div>

          <input
            type="range"
            min={0}
            max={maxPly}
            value={ply}
            onChange={(e) => go(Number(e.target.value))}
            className="mt-3 w-full accent-[rgba(0,229,255,0.6)]"
            aria-label="Scrub game"
          />

          <div className="mt-3 flex h-16 items-end gap-px overflow-hidden rounded-sm bg-[rgba(0,0,0,0.3)] p-1">
            {report.evalTimeline.map((pt, i) => {
              const h = evalToBarPercent(pt.cpWhite);
              const um = report.userMoves.find((u) => u.ply === i);
              const bad =
                um &&
                !isPositiveGrade(um.grade) &&
                um.grade !== "book";
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  className={`min-w-[3px] flex-1 rounded-t-sm ${
                    i === ply ? "ring-1 ring-[rgba(0,229,255,0.7)]" : "opacity-75 hover:opacity-100"
                  }`}
                  style={{
                    height: `${Math.max(10, h)}%`,
                    background: bad
                      ? "rgba(248,113,113,0.55)"
                      : i === ply
                        ? "rgba(0,229,255,0.5)"
                        : "rgba(134,239,172,0.35)",
                  }}
                  title={`${pt.label}${um ? ` · ${MOVE_GRADE_META[um.grade].name}` : ""}`}
                />
              );
            })}
          </div>
        </div>

        <div className="min-w-0 space-y-4">
          {coachSummary && (
            <div className="rounded-sm border border-[rgba(232,197,71,0.15)] bg-[rgba(232,197,71,0.04)] p-4">
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-gold-glow uppercase">
                Overview
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[rgba(255,255,255,0.58)]">{coachSummary}</p>
            </div>
          )}

          {userMove && (
            <div className="rounded-sm border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
              <p className="font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.62)]">
                {userMove.insight}
              </p>
            </div>
          )}

          <div className="glass-panel rounded-sm p-5">
            {loadingPly === ply && !note ? (
              <p className="animate-pulse text-sm text-[rgba(0,229,255,0.5)]">Loading coach note…</p>
            ) : note ? (
              <>
                <h4 className="font-[family-name:var(--font-display)] text-xl text-white">{note.title}</h4>
                <p className="mt-3 text-sm leading-relaxed text-[rgba(255,255,255,0.6)]">{note.explanation}</p>
                <p className="mt-3 border-t border-[rgba(255,255,255,0.06)] pt-3 text-xs italic text-[rgba(232,197,71,0.75)]">
                  {note.teachingPoint}
                </p>
              </>
            ) : (
              <p className="text-sm text-[rgba(255,255,255,0.4)]">
                Scrub the timeline or pick a move below.
              </p>
            )}
          </div>

          <div>
            <p className="mb-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(255,255,255,0.35)] uppercase">
              Your moves
            </p>
            <div className="max-h-72 space-y-1 overflow-y-auto rounded-sm border border-[rgba(255,255,255,0.06)] p-2">
              {filteredMoves.map((m) => {
                const meta = MOVE_GRADE_META[m.grade];
                const active = m.ply === ply;
                return (
                  <button
                    key={m.ply}
                    type="button"
                    onClick={() => jumpToUserMove(m)}
                    className={`flex w-full items-center gap-3 rounded-sm px-2 py-2 text-left transition-colors ${
                      active
                        ? "bg-[rgba(0,229,255,0.12)]"
                        : "hover:bg-[rgba(255,255,255,0.04)]"
                    }`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border text-[10px] font-bold ${meta.borderClass} ${meta.bgClass} ${meta.textClass}`}
                    >
                      {meta.short}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white">
                        <span className="text-[rgba(255,255,255,0.35)]">{Math.ceil(m.ply / 2)}.</span>{" "}
                        {m.san ?? m.uci}
                      </p>
                      <p className={`text-[10px] ${meta.textClass}`}>
                        {meta.name} · {m.accuracyPct}%
                        {m.uci !== m.bestUci && (
                          <span className="text-[rgba(255,255,255,0.35)]"> · best {m.bestUci}</span>
                        )}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="max-h-40 space-y-0.5 overflow-y-auto rounded-sm border border-[rgba(255,255,255,0.04)] p-2">
            <p className="mb-1 font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(255,255,255,0.25)] uppercase">
              Full game
            </p>
            {report.recapSteps.map((s) => (
              <button
                key={s.ply}
                type="button"
                onClick={() => go(s.ply)}
                className={`flex w-full gap-2 rounded-sm px-2 py-1 text-left text-[11px] ${
                  s.ply === ply ? "bg-[rgba(0,229,255,0.1)] text-white" : "text-[rgba(255,255,255,0.4)]"
                }`}
              >
                <span className="w-6 shrink-0 opacity-40">{s.ply}</span>
                <span className="truncate font-mono">{s.moveLabel}</span>
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
  title?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className="rounded-sm border border-[rgba(255,255,255,0.1)] px-3 py-2 text-[10px] text-[rgba(255,255,255,0.6)] hover:border-[rgba(0,229,255,0.35)] disabled:opacity-30"
    >
      {label}
    </button>
  );
}
