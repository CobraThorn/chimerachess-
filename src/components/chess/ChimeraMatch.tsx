import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { logDataEvent } from "../../account/events";
import { waitForPendingMistakeAnalyses } from "../../ai/mistakeAnalyzer";
import {
  analyzeUserMove,
  createPlayStyleProfile,
  finishGame,
  getChimeraMove,
  getTopPatterns,
  chimeraStrengthLabel,
  calibrationStatusLabel,
  ensureChimeraCalibration,
  effectiveChimeraElo,
  loadMemory,
  saveMemory,
  createPersonaPlayStyle,
  refreshOpponentCognitiveIdentity,
  refreshUserCognitiveIdentity,
  signatureOpeningHint,
  updateStyleFromMove,
  userStyleToRadar,
} from "../../ai";
import { CHIMERA_SIGNATURE_OPENING } from "../../content/chimeraSignatureOpening";
import { getSubdivisionDef } from "../../ai/cognition/archetypes";
import { useCustomisation } from "../../customisation";
import {
  CHIMERA_MEMORY_EVENT,
} from "../../ai/types";
import ChimeraMemoryRadar from "./ChimeraMemoryRadar";
import ChimeraLearningPanel from "./ChimeraLearningPanel";
import ChessBoardGrid from "./ChessBoardGrid";
import ChessPiece from "./ChessPiece";
import CognitiveArchetypePanel from "./CognitiveArchetypePanel";
import EloBadge from "./EloBadge";
import type { ChimeraMemory, GameMoveRecord, MistakeRecord, StoredGame } from "../../ai";
import {
  createInitialState,
  formatMove,
  getAllLegalMoves,
  getGameStatus,
  getLegalMoves,
  makeMove,
  moveToUci,
  PROMOTION_PIECES,
  toFen,
} from "../../chess";
import { resolveBotMove } from "../../chess/resolveBotMove";
import { CHIMERA_MIN_THINK_MS, waitAtLeast } from "../../chess/movePacing";
import { createUserMoveClock } from "../../chess/userMoveClock";
import { loadChimeraSetup } from "../../chimeraSetup/storage";
import type { Color, GameState, Move, PieceType, Square } from "../../chess";
import { acquireSharedTorch } from "../../engine/enginePool";
import { createStockfishEngine, STOCKFISH_VERSION, type StockfishEngine } from "../../engine/stockfish";
import { useGameReview } from "../../hooks/useGameReview";
import type { GameReviewInput } from "../../review/types";
import GameReviewPanel from "../review/GameReviewPanel";
import { clearCrsPostGame, ensureCrsState } from "../../crs/profile";
import {
  attachPersonalPuzzleDeck,
  rebuildPersonalPuzzleDeck,
} from "../../personalPuzzles/engine";
import {
  attachIntelligenceToMemory,
  getIntelligenceArchive,
} from "../../intelligence/storage";
import CrsPostGamePanel from "../crs/CrsPostGamePanel";
import CrsRatingCard from "../crs/CrsRatingCard";

function opponentColor(color: Color): Color {
  return color === "w" ? "b" : "w";
}

function pickFallbackUci(position: GameState): string | null {
  const legal = getAllLegalMoves(position);
  if (!legal.length) return null;
  return moveToUci(legal[Math.floor(Math.random() * legal.length)]!);
}

export default function ChimeraMatch() {
  const { pieceSet } = useCustomisation();
  const [userColor, setUserColor] = useState<Color>("w");
  const chimeraColor = opponentColor(userColor);
  const [state, setState] = useState<GameState>(createInitialState);
  const [memory, setMemory] = useState<ChimeraMemory>(() => loadMemory());
  const [lastStoredGame, setLastStoredGame] = useState<StoredGame | null>(null);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [, setLastMoveSan] = useState<string | null>(null);
  const [promotionPick, setPromotionPick] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [sfReady, setSfReady] = useState(false);
  const [chimeraThinking, setChimeraThinking] = useState(false);
  const [gameOver, setGameOver] = useState<string | null>(null);
  const [reviewInput, setReviewInput] = useState<GameReviewInput | null>(null);
  const { report, loading, progress, error: reviewError, runReview, dismiss } = useGameReview();

  const engineRef = useRef<StockfishEngine | null>(null);
  /** Separate worker so live mistake analysis never blocks CHIMERA's move. */
  const mistakeEngineRef = useRef<StockfishEngine | null>(null);
  const reviewEngineRef = useRef<StockfishEngine | null>(null);
  const chimeraTurnLockRef = useRef(false);
  const gameRef = useRef<{
    id: string;
    moves: GameMoveRecord[];
    mistakes: MistakeRecord[];
    startedAt: number;
    userMoveTimesMs: number[];
  } | null>(null);
  const userMoveClockRef = useRef(createUserMoveClock());
  const pendingMistakeAnalysesRef = useRef(0);
  const playedChimeraEloRef = useRef(effectiveChimeraElo(loadMemory()));

  const status = useMemo(() => getGameStatus(state), [state]);
  const topPatterns = useMemo(() => getTopPatterns(memory, 4), [memory]);
  const userTurn = state.turn === userColor;
  const moveCount = gameRef.current?.moves.length ?? 0;
  const canPickColor = (moveCount === 0 || !!gameOver) && !chimeraThinking;
  const crs = memory.crs ?? ensureCrsState(memory);
  const userElo = crs.chimeraRating;
  const crsPostGame = memory.crs?.lastPostGame;
  const chimeraElo = effectiveChimeraElo(memory);
  const chimeraCalLabel = calibrationStatusLabel(
    ensureChimeraCalibration(memory)
  );
  const chimeraIdentity = memory.chimeraOpponentIdentity;
  const chimeraSub = chimeraIdentity
    ? getSubdivisionDef(chimeraIdentity.subdivision)
    : undefined;
  const showEloDelta = !!gameOver;
  const openingHint = useMemo(
    () => signatureOpeningHint(toFen(state)),
    [state]
  );
  const chimeraCodename = useMemo(
    () => loadChimeraSetup()?.codename?.trim() || "CHIMERA",
    []
  );

  useEffect(() => {
    const engine = createStockfishEngine();
    const mistakeEngine = createStockfishEngine();
    engineRef.current = engine;
    mistakeEngineRef.current = mistakeEngine;
    const t = setInterval(() => {
      if (engine.ready) {
        setSfReady(true);
        clearInterval(t);
      }
    }, 100);
    return () => {
      clearInterval(t);
      engine.stop();
      mistakeEngine.stop();
      engine.quit();
      mistakeEngine.quit();
      engineRef.current = null;
      mistakeEngineRef.current = null;
    };
  }, []);

  const startNewGame = useCallback(() => {
    const init = createInitialState();
    setState(init);
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    setLastMoveSan(null);
    setPromotionPick(null);
    setGameOver(null);
    setReviewInput(null);
    setLastStoredGame(null);
    dismiss();
    userMoveClockRef.current = createUserMoveClock();
    userMoveClockRef.current.markTurnStart();
    playedChimeraEloRef.current = effectiveChimeraElo(memory);
    gameRef.current = {
      id: crypto.randomUUID(),
      moves: [],
      mistakes: [],
      startedAt: Date.now(),
      userMoveTimesMs: userMoveClockRef.current.times,
    };
  }, [dismiss, memory]);

  const pickColor = useCallback(
    (color: Color) => {
      if (color === userColor) return;
      setUserColor(color);
      if (moveCount === 0 || gameOver) startNewGame();
    },
    [userColor, moveCount, gameOver, startNewGame]
  );

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  useEffect(() => {
    if (!reviewInput) return;

    engineRef.current?.stop();
    mistakeEngineRef.current?.stop();
    pendingMistakeAnalysesRef.current = 0;
    const engine = createStockfishEngine();
    reviewEngineRef.current = engine;
    let cancelled = false;
    const timer = setInterval(() => {
      if (cancelled || !engine.ready) return;
      clearInterval(timer);
      void (async () => {
        const torch = await acquireSharedTorch();
        if (!cancelled) void runReview(engine, reviewInput, torch);
      })();
    }, 120);

    return () => {
      cancelled = true;
      clearInterval(timer);
      engine.stop();
      engine.quit();
      reviewEngineRef.current = null;
    };
  }, [reviewInput, runReview]);

  useEffect(() => {
    const onMemoryUpdate = () => setMemory(loadMemory());
    window.addEventListener(CHIMERA_MEMORY_EVENT, onMemoryUpdate);
    return () =>
      window.removeEventListener(CHIMERA_MEMORY_EVENT, onMemoryUpdate);
  }, []);

  const persistFinishedGame = useCallback((result: StoredGame["result"]) => {
    const g = gameRef.current;
    if (!g || g.moves.length < 1) return;

    const endedAt = Date.now();
    const snapshotMoves = [...g.moves];
    const snapshotMistakes = [...g.mistakes];

    /** Start Stockfish review immediately — do not wait on CRS / mistake workers. */
    setReviewInput({
      id: g.id,
      mode: "chimera",
      opponentLabel: "CHIMERA",
      userColor,
      result,
      startedAt: g.startedAt,
      endedAt,
      moves: snapshotMoves,
      liveMistakes: snapshotMistakes,
    });

    void (async () => {
      await waitForPendingMistakeAnalyses(
        () => pendingMistakeAnalysesRef.current
      );
      const live = gameRef.current;
      const mistakes =
        live?.id === g.id ? [...live.mistakes] : snapshotMistakes;
      const stored: StoredGame = {
        id: g.id,
        startedAt: g.startedAt,
        endedAt,
        userColor,
        moves: live?.id === g.id ? [...live.moves] : snapshotMoves,
        mistakes,
        result,
        openingLine: (live?.id === g.id ? live.moves : snapshotMoves)
          .slice(0, 6)
          .map((m) => m.uci)
          .join(" "),
        userMoveTimesMs: [...g.userMoveTimesMs],
      };
      setLastStoredGame(stored);
      setMemory((prev) => {
        let next = finishGame(prev, stored, {
          playedChimeraElo: playedChimeraEloRef.current,
        });
        if (next.games.length >= 5) {
          const archive = getIntelligenceArchive(next);
          const deck = rebuildPersonalPuzzleDeck(next);
          next = attachIntelligenceToMemory(
            next,
            attachPersonalPuzzleDeck(archive, deck)
          );
        }
        saveMemory(next);
        return next;
      });
      logDataEvent("game_complete", {
        result,
        moves: stored.moves.length,
        mistakes: stored.mistakes.length,
      });
      gameRef.current = null;
    })();
  }, [userColor]);

  const resolveGameEnd = useCallback(
    (s: GameState) => {
      const st = getGameStatus(s);
      if (st.type === "checkmate") {
        const userWon = st.winner === userColor;
        setGameOver(
          userWon
            ? "You win — full game review loading…"
            : "CHIMERA wins — full game review loading…"
        );
        persistFinishedGame(userWon ? "user-win" : "chimera-win");
      } else if (st.type === "stalemate" || st.type === "draw") {
        setGameOver("Draw — full game review loading…");
        persistFinishedGame("draw");
      }
    },
    [persistFinishedGame, userColor]
  );

  const memoryRef = useRef(memory);
  memoryRef.current = memory;

  const runChimeraTurn = useCallback(
    async (current: GameState) => {
      const engine = engineRef.current;
      if (!engine?.ready || current.turn !== chimeraColor) return;
      if (chimeraTurnLockRef.current) return;

      chimeraTurnLockRef.current = true;
      setChimeraThinking(true);
      const thinkStart = Date.now();
      const thinkWatchdog = window.setTimeout(() => {
        chimeraTurnLockRef.current = false;
        setChimeraThinking(false);
      }, 45_000);
      try {
        engine.stop();
        mistakeEngineRef.current?.stop();

        let uci = await getChimeraMove(engine, current, chimeraColor, memoryRef.current, {
          mirror: false,
          archetype: memoryRef.current.chimeraOpponentIdentity,
        });

        let move = uci ? resolveBotMove(current, uci) : null;
        if (!move) {
          uci = pickFallbackUci(current);
          move = uci ? resolveBotMove(current, uci) : null;
        }
        if (!move) return;

        await waitAtLeast(thinkStart, CHIMERA_MIN_THINK_MS);

        const next = makeMove(current, move);
        if (!next) return;

        const playedUci = moveToUci(move);
        setState(next);
        setLastMove(move);
        setLastMoveSan(formatMove(current, move));

        gameRef.current?.moves.push({
          uci: playedUci,
          fen: toFen(next),
          by: "chimera",
          san: formatMove(current, move),
        });

        setMemory((prev) => {
          const opp =
            prev.chimeraOpponent ?? createPersonaPlayStyle("opponent");
          return refreshOpponentCognitiveIdentity({
            ...prev,
            chimeraOpponent: updateStyleFromMove(opp, current, move),
          });
        });

        resolveGameEnd(next);
      } finally {
        window.clearTimeout(thinkWatchdog);
        chimeraTurnLockRef.current = false;
        setChimeraThinking(false);
      }
    },
    [resolveGameEnd, chimeraColor]
  );

  const positionFen = useMemo(() => toFen(state), [state]);

  useEffect(() => {
    if (gameOver || state.turn !== userColor) return;
    userMoveClockRef.current.markTurnStart();
  }, [gameOver, state.turn, userColor, positionFen]);

  /** Whenever it is CHIMERA's turn, play one move (recovers from engine stalls). */
  useEffect(() => {
    if (!sfReady || gameOver || chimeraThinking || chimeraTurnLockRef.current) return;
    if (state.turn !== chimeraColor) return;
    void runChimeraTurn(state);
  }, [
    sfReady,
    gameOver,
    chimeraThinking,
    chimeraColor,
    state.turn,
    positionFen,
    runChimeraTurn,
    state,
  ]);

  const applyUserMove = useCallback(
    async (move: Move) => {
      const fenBefore = toFen(state);
      const next = makeMove(state, move);
      if (!next) return;

      const uci = moveToUci(move);
      setState(next);
      setLastMove(move);
      setLastMoveSan(formatMove(state, move));
      setSelected(null);
      setLegalTargets([]);
      setPromotionPick(null);

      userMoveClockRef.current.recordMove();
      gameRef.current?.moves.push({
        uci,
        fen: toFen(next),
        by: "user",
        san: formatMove(state, move),
      });

      const st = getGameStatus(next);
      const isTerminal =
        st.type === "checkmate" ||
        st.type === "stalemate" ||
        st.type === "draw";

      const recordAnalysis = async () => {
        const analysisEngine = mistakeEngineRef.current;
        if (!analysisEngine?.ready) return;
        const fenAfter = toFen(next);
        pendingMistakeAnalysesRef.current += 1;
        try {
          const mistake = await analyzeUserMove(
            analysisEngine,
            fenBefore,
            fenAfter,
            uci,
            userColor,
            6
          );
          if (mistake && gameRef.current) {
            gameRef.current.mistakes.push(mistake);
          }
          setMemory((prev) => {
            const style = prev.userStyle ?? createPlayStyleProfile();
            const withStyle = {
              ...prev,
              userStyle: updateStyleFromMove(
                style,
                state,
                move,
                mistake?.cpLoss
              ),
            };
            const updated = refreshUserCognitiveIdentity(withStyle);
            saveMemory(updated);
            return updated;
          });
        } finally {
          pendingMistakeAnalysesRef.current -= 1;
        }
      };

      if (isTerminal) {
        void recordAnalysis();
        resolveGameEnd(next);
        return;
      }

      void recordAnalysis();
    },
    [state, runChimeraTurn, resolveGameEnd, userColor, chimeraColor]
  );

  const onPiecePress = useCallback(
    (sq: Square) => {
      if (!userTurn || chimeraThinking || gameOver || promotionPick) return;
      const piece = state.board[sq];
      if (!piece || piece.color !== userColor) return;
      if (selected === sq && legalTargets.length > 0) return;
      setSelected(sq);
      setLegalTargets(getLegalMoves(state, sq));
    },
    [
      userTurn,
      chimeraThinking,
      gameOver,
      promotionPick,
      state,
      userColor,
      selected,
      legalTargets.length,
    ]
  );

  const onSquareClick = (sq: Square) => {
    if (!userTurn || chimeraThinking || gameOver) return;
    if (promotionPick) return;

    const piece = state.board[sq];
    const targetMove = legalTargets.find((m) => m.to === sq);

    if (targetMove) {
      const promos = legalTargets.filter((m) => m.to === sq && m.promotion);
      if (promos.length > 1) {
        setPromotionPick({ from: selected!, to: sq });
        return;
      }
      void applyUserMove(promos[0] ?? targetMove);
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
    if (move) void applyUserMove(move);
  };

  const statusLabel = (() => {
    if (gameOver) return gameOver;
    if (chimeraThinking) return "CHIMERA is thinking…";
    switch (status.type) {
      case "check":
        return status.color === userColor
          ? "You are in check"
          : "CHIMERA is in check";
      case "checkmate":
        return status.winner === userColor ? "Checkmate — you win" : "Checkmate — CHIMERA wins";
      default:
        return userTurn
          ? `Your move (${userColor === "w" ? "White" : "Black"})`
          : `CHIMERA (${chimeraColor === "w" ? "White" : "Black"})`;
    }
  })();

  const colorBtnClass = (active: boolean) =>
    `rounded-sm px-3 py-1.5 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] uppercase transition-colors ${
      active
        ? "bg-[rgba(232,197,71,0.15)] text-gold-glow"
        : "text-[rgba(255,255,255,0.4)] hover:text-[rgba(255,255,255,0.7)]"
    }`;

  const dismissCrsPostGame = useCallback(() => {
    setMemory((prev) => {
      const next = clearCrsPostGame(prev);
      saveMemory(next);
      return next;
    });
  }, []);

  const reviewOpen =
    !!reviewInput || loading || !!report || !!reviewError;

  /** Skip CRS modal when review takes over; clear so it does not reappear after close. */
  useEffect(() => {
    if (!reviewOpen || !memory.crs?.lastPostGame) return;
    dismissCrsPostGame();
  }, [reviewOpen, memory.crs?.lastPostGame, dismissCrsPostGame]);

  return (
    <>
    {crsPostGame && !reviewOpen && (
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
      open={reviewOpen}
      memory={memory}
      storedGame={lastStoredGame}
      onClose={() => {
        dismiss();
        setReviewInput(null);
      }}
      onNewGame={() => {
        dismiss();
        setReviewInput(null);
        startNewGame();
      }}
    />
    <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-start lg:justify-center">
      <div className="flex w-full min-w-0 flex-col items-center gap-6">
        <div className="flex w-full min-w-0 max-w-[min(100%,32rem)] flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <CrsRatingCard crs={crs} delta={showEloDelta ? memory.lastEloChange : undefined} compact />
              <span className="font-[family-name:var(--font-hud)] text-[10px] text-[rgba(255,255,255,0.2)]">
                VS
              </span>
              <div className="flex flex-col items-center gap-1">
                <EloBadge
                  label="CHIMERA"
                  elo={chimeraElo}
                  sublabel={chimeraCalLabel}
                  delta={showEloDelta ? memory.lastChimeraEloChange : undefined}
                  variant="cyan"
                  size="md"
                />
                {chimeraIdentity && (
                  <p className="max-w-[120px] text-center font-[family-name:var(--font-hud)] text-[7px] leading-snug tracking-[0.12em] text-[rgba(0,229,255,0.55)]">
                    {chimeraIdentity.personaLabel?.split("·").pop()?.trim() ??
                      "Oracle"}
                    {chimeraSub ? ` · ${chimeraSub.label}` : ""}
                  </p>
                )}
                <p className="max-w-[140px] text-center font-[family-name:var(--font-hud)] text-[6px] tracking-[0.1em] text-[rgba(0,229,255,0.4)]">
                  {chimeraStrengthLabel(memory)}
                </p>
              </div>
            </div>
            <div>
              <p className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.25em] text-gold-glow uppercase">
                Rated match
              </p>
              <p className="mt-1 font-[family-name:var(--font-body)] text-[11px] text-[rgba(255,255,255,0.4)]">
                {statusLabel}
              </p>
              {openingHint && (
                <p className="mt-1 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.18em] text-[rgba(0,229,255,0.65)] uppercase">
                  {openingHint}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex rounded-sm border border-[rgba(232,197,71,0.15)] p-0.5"
              role="group"
              aria-label="Choose your color"
            >
              <button
                type="button"
                disabled={!canPickColor && userColor !== "w"}
                onClick={() => pickColor("w")}
                className={colorBtnClass(userColor === "w")}
              >
                White
              </button>
              <button
                type="button"
                disabled={!canPickColor && userColor !== "b"}
                onClick={() => pickColor("b")}
                className={colorBtnClass(userColor === "b")}
              >
                Black
              </button>
            </div>
            <span className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-[rgba(0,229,255,0.45)]">
              SF{STOCKFISH_VERSION}
            </span>
            <button
              type="button"
              onClick={startNewGame}
              disabled={chimeraThinking}
              className="nav-link rounded-sm px-3 py-1.5 text-[9px]"
            >
              New game
            </button>
          </div>
        </div>

        <div
          className={`relative isolate w-full min-w-0 max-w-[min(100%,calc(100vw-1.25rem),32rem)] rounded-sm transition-shadow duration-500 ${
            userTurn && !gameOver && !chimeraThinking
              ? "shadow-[0_0_48px_rgba(232,197,71,0.12)] ring-1 ring-[rgba(232,197,71,0.2)]"
              : "ring-1 ring-[rgba(255,255,255,0.04)]"
          }`}
        >
          {!sfReady && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center rounded-sm bg-[rgba(5,5,10,0.55)]">
              <span className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(0,229,255,0.8)]">
                Loading chess engine…
              </span>
            </div>
          )}
          {chimeraThinking && sfReady && (
            <div
              className="pointer-events-none absolute inset-0 z-10 rounded-sm bg-[rgba(0,229,255,0.06)]"
              aria-hidden
            />
          )}
          {userTurn && !gameOver && !chimeraThinking && (
            <div className="pointer-events-none absolute -top-8 left-0 right-0 z-20 text-center">
              <span className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.35em] text-[rgba(232,197,71,0.7)] uppercase">
                Your move
              </span>
            </div>
          )}
          {chimeraThinking && (
            <div className="pointer-events-none absolute -top-8 left-0 right-0 z-20 text-center">
              <span className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.35em] text-[rgba(0,229,255,0.75)] uppercase">
                {chimeraCodename} is calculating
              </span>
            </div>
          )}
          <ChessBoardGrid
            state={state}
            orientation={userColor}
            selected={selected}
            legalTargets={legalTargets}
            lastMove={lastMove}
            onSquareClick={onSquareClick}
            onPiecePress={onPiecePress}
            disabled={!userTurn || chimeraThinking || !!gameOver}
            thinkingColor={chimeraThinking ? chimeraColor : null}
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
      </div>

      <aside className="glass-panel w-full max-w-sm rounded-sm p-6 lg:sticky lg:top-28">
        <h3 className="font-[family-name:var(--font-display)] text-lg text-gold-glow">
          CHIMERA Memory
        </h3>
        <p className="mt-2 font-[family-name:var(--font-body)] text-xs leading-relaxed text-[rgba(255,255,255,0.45)]">
          Starts near <span className="text-[rgba(232,197,71,0.8)]">250 Elo</span> and
          remembers every game. Pick <span className="text-[rgba(232,197,71,0.8)]">White</span> or{" "}
          <span className="text-[rgba(232,197,71,0.8)]">Black</span> before the first move.
          {userColor === "w" ? (
            <>
              {" "}
              As White, meet CHIMERA&apos;s booked{" "}
              <span className="text-[rgba(0,229,255,0.75)]">
                {CHIMERA_SIGNATURE_OPENING.name}
              </span>{" "}
              after <span className="text-[rgba(0,229,255,0.75)]">1.e4</span>.
            </>
          ) : (
            <>
              {" "}
              As Black, CHIMERA opens from the engine — you can still steer into the Scandinavian.
            </>
          )}
        </p>

        <div className="mt-6 border-t border-[rgba(232,197,71,0.08)] pt-5">
          <ChimeraLearningPanel memory={memory} />
        </div>

        <div className="mt-6 border-t border-[rgba(232,197,71,0.08)] pt-5">
          <CognitiveArchetypePanel memory={memory} />
        </div>

        <div className="mt-6 flex justify-center border-y border-[rgba(232,197,71,0.08)] py-6">
          <ChimeraMemoryRadar
            title="Your play style"
            elo={userElo}
            axes={userStyleToRadar(memory)}
            accent="gold"
            subtitle="How you play — not how often"
          />
        </div>

        <p className="text-center font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.35)]">
          {memory.stats.userWins}W · {memory.stats.chimeraWins}L · {memory.stats.draws}D
        </p>

        {topPatterns.length > 0 && (
          <div className="mt-6 border-t border-[rgba(232,197,71,0.1)] pt-4">
            <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.35em] text-[rgba(0,229,255,0.5)] uppercase">
              Your common errors
            </p>
            <ul className="mt-3 space-y-2">
              {topPatterns.map((p) => (
                <li
                  key={`${p.positionKey}-${p.typicalBadMove}`}
                  className="font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.4)]"
                >
                  <span className="text-[rgba(232,197,71,0.7)]">×{p.occurrences}</span>{" "}
                  plays {p.typicalBadMove} — CHIMERA refutes with {p.refutation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {!sfReady && (
          <p className="mt-4 text-[10px] text-[rgba(255,255,255,0.25)]">
            Preparing engine…
          </p>
        )}
      </aside>
    </div>
    </>
  );
}
