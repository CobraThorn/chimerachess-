import { motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useState, startTransition } from "react";
import type { Color } from "../../chess";
import type { LegendGame } from "../../content/legends";
import ChessBoardGrid from "../chess/ChessBoardGrid";
import PlyScrubber from "../ui/PlyScrubber";
import {
  buildLegendReplaySteps,
  stateAtLegendPly,
} from "./legendReplay";

interface LegendGameReplayerProps {
  game: LegendGame;
  highlightPly?: number;
}

function NavBtn({
  label,
  onClick,
  disabled,
  title,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className="flex h-9 w-9 items-center justify-center rounded-sm border border-[rgba(255,255,255,0.1)] bg-[rgba(0,0,0,0.35)] font-[family-name:var(--font-hud)] text-sm text-[rgba(255,255,255,0.7)] transition hover:border-[rgba(0,229,255,0.35)] hover:text-white disabled:opacity-30"
    >
      {label}
    </button>
  );
}

export default function LegendGameReplayer({
  game,
  highlightPly = game.highlightPly,
}: LegendGameReplayerProps) {
  const steps = useMemo(
    () => buildLegendReplaySteps(game.moves),
    [game.moves]
  );
  const maxPly = steps.length > 0 ? steps.length - 1 : 0;
  const [ply, setPly] = useState(0);
  const [previewPly, setPreviewPly] = useState<number | null>(null);
  const [playing, setPlaying] = useState(false);

  const activePly = previewPly ?? ply;

  const go = useCallback(
    (next: number) => {
      setPreviewPly(null);
      setPly(Math.max(0, Math.min(next, maxPly)));
    },
    [maxPly]
  );

  useEffect(() => {
    if (!playing) return;
    if (ply >= maxPly) {
      setPlaying(false);
      return;
    }
    const t = window.setTimeout(() => go(ply + 1), 650);
    return () => window.clearTimeout(t);
  }, [playing, ply, maxPly, go]);

  const { state, lastMove } = stateAtLegendPly(game.moves, activePly);
  const step = steps[activePly] ?? steps[0];
  const orientation: Color = game.legendColor;
  const isHighlight = highlightPly != null && activePly === highlightPly;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.55)] uppercase">
            Signature game
          </p>
          <h4 className="font-[family-name:var(--font-display)] text-xl text-gold-glow">
            {game.title}
          </h4>
          <p className="mt-1 text-xs text-[rgba(255,255,255,0.45)]">
            {game.event}, {game.year} · vs {game.opponent} · {game.result}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="rounded-sm border border-[rgba(232,197,71,0.25)] bg-[rgba(232,197,71,0.06)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-gold-glow uppercase transition hover:bg-[rgba(232,197,71,0.12)]"
        >
          {playing ? "Pause" : "Autoplay"}
        </button>
      </div>

      <motion.div
        className={`rounded-sm p-3 transition ${
          isHighlight
            ? "ring-1 ring-[rgba(232,197,71,0.45)] bg-[rgba(232,197,71,0.04)]"
            : "bg-[rgba(0,0,0,0.25)]"
        }`}
        layout
      >
        <ChessBoardGrid
          state={state}
          orientation={orientation}
          lastMove={lastMove}
          disabled
          squareSize="compact"
        />
      </motion.div>

      <p className="text-center font-[family-name:var(--font-hud)] text-[10px] tracking-[0.12em] text-[rgba(255,255,255,0.55)]">
        {step?.moveLabel ?? "Start"}
      </p>

      <div className="flex items-center justify-center gap-2">
        <NavBtn onClick={() => go(0)} label="⏮" title="Start" />
        <NavBtn onClick={() => go(ply - 1)} label="◀" disabled={ply <= 0} />
        <span className="min-w-[4rem] text-center font-[family-name:var(--font-hud)] text-[10px] tracking-[0.15em] text-[rgba(255,255,255,0.5)]">
          {activePly}/{maxPly}
        </span>
        <NavBtn onClick={() => go(ply + 1)} label="▶" disabled={ply >= maxPly} />
        <NavBtn onClick={() => go(maxPly)} label="⏭" title="End" />
      </div>

      <PlyScrubber
        min={0}
        max={maxPly}
        value={ply}
        fillClassName="bg-[rgba(232,197,71,0.55)]"
        thumbClassName="border-[rgba(232,197,71,0.35)] bg-[rgba(232,197,71,0.9)] shadow-[0_0_12px_rgba(232,197,71,0.25)]"
        onScrubStart={() => setPlaying(false)}
        onPreview={(v) => startTransition(() => setPreviewPly(v))}
        onChange={(v) => {
          setPreviewPly(null);
          setPly(v);
        }}
        aria-label="Scrub legendary game"
      />

      {highlightPly != null && highlightPly <= maxPly && (
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            go(highlightPly);
          }}
          className="w-full rounded-sm border border-[rgba(0,229,255,0.2)] py-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-[rgba(0,229,255,0.75)] uppercase transition hover:bg-[rgba(0,229,255,0.06)]"
        >
          Jump to key moment (ply {highlightPly})
        </button>
      )}
    </div>
  );
}
