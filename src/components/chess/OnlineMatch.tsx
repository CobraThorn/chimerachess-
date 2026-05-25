import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCustomisation } from "../../customisation";
import { useGameClock } from "../../online/useGameClock";
import type { OnlineClientState } from "../../online/useOnlineClient";
import { formatClock } from "../../online/timeControls";
import type { GameResult } from "../../online/types";
import {
  createInitialState,
  fromFen,
  getGameStatus,
  getLegalMoves,
  makeMove,
  moveToUci,
  PROMOTION_PIECES,
} from "../../chess";
import type { Color, GameState, Move, PieceType, Square } from "../../chess";
import ChessBoardGrid from "./ChessBoardGrid";
import ChessPiece from "./ChessPiece";
import { acquireSharedTorch } from "../../engine/enginePool";
import { createStockfishEngine, type StockfishEngine } from "../../engine/stockfish";
import { useGameReview } from "../../hooks/useGameReview";
import { finishGame, loadMemory, saveMemory } from "../../ai";
import { CHIMERA_MEMORY_EVENT, type ChimeraMemory, type StoredGame } from "../../ai/types";
import { onlineMovesToRecords } from "../../review/buildGameReview";
import { watchReviewEngineReady } from "../../review/reviewEngineBoot";
import { onlineResultToReview } from "../../review/types";
import GameReviewPanel from "../review/GameReviewPanel";
import { clearCrsPostGame, tcToCrsMode } from "../../crs/profile";
import type { CrsPostGameSummary } from "../../crs/types";
import CrsPostGamePanel from "../crs/CrsPostGamePanel";

interface OnlineMatchProps {
  client: OnlineClientState;
  onSendMove: (uci: string) => void;
  onResign: () => void;
  onOfferDraw: () => void;
  onAcceptDraw: () => void;
  onBack: () => void;
}

function resultMessage(
  result: GameResult | null,
  userColor: Color,
  reason: string | null
): string {
  if (!result) return "Game over";
  const userWin =
    (result === "white-win" && userColor === "w") ||
    (result === "black-win" && userColor === "b");
  const userLoss =
    (result === "white-win" && userColor === "b") ||
    (result === "black-win" && userColor === "w");
  if (result === "draw") return `Draw${reason ? ` (${reason})` : ""}`;
  if (userWin) return `You win${reason ? ` — ${reason}` : ""}`;
  if (userLoss) return `You lose${reason ? ` — ${reason}` : ""}`;
  return "Game over";
}

export default function OnlineMatch({
  client,
  onSendMove,
  onResign,
  onOfferDraw,
  onAcceptDraw,
  onBack,
}: OnlineMatchProps) {
  const { pieceSet } = useCustomisation();
  const match = client.match!;
  const userColor = match.color;

  const parsed = useMemo(
    () => fromFen(match.fen) ?? createInitialState(),
    [match.fen]
  );

  const [state, setState] = useState<GameState>(parsed);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [promotionPick, setPromotionPick] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const {
    report,
    loading,
    progress,
    error: reviewError,
    runReview,
    dismiss,
    abortReview,
    failReview,
  } = useGameReview();
  const reviewEngineRef = useRef<StockfishEngine | null>(null);
  const reviewStartedRef = useRef(false);
  const [memory, setMemory] = useState<ChimeraMemory>(() => loadMemory());
  const [storedGame, setStoredGame] = useState<StoredGame | null>(null);
  const [crsPostGame, setCrsPostGame] = useState<CrsPostGameSummary | null>(null);

  useEffect(() => {
    const sync = () => setMemory(loadMemory());
    window.addEventListener(CHIMERA_MEMORY_EVENT, sync);
    return () => window.removeEventListener(CHIMERA_MEMORY_EVENT, sync);
  }, []);

  useEffect(() => {
    reviewStartedRef.current = false;
    setCrsPostGame(null);
    setStoredGame(null);
  }, [match.gameId]);

  useEffect(() => {
    if (client.phase !== "ended" || reviewStartedRef.current) return;
    const history = match.moveHistory ?? [];
    if (history.length < 1) return;
    reviewStartedRef.current = true;

    const result = onlineResultToReview(client.result, userColor);
    const moveRecords = onlineMovesToRecords(history);
    const stored: StoredGame = {
      id: match.gameId,
      startedAt: match.startedAt,
      endedAt: Date.now(),
      userColor,
      moves: moveRecords,
      mistakes: [],
      result,
      openingLine: history
        .slice(0, 6)
        .map((m) => m.san ?? m.uci)
        .join(" "),
    };

    const mem = loadMemory();
    const mode = tcToCrsMode(match.tc);
    const next = finishGame(mem, stored, { mode, opponentRating: 1200 });
    saveMemory(next);
    setMemory(next);
    setStoredGame(stored);
    if (next.crs?.lastPostGame) {
      setCrsPostGame(next.crs.lastPostGame);
    }

    const reviewInput = {
      id: match.gameId,
      mode: "online" as const,
      opponentLabel: match.opponent.name,
      userColor,
      result: onlineResultToReview(client.result, userColor),
      startedAt: match.startedAt,
      endedAt: Date.now(),
      moves: moveRecords,
    };

    const engine = createStockfishEngine();
    reviewEngineRef.current = engine;
    let cancelled = false;

    const stopWatch = watchReviewEngineReady(
      engine,
      () => {
        if (cancelled) return;
        void (async () => {
          const torch = await acquireSharedTorch();
          if (!cancelled) void runReview(engine, reviewInput, torch);
        })();
      },
      () => {
        if (!cancelled) {
          failReview(
            "Stockfish did not start in time — refresh the page and try again."
          );
        }
      }
    );

    return () => {
      cancelled = true;
      stopWatch();
      abortReview();
      if (reviewEngineRef.current === engine) {
        engine.stop();
        engine.quit();
        reviewEngineRef.current = null;
      }
    };
  }, [
    client.phase,
    client.result,
    match.gameId,
    match.moveHistory,
    match.opponent.name,
    match.startedAt,
    match.tc,
    userColor,
    runReview,
    abortReview,
    failReview,
  ]);

  useEffect(() => {
    const next = fromFen(match.fen);
    if (next) {
      setState(next);
      setSelected(null);
      setLegalTargets([]);
      setPromotionPick(null);
    }
  }, [match.fen]);

  const turn = state.turn;
  const userTurn = turn === userColor;
  const status = getGameStatus(state);
  const displayClock = useGameClock(
    match.clock,
    turn,
    match.turnStartedAt
  );

  const applyLocalMove = useCallback(
    (move: Move) => {
      const next = makeMove(state, move);
      if (!next) return;
      const uci = moveToUci(move);
      setState(next);
      setLastMove(move);
      setSelected(null);
      setLegalTargets([]);
      setPromotionPick(null);
      onSendMove(uci);
    },
    [state, onSendMove]
  );

  const onPiecePress = useCallback(
    (sq: Square) => {
      if (!userTurn || client.phase !== "playing" || promotionPick) return;
      const piece = state.board[sq];
      if (!piece || piece.color !== userColor) return;
      if (selected === sq && legalTargets.length > 0) return;
      setSelected(sq);
      setLegalTargets(getLegalMoves(state, sq));
    },
    [
      userTurn,
      client.phase,
      promotionPick,
      state,
      userColor,
      selected,
      legalTargets.length,
    ]
  );

  const onSquareClick = (sq: Square) => {
    if (!userTurn || client.phase !== "playing") return;
    if (promotionPick) return;

    const piece = state.board[sq];
    const targetMove = legalTargets.find((m) => m.to === sq);

    if (targetMove) {
      const promos = legalTargets.filter((m) => m.to === sq && m.promotion);
      if (promos.length > 1) {
        setPromotionPick({ from: selected!, to: sq });
        return;
      }
      applyLocalMove(promos[0] ?? targetMove);
      return;
    }

    if (piece && piece.color === userColor) {
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
    if (move) applyLocalMove(move);
  };

  const myMs = userColor === "w" ? displayClock.w : displayClock.b;
  const oppMs = userColor === "w" ? displayClock.b : displayClock.w;
  const lowTime = myMs < 10_000;

  const dismissCrsPostGame = useCallback(() => {
    setCrsPostGame(null);
    const mem = loadMemory();
    saveMemory(clearCrsPostGame(mem));
  }, []);

  return (
    <>
    {crsPostGame && (
      <CrsPostGamePanel
        summary={crsPostGame}
        onContinue={dismissCrsPostGame}
      />
    )}
    <GameReviewPanel
      report={report}
      loading={loading}
      progress={progress}
      error={reviewError}
      open={client.phase === "ended"}
      memory={memory}
      storedGame={storedGame}
      onClose={dismiss}
    />
    <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex w-full min-w-0 flex-col items-center gap-6">
        <div className="flex w-full min-w-0 max-w-[min(100%,32rem)] flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.25em] text-gold-glow uppercase">
              {match.tcLabel} · Online
            </p>
            <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.45)]">
              vs {match.opponent.name} · You are {userColor === "w" ? "White" : "Black"}
            </p>
          </div>
          <div className="flex gap-4 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            <span
              className={
                userColor === "w"
                  ? lowTime
                    ? "text-[rgba(255,100,100,0.95)]"
                    : "text-gold-glow"
                  : "text-[rgba(255,255,255,0.35)]"
              }
            >
              {formatClock(displayClock.w)}
            </span>
            <span className="text-[rgba(255,255,255,0.2)]">:</span>
            <span
              className={
                userColor === "b"
                  ? lowTime
                    ? "text-[rgba(255,100,100,0.95)]"
                    : "text-gold-glow"
                  : "text-[rgba(255,255,255,0.35)]"
              }
            >
              {formatClock(displayClock.b)}
            </span>
          </div>
        </div>

        <div className="relative isolate w-full min-w-0 max-w-[min(100%,calc(100vw-1.25rem),32rem)]">
          <ChessBoardGrid
            state={state}
            orientation={userColor}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={lastMove}
            onSquareClick={onSquareClick}
            onPiecePress={onPiecePress}
            disabled={!userTurn || client.phase !== "playing"}
            showCorners={false}
          />

          <AnimatePresence>
            {promotionPick && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center bg-[rgba(5,5,8,0.85)]"
                onClick={() => setPromotionPick(null)}
              >
                <div
                  className="board-frame rounded-sm px-6 py-4"
                  onClick={(e) => e.stopPropagation()}
                >
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
                          color={userColor}
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

        <p className="font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.4)]">
          {client.phase === "playing"
            ? userTurn
              ? "Your move"
              : `${match.opponent.name} is thinking…`
            : resultMessage(client.result, userColor, client.endReason)}
        </p>
      </div>

      <aside className="glass-panel w-full max-w-xs rounded-sm p-6">
        <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(255,255,255,0.35)] uppercase">
          Your clock
        </p>
        <p
          className={`mt-1 font-[family-name:var(--font-display)] text-3xl ${
            lowTime ? "text-[rgba(255,100,100,0.95)]" : "text-gold-glow"
          }`}
        >
          {formatClock(myMs)}
        </p>
        <p className="mt-4 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(255,255,255,0.35)] uppercase">
          {match.opponent.name}
        </p>
        <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[rgba(255,255,255,0.5)]">
          {formatClock(oppMs)}
        </p>

        {client.phase === "playing" && (
          <div className="mt-6 flex flex-col gap-2">
            <button
              type="button"
              onClick={onOfferDraw}
              className="nav-link rounded-sm px-3 py-2 text-[9px]"
            >
              Offer draw
            </button>
            {client.drawOffered && (
              <button
                type="button"
                onClick={onAcceptDraw}
                className="rounded-sm border border-[rgba(0,229,255,0.35)] px-3 py-2 font-[family-name:var(--font-hud)] text-[9px] text-[rgba(0,229,255,0.8)]"
              >
                Accept draw
              </button>
            )}
            <button
              type="button"
              onClick={onResign}
              className="rounded-sm border border-[rgba(255,100,100,0.25)] px-3 py-2 font-[family-name:var(--font-hud)] text-[9px] text-[rgba(255,120,120,0.85)]"
            >
              Resign
            </button>
          </div>
        )}

        {client.phase === "ended" && (
          <div className="mt-6 flex flex-col gap-2">
            {(loading || report) && (
              <p className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(0,229,255,0.55)]">
                {loading ? "Building full game review…" : "Review ready — scroll the overlay"}
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                dismiss();
                reviewStartedRef.current = false;
                onBack();
              }}
              className="w-full nav-link rounded-sm px-3 py-2 text-[9px]"
            >
              Back to pools
            </button>
          </div>
        )}

        {status.type === "check" && client.phase === "playing" && (
          <p className="mt-4 text-[10px] text-[rgba(232,197,71,0.6)]">
            {status.color === userColor ? "You are in check" : "Opponent in check"}
          </p>
        )}
      </aside>
    </div>
    </>
  );
}
