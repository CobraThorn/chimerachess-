import { AnimatePresence, motion } from "framer-motion";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createInitialState,
  formatMove,
  getLegalMoves,
  makeMove,
  PROMOTION_PIECES,
} from "../../chess";
import type { GameState, Move, PieceType, Square } from "../../chess";
import type { OpeningLine } from "../../content/openings";
import {
  countUserMoves,
  isUserMoveIndex,
} from "../../content/openings";
import { useCustomisation } from "../../customisation";
import { logDataEvent } from "../../account/events";
import { loadMemory } from "../../ai/memory";
import { buildCognitiveMap } from "../../cognition/buildCognitiveMap";
import type { CognitiveOverlayMode } from "../../cognition/cognitiveState";
import {
  createTiltSession,
  detectTilt,
  recordMove,
  recordWrongAttempt,
  type TiltSession,
} from "../../cognition/tiltDetector";
import { useOpeningCoach } from "../../hooks/useOpeningCoach";
import BoardAnnotations from "../chess/BoardAnnotations";
import CognitiveBoardOverlay from "../chess/CognitiveBoardOverlay";
import ChessBoardGrid from "../chess/ChessBoardGrid";
import ChessPiece from "../chess/ChessPiece";
import CognitiveStateLegend from "./CognitiveStateLegend";
import OpeningCoachPanel from "./OpeningCoachPanel";
import { applyUciLine, findBookMove, isBookMove } from "./openingUtils";

interface OpeningDrillProps {
  opening: OpeningLine;
  onBack: () => void;
}

export default function OpeningDrill({ opening, onBack }: OpeningDrillProps) {
  const { pieceSet } = useCustomisation();
  const [state, setState] = useState<GameState>(createInitialState);
  const [playedCount, setPlayedCount] = useState(0);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Move[]>([]);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [promotionPick, setPromotionPick] = useState<{
    from: Square;
    to: Square;
  } | null>(null);
  const [hint, setHint] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userMoveIndex, setUserMoveIndex] = useState(0);
  const [opponentBusy, setOpponentBusy] = useState(false);
  const [focusPly, setFocusPly] = useState(-1);
  const [manualFocus, setManualFocus] = useState(false);
  const [showCognitiveMap, setShowCognitiveMap] = useState(true);
  const [showArrows, setShowArrows] = useState(true);
  const [overlayMode, setOverlayMode] =
    useState<CognitiveOverlayMode>("cognitive");
  const [tiltSession, setTiltSession] = useState<TiltSession>(createTiltSession);
  const [masteredPlies, setMasteredPlies] = useState<Set<number>>(
    () => new Set()
  );
  const [wrongPerPly, setWrongPerPly] = useState<Record<number, number>>({});
  const [lastWrongSquares, setLastWrongSquares] = useState<Square[]>([]);
  const [drillClock, setDrillClock] = useState(180);

  const stateRef = useRef(state);
  const playedRef = useRef(playedCount);
  const autoplayGen = useRef(0);
  stateRef.current = state;
  playedRef.current = playedCount;

  const totalUserMoves = countUserMoves(opening);
  const lineDone = playedCount >= opening.moves.length;
  const userTurn =
    !lineDone && isUserMoveIndex(playedCount, opening.userColor);
  const expectedUci = userTurn ? opening.moves[playedCount] : null;

  const orientation = opening.userColor;
  const currentTip = opening.userTips[userMoveIndex] ?? null;

  const coachPly =
    focusPly >= 0 && focusPly < opening.moves.length
      ? focusPly
      : focusPly < 0
        ? -1
        : opening.moves.length - 1;

  const { insight, loading: coachLoading, error: coachError, refresh } =
    useOpeningCoach(opening, coachPly);

  useEffect(() => {
    if (!userTurn || lineDone) return;
    const id = window.setInterval(() => {
      setDrillClock((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [userTurn, lineDone]);

  useEffect(() => {
    if (manualFocus) return;
    if (lineDone) {
      setFocusPly(opening.moves.length - 1);
      return;
    }
    if (playedCount === 0) {
      setFocusPly(-1);
      return;
    }
    setFocusPly(userTurn ? playedCount : playedCount - 1);
  }, [playedCount, userTurn, lineDone, manualFocus, opening.moves.length]);

  const boardState = useMemo(() => {
    if (!manualFocus && focusPly < 0) return state;
    if (!manualFocus && focusPly >= playedCount - 1 && focusPly >= 0) {
      return state;
    }
    if (focusPly < 0) return state;
    return applyUciLine(opening.moves.slice(0, focusPly + 1));
  }, [manualFocus, focusPly, playedCount, state, opening.moves]);

  const reviewing =
    manualFocus && focusPly >= 0 && focusPly < playedCount - 1;

  const tilt = useMemo(() => detectTilt(tiltSession), [tiltSession]);

  const cognitiveMap = useMemo(
    () =>
      buildCognitiveMap({
        state: boardState,
        perspective: opening.userColor,
        overlayMode,
        opening,
        focusPly: coachPly,
        isBookLine: coachPly >= 0 && coachPly < opening.moves.length,
        masteredPlies,
        wrongSquares: lastWrongSquares,
        clockSeconds: drillClock,
        patterns: loadMemory().patterns,
        tilt,
      }),
    [
      boardState,
      opening,
      overlayMode,
      coachPly,
      masteredPlies,
      lastWrongSquares,
      drillClock,
      tilt,
    ]
  );

  const expectedMove = useMemo(() => {
    if (!expectedUci) return null;
    return findBookMove(boardState, expectedUci);
  }, [boardState, expectedUci]);

  const trainerHighlight = useMemo(() => {
    if (!expectedMove) return null;
    if (hint || userTurn) {
      return { from: expectedMove.from, to: expectedMove.to };
    }
    return null;
  }, [hint, expectedMove, userTurn]);

  const fullMoveLabels = useMemo(() => {
    const labels: string[] = [];
    let s = createInitialState();
    for (const uci of opening.moves) {
      const m = findBookMove(s, uci);
      if (!m) break;
      labels.push(formatMove(s, m));
      const next = makeMove(s, m);
      if (!next) break;
      s = next;
    }
    return labels;
  }, [opening.moves]);

  const resetLine = useCallback(() => {
    autoplayGen.current += 1;
    setOpponentBusy(false);
    setState(createInitialState());
    setPlayedCount(0);
    setSelected(null);
    setLegalTargets([]);
    setLastMove(null);
    setPromotionPick(null);
    setHint(false);
    setFeedback(null);
    setUserMoveIndex(0);
    setFocusPly(-1);
    setManualFocus(false);
    setTiltSession(createTiltSession());
    setMasteredPlies(new Set());
    setWrongPerPly({});
    setLastWrongSquares([]);
    setDrillClock(180);
  }, []);

  useEffect(() => {
    resetLine();
  }, [opening.id, resetLine]);

  useEffect(() => {
    logDataEvent("opening_drill", { opening: opening.id });
  }, [opening.id]);

  const selectCoachPly = (ply: number) => {
    setManualFocus(true);
    setFocusPly(ply);
  };

  const primeUserTurn = useCallback(() => {
    if (!expectedUci) return;
    const book = findBookMove(stateRef.current, expectedUci);
    if (!book) return;
    setSelected(book.from);
    setLegalTargets([book]);
    setFeedback(null);
  }, [expectedUci]);

  useEffect(() => {
    if (userTurn && expectedUci) {
      primeUserTurn();
    } else if (!userTurn) {
      setSelected(null);
      setLegalTargets([]);
    }
  }, [userTurn, expectedUci, playedCount, primeUserTurn]);

  useEffect(() => {
    if (lineDone || userTurn) {
      setOpponentBusy(false);
      return;
    }

    const gen = ++autoplayGen.current;
    const uci = opening.moves[playedCount];
    setOpponentBusy(true);
    setFeedback(null);

    const timer = window.setTimeout(() => {
      if (gen !== autoplayGen.current) return;
      const s = stateRef.current;
      const idx = playedRef.current;
      if (idx >= opening.moves.length || opening.moves[idx] !== uci) return;

      const move = findBookMove(s, uci);
      if (!move) {
        setOpponentBusy(false);
        setFeedback(`Engine line stuck at ${uci} — reset and try again.`);
        return;
      }
      const next = makeMove(s, move);
      if (!next) {
        setOpponentBusy(false);
        setFeedback(`Could not play ${uci} — reset and try again.`);
        return;
      }
      stateRef.current = next;
      setState(next);
      setLastMove(move);
      setPlayedCount(idx + 1);
      setOpponentBusy(false);
    }, 420);

    return () => {
      clearTimeout(timer);
      if (gen === autoplayGen.current) {
        setOpponentBusy(false);
      }
    };
  }, [lineDone, userTurn, playedCount, opening.id, opening.moves]);

  const advanceUserMove = useCallback(
    (move: Move) => {
      if (!expectedUci) return;
      const s = stateRef.current;
      if (!isBookMove(s, expectedUci, move)) return;
      const next = makeMove(s, move);
      if (!next) return;
      stateRef.current = next;
      setState(next);
      setLastMove(move);
      setPlayedCount((c) => c + 1);
      setUserMoveIndex((i) => i + 1);
      setSelected(null);
      setLegalTargets([]);
      setPromotionPick(null);
      setHint(false);
      setFeedback(null);
      setLastWrongSquares([]);
      setTiltSession((s) => recordMove(s));
      const ply = playedRef.current;
      if (!wrongPerPly[ply]) {
        setMasteredPlies((prev) => new Set(prev).add(ply));
      }
    },
    [expectedUci, wrongPerPly]
  );

  const tryPlayBookMove = useCallback(
    (sq: Square): boolean => {
      if (!userTurn || !expectedUci) return false;
      const book = findBookMove(stateRef.current, expectedUci);
      if (!book) return false;

      if (sq === book.to) {
        const promos = getLegalMoves(stateRef.current, book.from).filter(
          (m) => m.to === book.to && m.promotion
        );
        if (promos.length > 1) {
          setPromotionPick({ from: book.from, to: book.to });
          setLegalTargets(promos);
          setSelected(book.from);
          return true;
        }
        advanceUserMove(book);
        return true;
      }

      if (sq === book.from) {
        setSelected(book.from);
        setLegalTargets([book]);
        return true;
      }

      return false;
    },
    [userTurn, expectedUci, advanceUserMove]
  );

  const onSquareClick = (sq: Square) => {
    if (lineDone || !userTurn || promotionPick || opponentBusy) return;

    if (tryPlayBookMove(sq)) return;

    const targetMove = legalTargets.find((m) => m.to === sq);

    if (targetMove) {
      if (!expectedUci || !isBookMove(state, expectedUci, targetMove)) {
        setFeedback("Not the book move — tap the highlighted square or use Hint.");
        setTiltSession((s) => recordWrongAttempt(s));
        setWrongPerPly((w) => ({
          ...w,
          [playedCount]: (w[playedCount] ?? 0) + 1,
        }));
        if (expectedMove) {
          setLastWrongSquares([expectedMove.from, expectedMove.to]);
        }
        return;
      }
      const promos = legalTargets.filter((m) => m.to === sq && m.promotion);
      if (promos.length > 1) {
        setPromotionPick({ from: selected ?? targetMove.from, to: sq });
        return;
      }
      advanceUserMove(promos[0] ?? targetMove);
      return;
    }

    const piece = state.board[sq];
    if (piece && piece.color === state.turn) {
      setSelected(sq);
      const book = expectedUci
        ? findBookMove(state, expectedUci)
        : null;
      if (book && book.from === sq) {
        setLegalTargets([book]);
      } else {
        setLegalTargets(getLegalMoves(state, sq));
        setFeedback("Select the highlighted piece for this line.");
      }
      return;
    }

    setSelected(null);
    setLegalTargets([]);
  };

  const onPromotion = (type: PieceType) => {
    if (!promotionPick || !expectedUci) return;
    const move = legalTargets.find(
      (m) => m.to === promotionPick.to && m.promotion === type
    );
    if (move && isBookMove(state, expectedUci, move)) {
      advanceUserMove(move);
    }
  };

  const playBookMoveButton = () => {
    if (!expectedUci) return;
    const book = findBookMove(state, expectedUci);
    if (book) advanceUserMove(book);
  };

  const progressPct =
    totalUserMoves > 0 ? Math.round((userMoveIndex / totalUserMoves) * 100) : 0;

  const boardDisabled =
    reviewing || lineDone || !userTurn || opponentBusy;

  const coachArrows = insight?.arrows ?? [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-sm border border-[rgba(232,197,71,0.12)] bg-[rgba(5,5,12,0.5)] p-6 md:p-8"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="nav-link mb-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em]"
          >
            ← All openings
          </button>
          <h3 className="font-[family-name:var(--font-display)] text-xl text-gold-glow">
            {opening.name}
          </h3>
          <p className="mt-1 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.25em] text-[rgba(0,229,255,0.55)]">
            {opening.eco} · You play {opening.userColor === "w" ? "White" : "Black"}
          </p>
          <p className="mt-2 max-w-md font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
            {opening.tagline}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setHint((h) => !h)}
            className={`rounded-sm px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] ${
              hint
                ? "border border-[rgba(232,197,71,0.45)] text-gold-glow"
                : "text-[rgba(255,255,255,0.35)]"
            }`}
          >
            {hint ? "Hide hint" : "Hint"}
          </button>
          <button
            type="button"
            onClick={resetLine}
            className="nav-link rounded-sm px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em]"
          >
            Reset line
          </button>
        </div>
      </div>

      <div className="mb-4 h-1 overflow-hidden rounded-full bg-[rgba(255,255,255,0.06)]">
        <motion.div
          className="h-full bg-gradient-to-r from-[rgba(0,229,255,0.5)] to-[rgba(232,197,71,0.6)]"
          animate={{ width: `${lineDone ? 100 : progressPct}%` }}
          transition={{ duration: 0.35 }}
        />
      </div>

      <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:justify-center">
        <div className="relative flex w-full min-w-0 justify-center">
          <div className="relative w-full min-w-0 max-w-[min(100%,calc(100vw-1.25rem),32rem)]">
            <ChessBoardGrid
              state={boardState}
              orientation={orientation}
              selected={reviewing ? null : selected}
              legalTargets={reviewing ? [] : legalTargets}
              lastMove={reviewing ? null : lastMove}
              onSquareClick={reviewing ? undefined : onSquareClick}
              disabled={boardDisabled}
              engineHighlight={reviewing ? null : trainerHighlight}
            />
            <CognitiveBoardOverlay
              orientation={orientation}
              cells={cognitiveMap.cells}
              show={showCognitiveMap}
              tiltPulse={!!tilt?.active && tilt.severity === "tilt"}
            />
            <BoardAnnotations
              orientation={orientation}
              arrows={coachArrows}
              showArrows={showArrows}
            />
          </div>
          {reviewing && (
            <p className="absolute -bottom-6 left-0 right-0 text-center font-[family-name:var(--font-hud)] text-[7px] tracking-[0.15em] text-[rgba(0,229,255,0.55)]">
              Reviewing move {focusPly + 1} — resume live line to continue
            </p>
          )}
          {opponentBusy && (
            <div
              className="pointer-events-none absolute inset-2 flex items-end justify-center rounded-sm pb-3"
              aria-hidden
            >
              <span className="rounded-sm bg-[rgba(5,5,12,0.85)] px-3 py-1 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(0,229,255,0.7)]">
                Opponent playing…
              </span>
            </div>
          )}
          <AnimatePresence>
            {promotionPick && userTurn && (
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

        <div className="flex w-full max-w-md flex-col gap-4">
        <CognitiveStateLegend
          map={cognitiveMap}
          overlayMode={overlayMode}
          onModeChange={setOverlayMode}
          showMap={showCognitiveMap}
          onToggleMap={() => setShowCognitiveMap((v) => !v)}
        />

        <OpeningCoachPanel
          insight={insight}
          loading={coachLoading}
          error={coachError}
          focusPly={coachPly}
          totalPlies={opening.moves.length}
          showArrows={showArrows}
          onToggleArrows={() => setShowArrows((v) => !v)}
          onRefresh={() => void refresh()}
          onSelectPly={selectCoachPly}
          moveLabels={fullMoveLabels}
          cognitiveHeadline={cognitiveMap.headline}
        />

        <div className="space-y-4">
          <div className="glass-panel rounded-sm p-4">
            <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(0,229,255,0.5)]">
              YOUR MOVE
            </p>
            {lineDone ? (
              <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-gold-glow">
                Line complete
              </p>
            ) : userTurn ? (
              <>
                <p className="mt-2 font-[family-name:var(--font-display)] text-lg text-white">
                  {userMoveIndex + 1} of {totalUserMoves}
                </p>
                {expectedMove && (
                  <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.4)]">
                    Tap {formatMove(state, expectedMove)} — gold/cyan squares show
                    from and to
                  </p>
                )}
                {expectedUci && (
                  <button
                    type="button"
                    onClick={playBookMoveButton}
                    className="mt-3 w-full rounded-sm border border-[rgba(232,197,71,0.25)] py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-gold-glow transition-colors hover:border-[rgba(232,197,71,0.45)]"
                  >
                    Play {expectedUci.slice(0, 2)}→{expectedUci.slice(2, 4)}
                  </button>
                )}
              </>
            ) : (
              <p className="mt-2 font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.45)]">
                {opponentBusy ? "Opponent responding…" : "Waiting…"}
              </p>
            )}
            {feedback && (
              <p className="mt-2 font-[family-name:var(--font-body)] text-xs text-[rgba(255,100,100,0.85)]">
                {feedback}
              </p>
            )}
          </div>

          {lineDone && (
            <div className="rounded-sm border border-[rgba(0,229,255,0.2)] bg-[rgba(0,229,255,0.05)] p-4">
              <p className="font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.55)]">
                You&apos;ve played the main line. Reset to drill again or pick another opening.
              </p>
            </div>
          )}

          {currentTip && userTurn && !lineDone && !reviewing && (
            <div className="rounded-sm border border-[rgba(232,197,71,0.15)] bg-[rgba(232,197,71,0.04)] p-4">
              <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.25em] text-[rgba(232,197,71,0.6)]">
                QUICK TIP
              </p>
              <p className="mt-2 font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.55)]">
                {currentTip}
              </p>
            </div>
          )}

          {manualFocus && (
            <button
              type="button"
              onClick={() => setManualFocus(false)}
              className="w-full rounded-sm border border-[rgba(0,229,255,0.25)] py-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-[rgba(0,229,255,0.75)]"
            >
              Return to live drill
            </button>
          )}
        </div>
        </div>
      </div>
    </motion.div>
  );
}
