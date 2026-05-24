import { AnimatePresence, motion } from "framer-motion";
import { startTransition, useCallback, useEffect, useRef, useState } from "react";
import {
  analyzeUserMove,
  createPlayStyleProfile,
  finishGame,
  getChimeraMove,
  loadMemory,
  refreshUserCognitiveIdentity,
  saveMemory,
  updateStyleFromMove,
} from "../../ai";
import { waitForPendingMistakeAnalyses } from "../../ai/mistakeAnalyzer";
import { effectiveChimeraElo } from "../../ai/chimeraStrength";
import { CHIMERA_MEMORY_EVENT } from "../../ai/types";
import type { GameMoveRecord, MistakeRecord, StoredGame } from "../../ai/types";
import {
  createInitialState,
  formatMove,
  getGameStatus,
  getLegalMoves,
  makeMove,
  moveToUci,
  PROMOTION_PIECES,
  toFen,
  uciToMove,
} from "../../chess";
import type { Color, GameState, Move, PieceType, Square } from "../../chess";
import { CHIMERA_MIN_THINK_MS, waitAtLeast } from "../../chess/movePacing";
import { useCustomisation } from "../../customisation";
import {
  clearCrsPostGame,
  ensureCrsState,
  tcToCrsMode,
} from "../../crs/profile";
import type { CrsPostGameSummary } from "../../crs/types";
import CrsPostGamePanel from "../crs/CrsPostGamePanel";
import CrsRatingCard from "../crs/CrsRatingCard";
import { createStockfishEngine, type StockfishEngine } from "../../engine/stockfish";
import { useGameReview } from "../../hooks/useGameReview";
import type { GameResult } from "../../online/types";
import { useGameClock } from "../../online/useGameClock";
import {
  formatClock,
  getTimeControl,
  type TimeControlId,
} from "../../online/timeControls";
import type { OnlineClock } from "../../online/types";
import GameReviewPanel from "../review/GameReviewPanel";
import type { GameReviewInput } from "../../review/types";
import ChessBoardGrid from "./ChessBoardGrid";
import ChessPiece from "./ChessPiece";

const BOT_NAME = "CHIMERA";

interface SoloRatedMatchProps {
  tc: TimeControlId;
  onBack: () => void;
}

function opponentColor(c: Color): Color {
  return c === "w" ? "b" : "w";
}

function reviewResult(
  result: GameResult,
  userColor: Color
): StoredGame["result"] {
  if (result === "draw") return "draw";
  const userWin =
    (result === "white-win" && userColor === "w") ||
    (result === "black-win" && userColor === "b");
  return userWin ? "user-win" : "chimera-win";
}

function botThinkCap(tc: TimeControlId): number {
  if (tc === "bullet") return 180;
  if (tc === "blitz") return 350;
  return 600;
}

function applyMoveClock(
  clock: OnlineClock,
  side: Color,
  turnStartedAt: number,
  incrementMs: number
): { clock: OnlineClock; flagged: boolean } {
  const elapsed = Date.now() - turnStartedAt;
  const remaining = clock[side] - elapsed;
  if (remaining <= 0) {
    return {
      clock: { ...clock, [side]: 0 },
      flagged: true,
    };
  }
  return {
    clock: { ...clock, [side]: remaining + incrementMs },
    flagged: false,
  };
}

export default function SoloRatedMatch({ tc, onBack }: SoloRatedMatchProps) {
  const tcDef = getTimeControl(tc)!;
  const { pieceSet } = useCustomisation();
  const [userColor] = useState<Color>(() =>
    Math.random() < 0.5 ? "w" : "b"
  );
  const botColor = opponentColor(userColor);

  const [state, setState] = useState<GameState>(createInitialState);
  const [clock, setClock] = useState<OnlineClock>(() => ({
    w: tcDef.initialMs,
    b: tcDef.initialMs,
  }));
  const [turnStartedAt, setTurnStartedAt] = useState(() => Date.now());
  const [phase, setPhase] = useState<"playing" | "ended">("playing");
  const [result, setResult] = useState<GameResult | null>(null);
  const [endReason, setEndReason] = useState<string | null>(null);

  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [promotionPick, setPromotionPick] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [botThinking, setBotThinking] = useState(false);
  const [sfReady, setSfReady] = useState(false);
  const [crsPostGame, setCrsPostGame] = useState<CrsPostGameSummary | null>(
    null
  );

  const engineRef = useRef<StockfishEngine | null>(null);
  const gameRef = useRef<{
    id: string;
    startedAt: number;
    moves: GameMoveRecord[];
    mistakes: MistakeRecord[];
    userMoveTimesMs: number[];
  } | null>(null);
  const endedRef = useRef(false);
  const reviewStartedRef = useRef(false);
  const pendingMistakeAnalysesRef = useRef(0);

  const { report, loading, progress, error: reviewError, runReview, dismiss } = useGameReview();
  const [memory, setMemory] = useState(() => loadMemory());
  const [lastStoredGame, setLastStoredGame] = useState<StoredGame | null>(null);

  useEffect(() => {
    const sync = () => setMemory(loadMemory());
    window.addEventListener(CHIMERA_MEMORY_EVENT, sync);
    return () => window.removeEventListener(CHIMERA_MEMORY_EVENT, sync);
  }, []);
  const crs = ensureCrsState(memory);
  const chimeraElo = effectiveChimeraElo(memory);

  const turn = state.turn;
  const userTurn = turn === userColor;
  const status = getGameStatus(state);
  const displayClock = useGameClock(clock, turn, turnStartedAt);

  const finish = useCallback(
    (gameResult: GameResult, reason: string) => {
      if (endedRef.current) return;
      endedRef.current = true;
      setPhase("ended");
      setResult(gameResult);
      setEndReason(reason);
      setBotThinking(false);
    },
    []
  );

  const recordMove = useCallback(
    (move: Move, by: "user" | "chimera", before: GameState) => {
      const g = gameRef.current;
      if (!g) return;
      const after = makeMove(before, move);
      if (!after) return;
      g.moves.push({
        uci: moveToUci(move),
        san: formatMove(before, move),
        fen: toFen(after),
        by,
      });
    },
    []
  );

  useEffect(() => {
    gameRef.current = {
      id: `solo-${Date.now()}`,
      startedAt: Date.now(),
      moves: [],
      mistakes: [],
      userMoveTimesMs: [],
    };
    endedRef.current = false;
    reviewStartedRef.current = false;

    const engine = createStockfishEngine();
    engineRef.current = engine;
    const t = setInterval(() => {
      if (engine.ready) {
        setSfReady(true);
        clearInterval(t);
      }
    }, 100);
    return () => {
      clearInterval(t);
      engine.quit();
      engineRef.current = null;
    };
  }, [tc]);

  const runBotTurn = useCallback(
    async (current: GameState, currentClock: OnlineClock, startedAt: number) => {
      const engine = engineRef.current;
      if (!engine?.ready || endedRef.current) return;

      if (current.turn !== botColor) return;

      const { clock: afterFlag, flagged } = applyMoveClock(
        currentClock,
        botColor,
        startedAt,
        tcDef.incrementMs
      );
      if (flagged) {
        finish(userColor === "w" ? "white-win" : "black-win", "on time");
        return;
      }

      setBotThinking(true);
      const thinkStart = Date.now();
      const mem = loadMemory();
      const uci = await getChimeraMove(engine, current, botColor, mem);
      await waitAtLeast(thinkStart, Math.min(CHIMERA_MIN_THINK_MS, botThinkCap(tc)));

      if (endedRef.current) {
        setBotThinking(false);
        return;
      }

      const move = uci ? uciToMove(current, uci) : null;
      if (!move) {
        setBotThinking(false);
        return;
      }

      const next = makeMove(current, move);
      if (!next) {
        setBotThinking(false);
        return;
      }

      recordMove(move, "chimera", current);
      setClock(afterFlag);
      setTurnStartedAt(Date.now());
      setState(next);
      setLastMove(move);

      const st = getGameStatus(next);
      if (st.type === "checkmate") {
        finish(userColor === "w" ? "black-win" : "white-win", "checkmate");
      } else if (st.type === "stalemate" || st.type === "draw") {
        finish("draw", st.type);
      }
      setBotThinking(false);
    },
    [botColor, finish, recordMove, tc, tcDef.incrementMs, userColor]
  );

  useEffect(() => {
    if (phase !== "playing" || !sfReady || botThinking) return;
    if (state.turn === botColor) {
      void runBotTurn(state, clock, turnStartedAt);
    }
  }, [
    phase,
    sfReady,
    botThinking,
    state,
    clock,
    turnStartedAt,
    botColor,
    runBotTurn,
  ]);

  useEffect(() => {
    if (phase !== "playing" || !turn) return;
    const id = setInterval(() => {
      const elapsed = Date.now() - turnStartedAt;
      const activeMs =
        turn === "w" ? clock.w - elapsed : clock.b - elapsed;
      if (activeMs <= 0) {
        finish(
          turn === "w" ? "black-win" : "white-win",
          "on time"
        );
      }
    }, 250);
    return () => clearInterval(id);
  }, [phase, turn, clock, turnStartedAt, finish]);

  useEffect(() => {
    if (phase !== "ended" || reviewStartedRef.current) return;
    const g = gameRef.current;
    if (!g || g.moves.length < 1 || !result) return;
    reviewStartedRef.current = true;

    const reviewEngine = createStockfishEngine();
    let cancelled = false;
    let reviewTimer: ReturnType<typeof setInterval> | undefined;

    void (async () => {
      await waitForPendingMistakeAnalyses(
        () => pendingMistakeAnalysesRef.current
      );
      if (cancelled) return;

      const stored: StoredGame = {
        id: g.id,
        startedAt: g.startedAt,
        endedAt: Date.now(),
        userColor,
        moves: g.moves,
        mistakes: g.mistakes,
        result: reviewResult(result, userColor),
        openingLine: g.moves
          .slice(0, 6)
          .map((m) => m.san ?? m.uci)
          .join(" "),
        userMoveTimesMs: [...g.userMoveTimesMs],
      };

      const mem = loadMemory();
      const mode = tcToCrsMode(tc);
      const next = finishGame(mem, stored, {
        mode,
        opponentRating: chimeraElo,
      });
      saveMemory(next);
      setMemory(next);
      setLastStoredGame(stored);
      if (next.crs?.lastPostGame) {
        setCrsPostGame(next.crs.lastPostGame);
      }

      engineRef.current?.stop();

      const reviewInput: GameReviewInput = {
        id: g.id,
        mode: "online",
        opponentLabel: BOT_NAME,
        userColor,
        result: reviewResult(result, userColor),
        startedAt: g.startedAt,
        endedAt: Date.now(),
        moves: g.moves,
      };

      reviewTimer = setInterval(() => {
        if (cancelled || !reviewEngine.ready) return;
        if (reviewTimer) clearInterval(reviewTimer);
        void runReview(reviewEngine, reviewInput);
      }, 120);
    })();

    return () => {
      cancelled = true;
      if (reviewTimer) clearInterval(reviewTimer);
      reviewEngine.quit();
    };
  }, [phase, result, userColor, tc, chimeraElo, runReview]);

  const applyUserMove = useCallback(
    (move: Move) => {
      if (phase !== "playing" || !userTurn || botThinking) return;

      const fenBefore = toFen(state);
      const thinkMs = Date.now() - turnStartedAt;
      const { clock: afterFlag, flagged } = applyMoveClock(
        clock,
        userColor,
        turnStartedAt,
        tcDef.incrementMs
      );
      if (flagged) {
        finish(userColor === "w" ? "black-win" : "white-win", "on time");
        return;
      }

      const next = makeMove(state, move);
      if (!next) return;

      recordMove(move, "user", state);
      gameRef.current?.userMoveTimesMs.push(Math.max(0, thinkMs));
      setClock(afterFlag);
      setTurnStartedAt(Date.now());
      setState(next);
      setLastMove(move);
      setSelected(null);
      setLegalTargets([]);
      setPromotionPick(null);

      const st = getGameStatus(next);
      if (st.type === "checkmate") {
        finish(userColor === "w" ? "white-win" : "black-win", "checkmate");
      } else if (st.type === "stalemate" || st.type === "draw") {
        finish("draw", st.type);
      }

      const engine = engineRef.current;
      if (engine?.ready) {
        const uci = moveToUci(move);
        const fenAfter = toFen(next);
        const before = state;
        pendingMistakeAnalysesRef.current += 1;
        void analyzeUserMove(engine, fenBefore, fenAfter, uci, userColor, 4)
          .then((mistake) => {
            if (mistake && gameRef.current) {
              gameRef.current.mistakes.push(mistake);
            }
            const mem = loadMemory();
            const style = mem.userStyle ?? createPlayStyleProfile();
            const withStyle = {
              ...mem,
              userStyle: updateStyleFromMove(
                style,
                before,
                move,
                mistake?.cpLoss
              ),
            };
            saveMemory(refreshUserCognitiveIdentity(withStyle));
          })
          .finally(() => {
            pendingMistakeAnalysesRef.current -= 1;
          });
      }
    },
    [
      phase,
      userTurn,
      botThinking,
      clock,
      userColor,
      turnStartedAt,
      tcDef.incrementMs,
      state,
      finish,
      recordMove,
      botColor,
    ]
  );

  const onPiecePress = useCallback(
    (sq: Square) => {
      if (!userTurn || phase !== "playing" || botThinking || promotionPick) return;
      const piece = state.board[sq];
      if (!piece || piece.color !== userColor) return;
      if (selected === sq && legalTargets.length > 0) return;
      startTransition(() => {
        setSelected(sq);
        setLegalTargets(getLegalMoves(state, sq));
      });
    },
    [
      userTurn,
      phase,
      botThinking,
      promotionPick,
      state,
      userColor,
      selected,
      legalTargets.length,
    ]
  );

  const onSquareClick = (sq: Square) => {
    if (!userTurn || phase !== "playing" || botThinking || promotionPick) return;

    const piece = state.board[sq];
    const targetMove = legalTargets.find((m) => m.to === sq);

    if (targetMove) {
      const promos = legalTargets.filter((m) => m.to === sq && m.promotion);
      if (promos.length > 1) {
        setPromotionPick({ from: selected!, to: sq });
        return;
      }
      applyUserMove(promos[0] ?? targetMove);
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
    if (move) applyUserMove(move);
  };

  const onResign = () => {
    finish(userColor === "w" ? "black-win" : "white-win", "resignation");
  };

  const dismissCrsPostGame = useCallback(() => {
    setCrsPostGame(null);
    saveMemory(clearCrsPostGame(loadMemory()));
  }, []);

  const myMs = userColor === "w" ? displayClock.w : displayClock.b;
  const oppMs = userColor === "w" ? displayClock.b : displayClock.w;
  const lowTime = myMs < 10_000;

  const statusLabel =
    phase === "playing"
      ? userTurn
        ? "Your move"
        : `${BOT_NAME} is thinking…`
      : result === "draw"
        ? `Draw (${endReason})`
        : (result === "white-win" && userColor === "w") ||
            (result === "black-win" && userColor === "b")
          ? `You win — ${endReason}`
          : `You lose — ${endReason}`;

  return (
    <>
      {crsPostGame && (
        <CrsPostGamePanel summary={crsPostGame} onContinue={dismissCrsPostGame} />
      )}
      <GameReviewPanel
        report={report}
        loading={loading}
        progress={progress}
        error={reviewError}
        onClose={dismiss}
        memory={memory}
        storedGame={lastStoredGame}
      />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex w-full min-w-0 flex-col items-center gap-6"
        >
          <div className="flex w-full min-w-0 max-w-[min(100%,32rem)] flex-wrap items-center justify-between gap-3">
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-wrap items-center gap-3"
            >
              <CrsRatingCard crs={crs} compact mode={tcToCrsMode(tc)} />
              <span className="font-[family-name:var(--font-hud)] text-[10px] text-[rgba(255,255,255,0.2)]">
                VS
              </span>
              <div className="rounded-sm border border-[rgba(0,229,255,0.25)] bg-[rgba(0,229,255,0.05)] px-3 py-1.5 text-center">
                <span className="font-[family-name:var(--font-hud)] text-[7px] tracking-[0.2em] text-[rgba(0,229,255,0.55)]">
                  {BOT_NAME}
                </span>
                <span className="block font-[family-name:var(--font-display)] text-lg text-[rgba(0,229,255,0.85)]">
                  {chimeraElo}
                </span>
              </div>
            </motion.div>
            <div>
              <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.25em] text-gold-glow uppercase">
                {tcDef.label} · Instant
              </p>
              <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.45)]">
                Rated vs {BOT_NAME} · You are {userColor === "w" ? "White" : "Black"}
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

          <motion.div className="relative isolate w-full min-w-0 max-w-[min(100%,calc(100vw-1.25rem),32rem)]">
            <ChessBoardGrid
              state={state}
              orientation={userColor}
              selected={selected}
              legalTargets={legalTargets}
              lastMove={lastMove}
              onSquareClick={onSquareClick}
              onPiecePress={onPiecePress}
              disabled={!userTurn || phase !== "playing" || botThinking}
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
                  <motion.div
                    initial={{ scale: 0.92, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.92, opacity: 0 }}
                    className="board-frame rounded-sm px-6 py-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <p className="mb-3 text-center font-[family-name:var(--font-hud)] text-[9px] tracking-[0.3em] text-[rgba(232,197,71,0.7)]">
                      PROMOTE
                    </p>
                    <motion.div
                      initial="hidden"
                      animate="show"
                      variants={{
                        hidden: {},
                        show: { transition: { staggerChildren: 0.05 } },
                      }}
                      className="flex gap-3"
                    >
                      {PROMOTION_PIECES.map((t) => (
                        <motion.button
                          key={t}
                          type="button"
                          variants={{
                            hidden: { opacity: 0, y: 6 },
                            show: { opacity: 1, y: 0 },
                          }}
                          onClick={() => onPromotion(t)}
                          className="flex h-12 w-12 items-center justify-center"
                        >
                          <ChessPiece
                            color={userColor}
                            type={t}
                            pieceSet={pieceSet}
                          />
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          <p className="font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.4)]">
            {statusLabel}
          </p>
        </motion.div>

        <motion.aside
          initial={{ opacity: 0, x: 12 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass-panel w-full max-w-xs rounded-sm p-6"
        >
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
            {BOT_NAME}
          </p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[rgba(255,255,255,0.5)]">
            {formatClock(oppMs)}
          </p>

          {phase === "playing" && (
            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={onResign}
                className="rounded-sm border border-[rgba(255,100,100,0.25)] px-3 py-2 font-[family-name:var(--font-hud)] text-[9px] text-[rgba(255,120,120,0.85)]"
              >
                Resign
              </button>
            </div>
          )}

          {phase === "ended" && (
            <div className="mt-6 flex flex-col gap-2">
              {(loading || report) && (
                <p className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(0,229,255,0.55)]">
                  {loading
                    ? "Building full game review…"
                    : "Review ready — scroll the overlay"}
                </p>
              )}
              <button
                type="button"
                onClick={() => {
                  dismiss();
                  onBack();
                }}
                className="w-full nav-link rounded-sm px-3 py-2 text-[9px]"
              >
                Back to pools
              </button>
            </div>
          )}

          {status.type === "check" && phase === "playing" && (
            <p className="mt-4 text-[10px] text-[rgba(232,197,71,0.6)]">
              {status.color === userColor
                ? "You are in check"
                : "Opponent in check"}
            </p>
          )}
        </motion.aside>
      </motion.div>
    </>
  );
}
