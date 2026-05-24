import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCustomisation } from "../../customisation";
import {
  createInitialState,
  formatMove,
  getAllLegalMoves,
  getGameStatus,
  getLegalMoves,
  makeMove,
  PROMOTION_PIECES,
  toFen,
} from "../../chess";
import ChessBoardGrid from "./ChessBoardGrid";
import ChessPiece from "./ChessPiece";
import {
  createStockfishEngine,
  getBestMove,
  STOCKFISH_VERSION,
  type StockfishEngine,
} from "../../engine/stockfish";
import type { Color, GameState, Move, PieceType, Square } from "../../chess";

interface ChessBoardProps {
  orientation?: Color;
  onStateChange?: (state: GameState) => void;
}

export default function ChessBoard({
  orientation = "w",
  onStateChange,
}: ChessBoardProps) {
  const { pieceSet } = useCustomisation();
  const [state, setState] = useState<GameState>(createInitialState);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [lastMoveSan, setLastMoveSan] = useState<string | null>(null);
  const [promotionPick, setPromotionPick] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [sfReady, setSfReady] = useState(false);
  const [sfThinking, setSfThinking] = useState(false);
  const [sfSuggestion, setSfSuggestion] = useState<string | null>(null);
  const engineRef = useRef<StockfishEngine | null>(null);

  const status = useMemo(() => getGameStatus(state), [state]);

  useEffect(() => {
    const engine = createStockfishEngine();
    engineRef.current = engine;
    const interval = setInterval(() => {
      if (engine.ready) {
        setSfReady(true);
        clearInterval(interval);
      }
    }, 100);
    return () => {
      clearInterval(interval);
      engine.quit();
      engineRef.current = null;
    };
  }, []);

  const suggestMove = async () => {
    const engine = engineRef.current;
    if (!engine?.ready || sfThinking) return;
    if (status.type === "checkmate" || status.type === "stalemate" || status.type === "draw") {
      return;
    }
    setSfThinking(true);
    setSfSuggestion(null);
    try {
      const fen = toFen(state);
      const uci = await getBestMove(engine, fen, 14);
      setSfSuggestion(uci || "—");
    } finally {
      setSfThinking(false);
    }
  };

  const updateState = useCallback(
    (next: GameState, move: Move | null, prev?: GameState) => {
      setState(next);
      if (move) {
        setLastMove(move);
        if (prev) setLastMoveSan(formatMove(prev, move));
      }
      onStateChange?.(next);
    },
    [onStateChange]
  );

  const tryMove = useCallback(
    (move: Move) => {
      const next = makeMove(state, move);
      if (!next) return false;
      updateState(next, move, state);
      setSelected(null);
      setLegalTargets([]);
      setPromotionPick(null);
      return true;
    },
    [state, updateState]
  );

  const onPiecePress = useCallback(
    (sq: Square) => {
      if (status.type === "checkmate" || status.type === "stalemate" || status.type === "draw") {
        return;
      }
      if (promotionPick) return;
      const piece = state.board[sq];
      if (!piece || piece.color !== state.turn) return;
      if (selected === sq && legalTargets.length > 0) return;
      startTransition(() => {
        setSelected(sq);
        setLegalTargets(getLegalMoves(state, sq));
      });
    },
    [status.type, promotionPick, state, selected, legalTargets.length]
  );

  const onSquareClick = (sq: Square) => {
    if (status.type === "checkmate" || status.type === "stalemate" || status.type === "draw") {
      return;
    }

    if (promotionPick) return;

    const piece = state.board[sq];
    const targetMove = legalTargets.find((m) => m.to === sq);

    if (targetMove) {
      const promos = legalTargets.filter((m) => m.to === sq && m.promotion);
      if (promos.length > 1) {
        setPromotionPick({ from: selected!, to: sq });
        return;
      }
      tryMove(promos[0] ?? targetMove);
      return;
    }

    if (piece && piece.color === state.turn) {
      if (selected === sq && legalTargets.length > 0) return;
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
    if (move) tryMove(move);
  };

  const reset = () => {
    const init = createInitialState();
    setState(init);
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    setLastMoveSan(null);
    setPromotionPick(null);
    onStateChange?.(init);
  };

  const statusLabel = (() => {
    switch (status.type) {
      case "check":
        return `${status.color === "w" ? "White" : "Black"} is in check`;
      case "checkmate":
        return `Checkmate — ${status.winner === "w" ? "White" : "Black"} wins`;
      case "stalemate":
        return "Stalemate — draw";
      case "draw":
        return `Draw — ${status.reason}`;
      default:
        return `${state.turn === "w" ? "White" : "Black"} to move`;
    }
  })();

  return (
    <div className="flex w-full min-w-0 flex-col items-center gap-6">
      <div className="flex w-full min-w-0 max-w-[min(100%,32rem)] items-center justify-between gap-4">
        <div className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.25em] text-[rgba(232,197,71,0.7)] uppercase">
          {statusLabel}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span
            className={`font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] ${
              sfReady
                ? "text-[rgba(0,229,255,0.55)]"
                : "text-[rgba(255,255,255,0.2)]"
            }`}
          >
            SF{STOCKFISH_VERSION} {sfReady ? "ONLINE" : "LOADING"}
          </span>
          <button
            type="button"
            onClick={suggestMove}
            disabled={!sfReady || sfThinking}
            className="nav-link rounded-sm px-3 py-1.5 text-[9px] disabled:opacity-40"
          >
            {sfThinking ? "Thinking…" : "Suggest"}
          </button>
          <button type="button" onClick={reset} className="nav-link rounded-sm px-3 py-1.5 text-[9px]">
            Reset
          </button>
        </div>
      </div>

      <div className="relative w-full min-w-0">
        <ChessBoardGrid
          state={state}
          orientation={orientation}
          selected={selected}
          legalTargets={legalTargets}
          lastMove={lastMove}
          onSquareClick={onSquareClick}
          onPiecePress={onPiecePress}
        />

        <AnimatePresence>
          {promotionPick && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-30 flex items-center justify-center rounded-sm bg-[rgba(5,5,8,0.85)]"
              onClick={() => setPromotionPick(null)}
            >
              <div
                className="board-frame rounded-sm px-6 py-4 text-center"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="mb-4 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.3em] text-[rgba(232,197,71,0.7)] uppercase">
                  Promote
                </p>
                <div className="flex gap-3">
                  {PROMOTION_PIECES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => onPromotion(t)}
                      className="flex h-12 w-12 items-center justify-center rounded-sm border border-[rgba(232,197,71,0.35)] text-2xl transition-all hover:border-[rgba(232,197,71,0.7)] hover:shadow-[0_0_20px_rgba(232,197,71,0.3)]"
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

      {lastMoveSan && (
        <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(255,255,255,0.3)]">
          Last: {lastMoveSan}
        </p>
      )}

      {sfSuggestion && (
        <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.2em] text-gold-glow">
          Stockfish suggests: {sfSuggestion}
        </p>
      )}

      <p className="max-w-md text-center font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.35)]">
        {getAllLegalMoves(state).length} legal moves · Stockfish {STOCKFISH_VERSION} engine
      </p>
    </div>
  );
}
