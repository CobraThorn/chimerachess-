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
  targetChimeraElo,
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
import ChimeraCalibrationMath from "./ChimeraCalibrationMath";
import ChessBoardGrid from "./ChessBoardGrid";
import ChessPiece from "./ChessPiece";
import CognitiveArchetypePanel from "./CognitiveArchetypePanel";
import EloBadge from "./EloBadge";
import type {
  ChimeraMemory,
  GameMoveRecord,
  GameTerminationReason,
  MistakeRecord,
  StoredGame,
} from "../../ai";
import {
  CHIMERA_RESIGN_TERMINATION,
  logChimeraEngineFailure,
  logChimeraRecoveryAttempt,
  MAX_CHIMERA_MOVE_ATTEMPTS,
  type ChimeraFailureReason,
} from "../../ai/chimeraEngineFailure";
import { gameMovesToPgn } from "../../chess/pgn";
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
import { reviewDiag } from "../../review/reviewDiagnostics";
import { useGameReview } from "../../hooks/useGameReview";
import { watchReviewEngineReady } from "../../review/reviewEngineBoot";
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
  const chimeraFailedAttemptsRef = useRef(0);
  const gameOverRef = useRef<string | null>(null);
  gameOverRef.current = gameOver;

  const CHIMERA_MOVE_TIMEOUT_MS = 28_000;
  const CHIMERA_TURN_WATCHDOG_MS = 42_000;

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

  const releasePlayEngines = useCallback(() => {
    const play = engineRef.current;
    const mistake = mistakeEngineRef.current;
    play?.stop();
    mistake?.stop();
    void play?.quit();
    if (mistake && mistake !== play) void mistake.quit();
    engineRef.current = null;
    mistakeEngineRef.current = null;
    setSfReady(false);
  }, []);

  const waitEngineReady = useCallback(
    async (engine: StockfishEngine, ms = 14_000): Promise<boolean> => {
      const deadline = Date.now() + ms;
      while (Date.now() < deadline) {
        if (engine.ready) return true;
        if (engine.loadFailed) return false;
        await new Promise((r) => setTimeout(r, 80));
      }
      return false;
    },
    []
  );

  const rebootPlayEngine = useCallback(async (): Promise<boolean> => {
    engineRef.current?.stop();
    void engineRef.current?.quit();
    const engine = createStockfishEngine();
    engineRef.current = engine;
    const ok = await waitEngineReady(engine);
    setSfReady(ok);
    return ok;
  }, [waitEngineReady]);

  const bootPlayEngines = useCallback(() => {
    let engine = engineRef.current;
    let mistakeEngine = mistakeEngineRef.current;
    let createdPlay = false;
    let createdMistake = false;

    if (!engine || engine.loadFailed) {
      engine = createStockfishEngine();
      engineRef.current = engine;
      createdPlay = true;
    }
    if (!mistakeEngine || mistakeEngine.loadFailed) {
      mistakeEngine = createStockfishEngine();
      mistakeEngineRef.current = mistakeEngine;
      createdMistake = true;
    }

    const play = engine;
    const mistake = mistakeEngine;

    const onVisibility = () => {
      if (document.hidden) {
        play.stop();
        mistake.stop();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    const t = setInterval(() => {
      if (play.ready) {
        setSfReady(true);
        clearInterval(t);
      }
      if (play.loadFailed) {
        setSfReady(false);
        clearInterval(t);
      }
    }, 100);

    return () => {
      clearInterval(t);
      document.removeEventListener("visibilitychange", onVisibility);
      if (createdPlay) {
        play.stop();
        void play.quit();
        if (engineRef.current === play) engineRef.current = null;
      }
      if (createdMistake) {
        mistake.stop();
        void mistake.quit();
        if (mistakeEngineRef.current === mistake) mistakeEngineRef.current = null;
      }
      if (!engineRef.current?.ready) setSfReady(false);
    };
  }, []);

  const startNewGame = useCallback(() => {
    chimeraTurnLockRef.current = false;
    setChimeraThinking(false);
    chimeraFailedAttemptsRef.current = 0;
    pendingMistakeAnalysesRef.current = 0;

    const init = createInitialState();
    setState(init);
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    setLastMoveSan(null);
    setPromotionPick(null);
    gameOverRef.current = null;
    setGameOver(null);
    setReviewInput(null);
    setLastStoredGame(null);
    dismiss();
    userMoveClockRef.current = createUserMoveClock();
    userMoveClockRef.current.markTurnStart();
    playedChimeraEloRef.current = effectiveChimeraElo(loadMemory());
    if (engineRef.current?.ready) setSfReady(true);
    gameRef.current = {
      id: crypto.randomUUID(),
      moves: [],
      mistakes: [],
      startedAt: Date.now(),
      userMoveTimesMs: userMoveClockRef.current.times,
    };
  }, [dismiss]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount only
  }, []);

  useEffect(() => {
    if (!reviewInput) return;

    const input = reviewInput;
    reviewDiag("trigger", {
      gameId: input.id,
      moves: input.moves.length,
      userColor: input.userColor,
    });

    releasePlayEngines();
    pendingMistakeAnalysesRef.current = 0;

    const engine = createStockfishEngine();
    reviewEngineRef.current = engine;
    let cancelled = false;

    const stopWatch = watchReviewEngineReady(
      engine,
      () => {
        if (cancelled) return;
        void acquireSharedTorch().then((torch) => {
          if (!cancelled) void runReview(engine, input, torch);
        });
      },
      () => {
        if (!cancelled) {
          failReview(
            "Stockfish did not start in time — refresh the page and try again."
          );
        }
      },
      () => {
        if (!cancelled) {
          failReview(
            "Stockfish failed to load — refresh the page and try again."
          );
        }
      }
    );

    return () => {
      cancelled = true;
      stopWatch();
      abortReview();
      engine.stop();
      engine.quit();
      reviewEngineRef.current = null;
    };
  }, [
    reviewInput?.id,
    releasePlayEngines,
    runReview,
    abortReview,
    failReview,
  ]);

  useEffect(() => {
    const onMemoryUpdate = () => setMemory(loadMemory());
    window.addEventListener(CHIMERA_MEMORY_EVENT, onMemoryUpdate);
    return () =>
      window.removeEventListener(CHIMERA_MEMORY_EVENT, onMemoryUpdate);
  }, []);

  const persistFinishedGame = useCallback(
    (
      result: StoredGame["result"],
      meta?: { terminationReason?: GameTerminationReason }
    ) => {
      const g = gameRef.current;
      if (!g) return;
      if (
        g.moves.length < 1 &&
        meta?.terminationReason !== CHIMERA_RESIGN_TERMINATION
      ) {
        return;
      }

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
        const moves =
          live?.id === g.id ? [...live.moves] : snapshotMoves;
        const stored: StoredGame = {
          id: g.id,
          startedAt: g.startedAt,
          endedAt,
          userColor,
          moves,
          mistakes,
          result,
          openingLine: moves
            .slice(0, 6)
            .map((m) => m.uci)
            .join(" "),
          userMoveTimesMs: [...g.userMoveTimesMs],
          terminationReason: meta?.terminationReason,
          pgn: gameMovesToPgn(moves, userColor, result, {
            terminationReason: meta?.terminationReason,
          }),
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
          terminationReason: meta?.terminationReason ?? "checkmate",
        });
        gameRef.current = null;
      })();
    },
    [userColor]
  );

  const handleChimeraResign = useCallback(
    (reason: ChimeraFailureReason, detail?: Record<string, string | number | boolean>) => {
      if (gameOverRef.current) return;

      logChimeraEngineFailure(reason, {
        gameId: gameRef.current?.id ?? "",
        moves: gameRef.current?.moves.length ?? 0,
        ...detail,
      });

      chimeraTurnLockRef.current = false;
      setChimeraThinking(false);
      pendingMistakeAnalysesRef.current = 0;
      engineRef.current?.stop();
      mistakeEngineRef.current?.stop();
      chimeraFailedAttemptsRef.current = 0;

      const message = "Chimera resigns — You win";
      gameOverRef.current = message;
      setGameOver(message);
      persistFinishedGame("user-win", {
        terminationReason: CHIMERA_RESIGN_TERMINATION,
      });
    },
    [persistFinishedGame]
  );

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
        persistFinishedGame(userWon ? "user-win" : "chimera-win", {
          terminationReason: "checkmate",
        });
      } else if (st.type === "stalemate" || st.type === "draw") {
        setGameOver("Draw — full game review loading…");
        persistFinishedGame("draw", {
          terminationReason: st.type === "stalemate" ? "stalemate" : "draw",
        });
      }
    },
    [persistFinishedGame, userColor]
  );

  const memoryRef = useRef(memory);
  memoryRef.current = memory;

  const selectedRef = useRef(selected);
  const legalTargetsRef = useRef(legalTargets);
  selectedRef.current = selected;
  legalTargetsRef.current = legalTargets;

  const resolveChimeraMoveFromUci = useCallback(
    (current: GameState, uci: string): { move: Move; uci: string } | null => {
      const move = resolveBotMove(current, uci);
      if (move) return { move, uci };
      const fallbackUci = pickFallbackUci(current);
      if (!fallbackUci) return null;
      const fallbackMove = resolveBotMove(current, fallbackUci);
      return fallbackMove ? { move: fallbackMove, uci: fallbackUci } : null;
    },
    []
  );

  const tryResolveChimeraMove = useCallback(
    async (
      engine: StockfishEngine,
      current: GameState
    ): Promise<{ move: Move; uci: string } | null> => {
      try {
        const uci = await Promise.race([
          getChimeraMove(engine, current, chimeraColor, memoryRef.current, {
            mirror: false,
            archetype: memoryRef.current.chimeraOpponentIdentity,
          }),
          new Promise<string | null>((resolve) => {
            window.setTimeout(() => resolve(null), CHIMERA_MOVE_TIMEOUT_MS);
          }),
        ]);

        if (uci) {
          const resolved = resolveChimeraMoveFromUci(current, uci);
          if (resolved) return resolved;
        }
      } catch {
        /* engine threw — fall through to random legal move */
      }

      const fallback = pickFallbackUci(current);
      return fallback ? resolveChimeraMoveFromUci(current, fallback) : null;
    },
    [chimeraColor, resolveChimeraMoveFromUci]
  );

  const runChimeraTurn = useCallback(
    async (current: GameState) => {
      if (gameOverRef.current || current.turn !== chimeraColor) return;
      if (chimeraTurnLockRef.current) return;

      const terminal = getGameStatus(current);
      if (terminal.type !== "ongoing") {
        resolveGameEnd(current);
        return;
      }

      let engine = engineRef.current;
      if (!engine || engine.loadFailed) {
        logChimeraRecoveryAttempt(1, "boot_play_engine");
        const ok = await rebootPlayEngine();
        if (!ok) {
          const fallback = pickFallbackUci(current);
          const move = fallback ? resolveBotMove(current, fallback) : null;
          if (move) {
            const next = makeMove(current, move);
            if (next) {
              setState(next);
              setLastMove(move);
              setLastMoveSan(formatMove(current, move));
              gameRef.current?.moves.push({
                uci: moveToUci(move),
                fen: toFen(next),
                by: "chimera",
                san: formatMove(current, move),
              });
              resolveGameEnd(next);
            }
          } else {
            handleChimeraResign("engine_load_failed", {
              loadFailed: engine?.loadFailed ? 1 : 0,
            });
          }
          return;
        }
        engine = engineRef.current!;
      } else if (!engine.ready) {
        logChimeraRecoveryAttempt(1, "wait_play_engine_ready");
        const ok = await waitEngineReady(engine);
        if (!ok) {
          const rebooted = await rebootPlayEngine();
          if (!rebooted) {
            handleChimeraResign("engine_not_ready", { waitedMs: 14_000 });
            return;
          }
          engine = engineRef.current!;
        }
      }

      chimeraTurnLockRef.current = true;
      setChimeraThinking(true);
      const thinkStart = Date.now();
      let resigned = false;

      const thinkWatchdog = window.setTimeout(() => {
        resigned = true;
        handleChimeraResign("watchdog_timeout", { ms: CHIMERA_TURN_WATCHDOG_MS });
      }, CHIMERA_TURN_WATCHDOG_MS);

      try {
        pendingMistakeAnalysesRef.current = 0;

        let resolved: { move: Move; uci: string } | null = null;

        for (let attempt = 1; attempt <= MAX_CHIMERA_MOVE_ATTEMPTS; attempt++) {
          if (gameOverRef.current || resigned) return;

          if (attempt === 2) {
            logChimeraRecoveryAttempt(2, "engine_stop_and_retry");
            engine.stop();
            mistakeEngineRef.current?.stop();
          } else if (attempt === 3) {
            logChimeraRecoveryAttempt(3, "reboot_play_engine");
            const ok = await rebootPlayEngine();
            if (!ok) break;
            engine = engineRef.current!;
          }

          resolved = await tryResolveChimeraMove(engine, current);
          if (resolved) {
            chimeraFailedAttemptsRef.current = 0;
            break;
          }
          chimeraFailedAttemptsRef.current += 1;
        }

        if (!resolved && !gameOverRef.current && !resigned) {
          const fallback = pickFallbackUci(current);
          if (fallback) {
            const move = resolveBotMove(current, fallback);
            if (move) resolved = { move, uci: fallback };
          }
        }

        if (!resolved || gameOverRef.current || resigned) {
          handleChimeraResign(
            chimeraFailedAttemptsRef.current >= 2
              ? "repeated_failed_move"
              : "recovery_exhausted",
            { attempts: MAX_CHIMERA_MOVE_ATTEMPTS }
          );
          return;
        }

        await waitAtLeast(thinkStart, CHIMERA_MIN_THINK_MS);
        if (gameOverRef.current || resigned) return;

        let next = makeMove(current, resolved.move);
        if (!next) {
          const fallback = pickFallbackUci(current);
          const fallbackMove = fallback
            ? resolveBotMove(current, fallback)
            : null;
          if (fallbackMove) {
            next = makeMove(current, fallbackMove);
            resolved = { move: fallbackMove, uci: fallback! };
          }
        }
        if (!next) {
          handleChimeraResign("apply_move_failed", {
            uci: resolved.uci,
          });
          return;
        }

        const playedUci = moveToUci(resolved.move);
        setState(next);
        setLastMove(resolved.move);
        setLastMoveSan(formatMove(current, resolved.move));

        gameRef.current?.moves.push({
          uci: playedUci,
          fen: toFen(next),
          by: "chimera",
          san: formatMove(current, resolved.move),
        });

        setMemory((prev) => {
          const opp =
            prev.chimeraOpponent ?? createPersonaPlayStyle("opponent");
          return refreshOpponentCognitiveIdentity({
            ...prev,
            chimeraOpponent: updateStyleFromMove(opp, current, resolved.move),
          });
        });

        resolveGameEnd(next);
      } catch {
        const fallback = pickFallbackUci(current);
        const move = fallback ? resolveBotMove(current, fallback) : null;
        const next = move ? makeMove(current, move) : null;
        if (next && move) {
          setState(next);
          setLastMove(move);
          setLastMoveSan(formatMove(current, move));
          gameRef.current?.moves.push({
            uci: moveToUci(move),
            fen: toFen(next),
            by: "chimera",
            san: formatMove(current, move),
          });
          resolveGameEnd(next);
        } else {
          handleChimeraResign("recovery_exhausted", { phase: "exception" });
        }
      } finally {
        window.clearTimeout(thinkWatchdog);
        chimeraTurnLockRef.current = false;
        if (!gameOverRef.current) setChimeraThinking(false);
      }
    },
    [
      resolveGameEnd,
      chimeraColor,
      handleChimeraResign,
      rebootPlayEngine,
      tryResolveChimeraMove,
      waitEngineReady,
    ]
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
        if (chimeraTurnLockRef.current) return;
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

  const onSquareClick = useCallback(
    (sq: Square) => {
      if (!userTurn || chimeraThinking || gameOver) return;
      if (promotionPick) return;

      const piece = state.board[sq];
      const legal = legalTargetsRef.current;
      const sel = selectedRef.current;
      const targetMove = legal.find((m) => m.to === sq);

      if (targetMove) {
        const promos = legal.filter((m) => m.to === sq && m.promotion);
        if (promos.length > 1) {
          setPromotionPick({ from: sel!, to: sq });
          return;
        }
        void applyUserMove(promos[0] ?? targetMove);
        return;
      }

      if (piece && piece.color === userColor) {
        if (sel === sq && legal.length > 0) return;
        setSelected(sq);
        setLegalTargets(getLegalMoves(state, sq));
        return;
      }

      setSelected(null);
      setLegalTargets([]);
    },
    [
      userTurn,
      chimeraThinking,
      gameOver,
      promotionPick,
      state,
      userColor,
      applyUserMove,
    ]
  );

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

  useEffect(() => {
    if (reviewOpen) return;
    return bootPlayEngines();
  }, [reviewOpen, bootPlayEngines]);

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
        onContinue={() => {
          dismissCrsPostGame();
          if (gameOver) startNewGame();
        }}
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
        if (gameOver) startNewGame();
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

        {showEloDelta && memory.lastCalibrationMath && (
          <div className="mt-4 w-full max-w-[min(100%,32rem)]">
            <ChimeraCalibrationMath math={memory.lastCalibrationMath} />
          </div>
        )}
      </div>

      <aside className="glass-panel w-full max-w-sm rounded-sm p-6 lg:sticky lg:top-28">
        {memory.chimeraCalibration && (
          <p className="mb-4 font-[family-name:var(--font-body)] text-[10px] text-[rgba(255,255,255,0.4)]">
            Perceived you:{" "}
            <span className="text-gold-glow">
              {memory.chimeraCalibration.perceivedUserElo}
            </span>{" "}
            · Target R<sub>c</sub>:{" "}
            <span className="text-[rgba(0,229,255,0.75)]">
              {targetChimeraElo(memory.chimeraCalibration.perceivedUserElo)}
            </span>
          </p>
        )}
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
