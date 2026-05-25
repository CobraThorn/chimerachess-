import { motion } from "framer-motion";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { loadMemory } from "../../ai/memory";
import type { ChimeraMemory, StoredGame } from "../../ai/types";
import { CHIMERA_MEMORY_EVENT } from "../../ai/types";
import { usePostGameIntelligence } from "../../hooks/usePostGameIntelligence";
import { useReviewCoach } from "../../hooks/useReviewCoach";
import type { MistakeIntelligence } from "../../mistakeIntel/types";
import PostGameIntelligencePanel from "../intelligence/PostGameIntelligencePanel";
import { formatEvalLabel } from "../../engine/analysis";
import { cpToPawns, missSizeWord } from "../../review/metricsDisplay";
import { MOVE_GRADE_META } from "../../review/moveGrades";
import { REVIEW_MOVE_DEPTH } from "../../review/reviewEngine";
import type { GameReviewReport, ReviewProgress } from "../../review/types";
import GameReviewRecap from "./GameReviewRecap";

interface GameReviewPanelProps {
  report: GameReviewReport | null;
  loading: boolean;
  progress: ReviewProgress | null;
  error?: string | null;
  /** True while review is queued or running (show shell before loading flips on). */
  open?: boolean;
  onClose: () => void;
  onNewGame?: () => void;
  /** Stored game + memory enable the performance-lab intelligence layer */
  storedGame?: StoredGame | null;
  memory?: ChimeraMemory | null;
}

export default function GameReviewPanel({
  report,
  loading,
  progress,
  error = null,
  open = false,
  onClose,
  onNewGame,
  storedGame = null,
  memory = null,
}: GameReviewPanelProps) {
  const [localMemory, setLocalMemory] = useState<ChimeraMemory>(() => loadMemory());
  useEffect(() => {
    const sync = () => setLocalMemory(loadMemory());
    window.addEventListener(CHIMERA_MEMORY_EVENT, sync);
    return () => window.removeEventListener(CHIMERA_MEMORY_EVENT, sync);
  }, []);
  const activeMemory = memory ?? localMemory;
  const resolvedGame = useMemo((): StoredGame | null => {
    if (storedGame) return storedGame;
    if (!report) return null;
    return activeMemory.games.find((g) => g.id === report.id) ?? null;
  }, [storedGame, report, activeMemory.games]);
  const { report: intelligenceReport, running: intelligenceRunning } =
    usePostGameIntelligence(
      resolvedGame,
      activeMemory,
      report,
      report?.mode ?? "chimera"
    );

  const mistakesByPly = useMemo(() => {
    const map = new Map<number, MistakeIntelligence>();
    intelligenceReport?.mistakeIntelligence?.mistakes.forEach((m) => {
      map.set(m.ply, m);
    });
    return map;
  }, [intelligenceReport?.mistakeIntelligence]);

  const coach = useReviewCoach(report, mistakesByPly);

  const visible = open || loading || !!report || !!error;
  if (!visible) return null;

  const pct = progress
    ? Math.round((progress.step / Math.max(1, progress.total)) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-[rgba(3,3,8,0.92)] p-4 pt-8 pb-16 backdrop-blur-md"
    >
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
        className="glass-panel relative w-full max-w-6xl rounded-sm p-6 md:p-10"
      >
        <span className="hud-corner hud-corner--tl" />
        <span className="hud-corner hud-corner--br" />

        {error && !loading && !report && (
          <div className="py-12 text-center">
            <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.4em] text-[rgba(255,120,120,0.8)] uppercase">
              Review failed
            </p>
            <p className="mt-4 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.55)]">
              {error}
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-8 nav-link rounded-sm px-5 py-2.5 text-[9px]"
            >
              Close
            </button>
          </div>
        )}

        {(loading || (open && !report && !error)) && (
          <div className="relative py-16 text-center">
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-0 nav-link rounded-sm px-4 py-2 text-[9px]"
            >
              Cancel
            </button>
            <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.4em] text-[rgba(0,229,255,0.6)] uppercase">
              Game review
            </p>
            <p className="mt-4 font-[family-name:var(--font-display)] text-2xl text-gold-glow">
              {loading ? "Analysing every move…" : "Starting analysis…"}
            </p>
            <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
              {progress?.label ??
                (loading
                  ? `Stockfish + dual engine · depth ${REVIEW_MOVE_DEPTH}`
                  : "Preparing engines…")}
            </p>
            <div className="mx-auto mt-8 h-1 max-w-xs overflow-hidden rounded-full bg-[rgba(255,255,255,0.08)]">
              <motion.div
                className="h-full bg-[rgba(0,229,255,0.5)]"
                initial={false}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.3)]">
              {pct}%
            </p>
          </div>
        )}

        {report && !loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <header className="border-b border-[rgba(232,197,71,0.12)] pb-6">
              <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
                Post-game report · {report.mode === "online" ? "Online" : "vs CHIMERA"}
                {report.torchUsed ? " · Stockfish + Torch 4" : " · Stockfish"}
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
                <StatRing label="Play quality" value={report.playQuality} accent="gold" />
                <StatRing label="Avg. mistake" value={report.avgMissLabel} accent="gold" />
                <StatRing label="Blunders" value={String(report.blunders)} accent="red" />
                <StatRing label="Mistakes" value={String(report.mistakes)} accent="gold" />
              </div>
            </header>

            <div className="mt-8">
              <GameReviewRecap
                report={report}
                notes={coach.notes}
                coachSummary={coach.coachSummary}
                prefetchDone={coach.prefetchDone}
                prefetchTotal={coach.prefetchTotal}
                loadingPly={coach.loadingPly}
                gptEnabled={coach.gptEnabled}
                onEnsureNote={coach.ensureNote}
              />
            </div>

            <PostGameIntelligencePanel
              report={intelligenceReport}
              reviewReport={report}
              loading={intelligenceRunning}
            />

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
                        {ph.moves} of your moves · biggest miss ~{cpToPawns(ph.worstLoss)} pawns
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
                {report.brilliant > 0 && <span>!! {report.brilliant}</span>}
                {report.best > 0 && <span>★ {report.best}</span>}
                {report.excellent > 0 && <span>! {report.excellent}</span>}
                {report.good > 0 && <span>✓ {report.good}</span>}
                {report.book > 0 && <span>📖 {report.book}</span>}
                {report.inaccuracies > 0 && <span>?! {report.inaccuracies}</span>}
                {report.mistakes > 0 && <span>? {report.mistakes}</span>}
                {report.misses > 0 && <span>✗ {report.misses}</span>}
                {report.blunders > 0 && <span>?? {report.blunders}</span>}
              </div>
              <div className="mt-4 max-h-80 space-y-2 overflow-y-auto pr-1">
                {report.userMoves.map((m) => (
                  <MoveRow key={m.ply} move={m} />
                ))}
              </div>
            </section>

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
          </motion.div>
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
  const g = MOVE_GRADE_META[move.grade];
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
          className={`rounded-sm border px-2 py-0.5 font-[family-name:var(--font-hud)] text-[10px] ${g.textClass} ${g.borderClass}`}
        >
          {g.short}
        </span>
      </div>
      <p className="mt-2 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.5)]">
        {move.insight}
      </p>
      <p className="mt-2 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(0,229,255,0.45)]">
        Eval {formatEvalLabel(move.evalBeforeWhite)} → {formatEvalLabel(move.evalAfterWhite)}
      </p>
    </div>
  );
}

function MoveRow({ move }: { move: GameReviewReport["userMoves"][0] }) {
  const g = MOVE_GRADE_META[move.grade];
  return (
    <div className="flex gap-3 rounded-sm border border-[rgba(255,255,255,0.04)] px-3 py-2.5">
      <span
        className={`flex h-7 w-8 shrink-0 items-center justify-center rounded-sm border font-[family-name:var(--font-hud)] text-[9px] ${g.textClass} ${g.borderClass} ${g.bgClass}`}
      >
        {g.short}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-[family-name:var(--font-body)] text-sm text-white">
          <span className="text-[rgba(255,255,255,0.35)]">{Math.ceil(move.ply / 2)}.</span>{" "}
          {move.san ?? move.uci}
          <span className="ml-2 text-[rgba(255,160,80,0.8)]">
            {move.accuracyPct}% · {missSizeWord(move.cpLoss)}
          </span>
        </p>
        <p className="mt-0.5 truncate font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.35)]">
          {move.insight}
        </p>
        {move.position.openFiles.length > 0 && (
          <p className="mt-0.5 font-[family-name:var(--font-hud)] text-[7px] text-[rgba(210,190,255,0.55)]">
            Files {move.position.openFiles.join(",")}
          </p>
        )}
      </div>
      <span className="shrink-0 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(0,229,255,0.4)]">
        {formatEvalLabel(move.evalAfterWhite)}
      </span>
    </div>
  );
}
