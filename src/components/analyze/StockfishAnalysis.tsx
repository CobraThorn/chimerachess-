import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createInitialState,
  formatMove,
  getGameStatus,
  getLegalMoves,
  makeMove,
  PROMOTION_PIECES,
  toFen,
  uciToMove,
} from "../../chess";
import type { Color, GameState, Move, PieceType, Square } from "../../chess";
import { useCustomisation } from "../../customisation";
import {
  formatEvalLabel,
  runFullAnalysis,
  type LiveAnalysis,
} from "../../engine/analysis";
import { STOCKFISH_VERSION } from "../../engine/stockfish";
import { useAnalysisEngines } from "../../hooks/useAnalysisEngines";
import EvalBar from "./EvalBar";
import ChessBoardGrid from "../chess/ChessBoardGrid";
import ChessPiece from "../chess/ChessPiece";

const DEPTH_PRESETS = [
  { id: "fast", label: "Fast", depth: 12 },
  { id: "standard", label: "Standard", depth: 16 },
  { id: "deep", label: "Deep", depth: 18 },
  { id: "max", label: "Max", depth: 20 },
] as const;

function uciToSanPreview(state: GameState, uci: string): string {
  const move = uciToMove(state, uci);
  if (!move) return uci;
  return formatMove(state, move);
}

export default function StockfishAnalysis() {
  const { pieceSet } = useCustomisation();
  const [state, setState] = useState<GameState>(createInitialState);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [promotionPick, setPromotionPick] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [orientation, setOrientation] = useState<Color>("w");
  const [analysisOn, setAnalysisOn] = useState(true);
  const [depthPreset, setDepthPreset] = useState(0);
  const [thinking, setThinking] = useState(false);
  const [live, setLive] = useState<LiveAnalysis | null>(null);
  const [topMoves, setTopMoves] = useState<{ move: string; cp: number }[]>([]);

  const { stockfish, sfReady, engineError } = useAnalysisEngines();

  const engineRef = useRef(stockfish);
  engineRef.current = stockfish;
  const cancelRef = useRef<(() => void) | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const analysisMode = useMemo(
    () => ({ kind: "depth" as const, depth: DEPTH_PRESETS[depthPreset].depth }),
    [depthPreset]
  );
  const analysisGen = useRef(0);
  const status = useMemo(() => getGameStatus(state), [state]);
  const fen = useMemo(() => toFen(state), [state]);
  const gameOver =
    status.type === "checkmate" ||
    status.type === "stalemate" ||
    status.type === "draw";

  const runEngine = useCallback(async () => {
    const engine = stockfish;
    if (!engine?.ready || !analysisOn || gameOver) {
      setThinking(false);
      if (gameOver) {
        setTopMoves([]);
      }
      return;
    }

    cancelRef.current?.();
    const gen = ++analysisGen.current;
    setThinking(true);
    const targetFen = toFen(stateRef.current);

    const { cancel, done } = runFullAnalysis(
      engine,
      targetFen,
      analysisMode,
      (update) => {
        if (analysisGen.current !== gen) return;
        if (toFen(stateRef.current) === targetFen) {
          setLive(update);
        }
      }
    );
    cancelRef.current = cancel;

    try {
      const result = await done;
      if (analysisGen.current !== gen) return;
      if (toFen(stateRef.current) === targetFen) {
        if (result.primary) setLive(result.primary);
        setTopMoves(
          result.lines.map((l) => ({
            move: l.move,
            cp: l.cp,
          }))
        );
      }
    } finally {
      if (analysisGen.current === gen) {
        setThinking(false);
      }
    }
  }, [analysisOn, analysisMode, gameOver, stockfish]);

  useEffect(() => {
    if (!sfReady) return;
    const debounce = window.setTimeout(() => {
      void runEngine();
    }, 220);
    return () => {
      clearTimeout(debounce);
      cancelRef.current?.();
    };
  }, [fen, sfReady, runEngine]);

  const engineHighlight = useMemo(() => {
    if (!live?.bestMove || live.bestMove.length < 4) return null;
    const move = uciToMove(state, live.bestMove);
    if (!move) return null;
    return { from: move.from, to: move.to };
  }, [live, state]);

  const applyMove = (move: Move) => {
    const next = makeMove(state, move);
    if (!next) return;
    setState(next);
    setLastMove(move);
    setSelected(null);
    setLegalTargets([]);
    setPromotionPick(null);
  };

  const playTopMove = (uci: string) => {
    const move = uciToMove(state, uci);
    if (move) applyMove(move);
  };

  const onSquareClick = (sq: Square) => {
    if (gameOver || promotionPick) return;
    const piece = state.board[sq];
    const targetMove = legalTargets.find((m) => m.to === sq);

    if (targetMove) {
      const promos = legalTargets.filter((m) => m.to === sq && m.promotion);
      if (promos.length > 1) {
        setPromotionPick({ from: selected!, to: sq });
        return;
      }
      applyMove(promos[0] ?? targetMove);
      return;
    }

    if (piece && piece.color === state.turn) {
      setSelected(sq);
      setLegalTargets(getLegalMoves(state, sq));
      return;
    }

    setSelected(null);
    setLegalTargets([]);
  };

  const onPromotion = (type: PieceType) => {
    if (!promotionPick) return;
    const move = legalTargets.find(
      (m) => m.to === promotionPick.to && m.promotion === type
    );
    if (move) applyMove(move);
  };

  const resetBoard = () => {
    cancelRef.current?.();
    const init = createInitialState();
    setState(init);
    setLastMove(null);
    setSelected(null);
    setLegalTargets([]);
    setLive(null);
    setTopMoves([]);
  };

  const evalLabel = live
    ? formatEvalLabel(live.cpWhite, live.isMate, live.mateIn)
    : thinking
      ? "…"
      : "0.0";

  return (
    <div id="analyze-live" className="scroll-mt-28">
      <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.55)] uppercase">
        Live analysis · Stockfish {STOCKFISH_VERSION}
      </p>
      <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.4)]">
        Board + eval bar first — engine lines update as you move.
      </p>

      <div
        id="analyze-review"
        className="mx-auto mt-6 grid w-full min-w-0 max-w-5xl grid-cols-1 gap-6 lg:grid-cols-[minmax(280px,1fr)_minmax(240px,320px)] lg:items-start lg:gap-8"
      >
        <div className="order-1 flex min-w-0 w-full flex-col items-center gap-3 lg:sticky lg:top-24 lg:z-10 lg:self-start">
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(255,255,255,0.35)] uppercase">
            Analysis board
          </p>
          <div className="flex w-full min-w-0 max-w-full items-stretch justify-center gap-2">
            {analysisOn && (
              <EvalBar
                cpWhite={live?.cpWhite ?? 0}
                isMate={live?.isMate}
                mateIn={live?.mateIn}
                label={evalLabel}
                thinking={thinking}
                boardSize="min(calc(100vw - 3.5rem), 32rem)"
              />
            )}
            <div className="relative w-[min(calc(100vw-3.5rem),32rem)] min-w-[260px] shrink-0">
              <ChessBoardGrid
                state={state}
                orientation={orientation}
                selected={selected}
                legalTargets={legalTargets}
                lastMove={lastMove}
                onSquareClick={onSquareClick}
                engineHighlight={engineHighlight}
                arrows={
                  engineHighlight
                    ? [
                        {
                          from: engineHighlight.from,
                          to: engineHighlight.to,
                          color: "green",
                        },
                      ]
                    : undefined
                }
              />
              <AnimatePresence>
                {promotionPick && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex items-center justify-center rounded-sm bg-[rgba(5,5,8,0.8)]"
                  >
                    <div className="glass-panel rounded-sm px-6 py-4">
                      <p className="mb-3 text-center font-[family-name:var(--font-hud)] text-[9px] tracking-[0.3em] text-[rgba(232,197,71,0.7)]">
                        PROMOTE
                      </p>
                      <div className="flex gap-3">
                        {PROMOTION_PIECES.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => onPromotion(t)}
                            className="flex h-12 w-12 items-center justify-center"
                          >
                            <ChessPiece
                              color={state.turn}
                              type={t}
                              pieceSet={pieceSet}
                            />
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <aside className="order-2 glass-panel w-full min-w-0 rounded-sm p-5 lg:sticky lg:top-24">
          <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.35em] text-gold-glow uppercase">
            Engine readout
          </h4>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2">
              <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(255,255,255,0.35)]">
                Eval
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-gold-glow">
                {evalLabel}
              </p>
            </div>
            <div className="rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2">
              <p className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(255,255,255,0.35)]">
                Depth
              </p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[rgba(0,229,255,0.75)]">
                {live?.depth ?? "—"}
              </p>
            </div>
          </div>

          {live?.pvUci.length ? (
            <div className="mt-4">
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(255,255,255,0.35)] uppercase">
                Best line
              </p>
              <p className="mt-2 font-[family-name:var(--font-body)] text-xs leading-relaxed text-[rgba(255,255,255,0.5)]">
                {live.pvUci
                  .slice(0, 6)
                  .map((uci, i) => {
                    const s = state;
                    const san = uciToSanPreview(s, uci);
                    return i === 0 ? (
                      <span key={uci} className="text-gold-glow">
                        {san}
                      </span>
                    ) : (
                      <span key={uci}> {san}</span>
                    );
                  })}
              </p>
            </div>
          ) : null}

          <div className="mt-6">
            <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(255,255,255,0.35)] uppercase">
              Top moves
            </p>
            {topMoves.length === 0 ? (
              <p className="mt-2 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.3)]">
                {thinking ? "Calculating…" : "Make a move to analyze."}
              </p>
            ) : (
              <ul className="mt-2 space-y-2">
                {topMoves.map((line, i) => {
                  const san = uciToSanPreview(state, line.move);
                  return (
                    <li key={line.move}>
                      <button
                        type="button"
                        onClick={() => playTopMove(line.move)}
                        disabled={gameOver}
                        className="flex w-full items-center justify-between rounded-sm border border-[rgba(255,255,255,0.06)] px-3 py-2 text-left transition-colors hover:border-[rgba(0,229,255,0.35)] hover:bg-[rgba(0,229,255,0.06)] disabled:opacity-40"
                      >
                        <span className="font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.75)]">
                          {i + 1}. {san}
                        </span>
                        <span className="font-[family-name:var(--font-hud)] text-[9px] text-[rgba(232,197,71,0.65)]">
                          {formatEvalLabel(
                            state.turn === "w" ? line.cp : -line.cp
                          )}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <p className="mt-6 font-[family-name:var(--font-body)] text-[10px] leading-relaxed text-[rgba(255,255,255,0.32)]">
            Evaluation is from White&apos;s perspective. Click a top move to play it
            on the board. Runs entirely in your browser.
          </p>
        </aside>
      </div>

      <div className="mx-auto mt-6 flex w-full max-w-5xl flex-wrap items-center gap-2">
        {engineError ? (
          <span className="max-w-xs font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,120,120,0.85)]">
            {engineError}
          </span>
        ) : !sfReady ? (
          <span className="font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.3)]">
            Loading engine…
          </span>
        ) : null}
        <button
          type="button"
          onClick={() => setAnalysisOn((v) => !v)}
          className={`rounded-sm px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] ${
            analysisOn
              ? "border border-[rgba(0,229,255,0.4)] text-[rgba(0,229,255,0.8)]"
              : "text-[rgba(255,255,255,0.35)]"
          }`}
        >
          {analysisOn ? "Analysis on" : "Analysis off"}
        </button>
        {DEPTH_PRESETS.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setDepthPreset(i)}
            className={`rounded-sm px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.12em] ${
              depthPreset === i
                ? "border border-[rgba(232,197,71,0.45)] text-gold-glow"
                : "text-[rgba(255,255,255,0.35)]"
            }`}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOrientation((o) => (o === "w" ? "b" : "w"))}
          className="nav-link rounded-sm px-3 py-1.5 text-[8px]"
        >
          Flip
        </button>
        <button
          type="button"
          onClick={resetBoard}
          className="nav-link rounded-sm px-3 py-1.5 text-[8px]"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
