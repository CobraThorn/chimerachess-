import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useCustomisation } from "../../customisation";
import type { Color, GameState, Move, PieceType, Square } from "../../chess";
import BoardAnnotations, { type BoardArrow } from "./BoardAnnotations";
import BoardSquare from "./BoardSquare";
import ChessPiece from "./ChessPiece";
import { MOVE_SLIDE_MS } from "../../chess/movePacing";
import MoveGlidePiece from "./MoveGlidePiece";
import {
  clientToSquare,
  DRAG_LIFT_SCALE,
  DRAG_START_PX,
  squareCenterClient,
  squareToPercent,
  squareTranslateDelta,
  DRAG_DROP_EASE,
  DRAG_DROP_SNAP_MS,
} from "./boardPointer";

export interface ChessBoardGridProps {
  state: GameState;
  orientation?: Color;
  selected?: Square | null;
  legalTargets?: Move[];
  lastMove?: Move | null;
  onSquareClick?: (sq: Square) => void;
  /** Called on pointer-down when the square has a piece (select before drag). */
  onPiecePress?: (sq: Square) => void;
  disabled?: boolean;
  thinkingColor?: Color | null;
  engineHighlight?: { from: Square; to: Square } | null;
  arrows?: BoardArrow[];
  squareHeats?: Map<number, { fill: string; ring: string }>;
  squareSize?: "default" | "compact";
  showCorners?: boolean;
  /** Replay / review boards should disable glide to avoid ghost pieces. */
  animateMoves?: boolean;
}

const BOARD_SHELL_CLASS =
  "relative mx-auto w-full max-w-[min(100%,calc(100vw-1.25rem),32rem)]";
const BOARD_COMPACT_CLASS =
  "relative mx-auto w-full max-w-[min(100%,calc(100vw-1.25rem),20rem)]";

interface DragVisual {
  color: Color;
  type: PieceType;
}

interface SlideAnim {
  from: Square;
  to: Square;
  color: Color;
  type: PieceType;
  key: number;
}

function buildLegalLookup(legalTargets: Move[], board: GameState["board"]) {
  const legal = new Set<number>();
  const capture = new Set<number>();
  for (const m of legalTargets) {
    legal.add(m.to);
    if (board[m.to] || m.flags?.includes("ep")) capture.add(m.to);
  }
  return { legal, capture };
}

export default function ChessBoardGrid({
  state,
  orientation = "w",
  selected = null,
  legalTargets = [],
  lastMove = null,
  onSquareClick,
  onPiecePress,
  disabled = false,
  thinkingColor = null,
  engineHighlight = null,
  arrows,
  squareHeats,
  squareSize = "default",
  showCorners = true,
  animateMoves = true,
}: ChessBoardGridProps) {
  const { boardTheme, pieceSet } = useCustomisation();
  const flip = orientation === "b";
  const displayRank = (visualRank: number) => (flip ? visualRank : 7 - visualRank);
  const displayFile = (visualFile: number) => (flip ? 7 - visualFile : visualFile);
  const shellClass =
    squareSize === "compact" ? BOARD_COMPACT_CLASS : BOARD_SHELL_CLASS;
  const interactive = !disabled && !!onSquareClick;

  const boardRef = useRef<HTMLDivElement>(null);
  const ghostRef = useRef<HTMLDivElement>(null);
  const ghostRaf = useRef(0);
  const pendingGhost = useRef<{ x: number; y: number } | null>(null);
  const boardRectRef = useRef<DOMRect | null>(null);
  const dragSourcePieceRef = useRef<HTMLElement | null>(null);
  const windowDragCleanup = useRef<(() => void) | null>(null);
  const dragSession = useRef<{
    sq: Square;
    startX: number;
    startY: number;
    dragging: boolean;
    armed: boolean;
    piece: { color: Color; type: PieceType } | null;
  } | null>(null);

  const [dragPiece, setDragPiece] = useState<DragVisual | null>(null);
  const [slide, setSlide] = useState<SlideAnim | null>(null);
  const prevMoveKey = useRef<string | null>(null);
  const prevBoardRef = useRef(state.board);
  const skipNextSlideRef = useRef(false);

  const legalLookup = useMemo(
    () => buildLegalLookup(legalTargets, state.board),
    [legalTargets, state.board]
  );

  useLayoutEffect(() => {
    const prevBoard = prevBoardRef.current;
    prevBoardRef.current = state.board;

    if (!animateMoves || !lastMove) return;
    if (skipNextSlideRef.current) {
      skipNextSlideRef.current = false;
      return;
    }

    const key = `${lastMove.from}-${lastMove.to}-${lastMove.promotion ?? ""}`;
    if (key === prevMoveKey.current) return;
    prevMoveKey.current = key;

    const moved = prevBoard[lastMove.from];
    if (!moved) return;

    setSlide({
      from: lastMove.from,
      to: lastMove.to,
      color: moved.color,
      type: moved.type,
      key: Date.now(),
    });
    const t = window.setTimeout(() => setSlide(null), MOVE_SLIDE_MS + 40);
    return () => window.clearTimeout(t);
  }, [lastMove, state.board, animateMoves]);

  const refreshBoardRect = useCallback(() => {
    boardRectRef.current = boardRef.current?.getBoundingClientRect() ?? null;
  }, []);

  const positionGhost = useCallback((clientX: number, clientY: number) => {
    const ghost = ghostRef.current;
    const rect = boardRectRef.current;
    if (!ghost || !rect) return;

    const size = rect.width / 8;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
    ghost.style.transition = "none";
    ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${DRAG_LIFT_SCALE})`;
  }, []);

  const scheduleGhostPosition = useCallback(
    (clientX: number, clientY: number) => {
      pendingGhost.current = { x: clientX, y: clientY };
      if (ghostRaf.current) return;
      ghostRaf.current = requestAnimationFrame(() => {
        ghostRaf.current = 0;
        const p = pendingGhost.current;
        if (p) positionGhost(p.x, p.y);
      });
    },
    [positionGhost]
  );

  useEffect(
    () => () => {
      if (ghostRaf.current) cancelAnimationFrame(ghostRaf.current);
      windowDragCleanup.current?.();
    },
    []
  );

  const hideDragSourcePiece = useCallback((sq: Square) => {
    const btn = boardRef.current?.querySelector<HTMLElement>(`[data-square="${sq}"]`);
    const root = btn?.querySelector<HTMLElement>("[data-piece-root]");
    if (root) {
      dragSourcePieceRef.current = root;
      root.style.visibility = "hidden";
    }
  }, []);

  const showDragSourcePiece = useCallback(() => {
    const root = dragSourcePieceRef.current;
    if (root) {
      root.style.visibility = "";
      dragSourcePieceRef.current = null;
    }
  }, []);

  const hideGhost = useCallback(() => {
    setDragPiece(null);
    const ghost = ghostRef.current;
    if (ghost) {
      ghost.style.transition = "none";
      ghost.style.transform = "translate3d(0, 0, 0) scale(1)";
      ghost.classList.add("invisible");
    }
    showDragSourcePiece();
  }, [showDragSourcePiece]);

  const beginGhost = useCallback(
    (visual: DragVisual, sq: Square, clientX: number, clientY: number) => {
      refreshBoardRect();
      hideDragSourcePiece(sq);
      setDragPiece(visual);
      const ghost = ghostRef.current;
      if (ghost) ghost.classList.remove("invisible");
      positionGhost(clientX, clientY);
    },
    [hideDragSourcePiece, positionGhost, refreshBoardRect]
  );

  const detachWindowDrag = useCallback(() => {
    windowDragCleanup.current?.();
    windowDragCleanup.current = null;
  }, []);

  const snapGhostToSquare = useCallback(
    (sq: Square): Promise<void> => {
      const ghost = ghostRef.current;
      const rect = boardRectRef.current;
      if (!ghost || !rect) return Promise.resolve();

      const { x, y } = squareCenterClient(rect, sq, flip);
      const size = rect.width / 8;
      const tx = x - rect.left - size / 2;
      const ty = y - rect.top - size / 2;

      return new Promise((resolve) => {
        ghost.style.transition = `transform ${DRAG_DROP_SNAP_MS}ms ${DRAG_DROP_EASE}`;
        ghost.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${DRAG_LIFT_SCALE})`;
        window.setTimeout(resolve, DRAG_DROP_SNAP_MS);
      });
    },
    [flip]
  );

  const finishPointer = useCallback(
    (clientX: number, clientY: number, fallbackSq: Square) => {
      detachWindowDrag();
      const session = dragSession.current;
      dragSession.current = null;

      if (!session || !onSquareClickRef.current) {
        hideGhost();
        return;
      }

      const el = boardRef.current;
      const dropSq =
        el && session.dragging
          ? clientToSquare(el.getBoundingClientRect(), clientX, clientY, flip)
          : null;

      if (session.dragging && dropSq !== null) {
        refreshBoardRect();
        skipNextSlideRef.current = true;
        hideGhost();
        void snapGhostToSquare(dropSq).then(() => onSquareClickRef.current?.(dropSq));
        return;
      }

      hideGhost();

      if (!session.dragging) {
        onSquareClickRef.current?.(fallbackSq);
      }
    },
    [detachWindowDrag, flip, hideGhost, refreshBoardRect, snapGhostToSquare]
  );

  const attachWindowDrag = useCallback(
    (pointerId: number) => {
      detachWindowDrag();

      const onMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const session = dragSession.current;
        if (!session?.dragging) return;
        e.preventDefault();
        scheduleGhostPosition(e.clientX, e.clientY);
      };

      const onUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const session = dragSession.current;
        if (!session?.armed) return;
        try {
          boardRef.current?.releasePointerCapture(pointerId);
        } catch {
          /* already released */
        }
        finishPointer(e.clientX, e.clientY, session.sq);
      };

      window.addEventListener("pointermove", onMove, { passive: false });
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);

      windowDragCleanup.current = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    },
    [detachWindowDrag, finishPointer, scheduleGhostPosition]
  );

  const onBoardPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const session = dragSession.current;
      if (!session?.armed || session.dragging) return;

      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      if (Math.hypot(dx, dy) < DRAG_START_PX) return;

      session.dragging = true;
      const piece = session.piece;
      if (piece) {
        beginGhost(piece, session.sq, e.clientX, e.clientY);
        attachWindowDrag(e.pointerId);
      }
    },
    [attachWindowDrag, beginGhost]
  );

  const onBoardPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const session = dragSession.current;
      if (!session?.armed || session.dragging) return;
      try {
        boardRef.current?.releasePointerCapture(e.pointerId);
      } catch {
        /* already released */
      }
      finishPointer(e.clientX, e.clientY, session.sq);
    },
    [finishPointer]
  );

  const onSquarePointerDown = useCallback(
    (sq: Square, e: React.PointerEvent) => {
      if (!interactive || e.button !== 0) return;
      const piece = state.board[sq];
      dragSession.current = {
        sq,
        startX: e.clientX,
        startY: e.clientY,
        dragging: false,
        armed: true,
        piece: piece ? { color: piece.color, type: piece.type } : null,
      };
      refreshBoardRect();
      if (piece && onPiecePress) {
        onPiecePress(sq);
      }
      try {
        boardRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [interactive, onPiecePress, refreshBoardRect, state.board]
  );

  const squarePointerDownRef = useRef(onSquarePointerDown);
  squarePointerDownRef.current = onSquarePointerDown;
  const handleSquarePointerDown = useCallback(
    (sq: Square, e: React.PointerEvent) => {
      squarePointerDownRef.current(sq, e);
    },
    []
  );

  const onSquareClickRef = useRef(onSquareClick);
  onSquareClickRef.current = onSquareClick;

  const resetPointerSession = useCallback(() => {
    dragSession.current = null;
    windowDragCleanup.current?.();
    windowDragCleanup.current = null;
    hideGhost();
  }, [hideGhost]);

  useEffect(() => {
    resetPointerSession();
  }, [disabled, resetPointerSession]);

  const slideGlide = slide
    ? {
        ...squareToPercent(slide.from, flip),
        ...squareTranslateDelta(slide.from, slide.to, flip),
      }
    : null;

  return (
    <div
      className={`board-frame relative min-w-0 rounded-sm p-2 ${shellClass}`}
    >
      {showCorners && (
        <>
          <span className="hud-corner hud-corner--tl" />
          <span className="hud-corner hud-corner--tr" />
          <span className="hud-corner hud-corner--bl" />
          <span className="hud-corner hud-corner--br" />
        </>
      )}
      <div
        ref={boardRef}
        className={`relative aspect-square w-full overflow-hidden rounded-[2px] ${
          interactive ? "touch-none" : ""
        }`}
        onPointerMove={interactive ? onBoardPointerMove : undefined}
        onPointerUp={interactive ? onBoardPointerUp : undefined}
        onPointerCancel={interactive ? onBoardPointerUp : undefined}
      >
        <div
          className="grid size-full grid-cols-8 grid-rows-8 border box-border"
          style={{ borderColor: boardTheme.border }}
        >
          {Array.from({ length: 64 }, (_, visualIndex) => {
            const vr = Math.floor(visualIndex / 8);
            const vf = visualIndex % 8;
            const sq = displayRank(vr) * 8 + displayFile(vf);
            const piece = state.board[sq];
            const isSelected = selected === sq;
            const isLastFrom = lastMove !== null && lastMove.from === sq;
            const isLastTo = lastMove !== null && lastMove.to === sq;
            const isLegal = legalLookup.legal.has(sq);
            const isCapture = legalLookup.capture.has(sq);
            const isThinking =
              !!thinkingColor &&
              piece?.color === thinkingColor &&
              state.turn === thinkingColor;
            const hideForSlide =
              slide !== null && (slide.from === sq || slide.to === sq);

            return (
              <BoardSquare
                key={sq}
                sq={sq}
                piece={piece}
                boardTheme={boardTheme}
                pieceSet={pieceSet}
                interactive={interactive}
                isSelected={isSelected}
                isLegal={isLegal}
                isCapture={isCapture}
                isLastFrom={isLastFrom}
                isLastTo={isLastTo}
                isThinking={!!isThinking}
                isEngineFrom={engineHighlight?.from === sq}
                isEngineTo={engineHighlight?.to === sq}
                heat={squareHeats?.get(sq)}
                hidePiece={hideForSlide}
                onPointerDown={
                  interactive ? (e) => handleSquarePointerDown(sq, e) : undefined
                }
              />
            );
          })}
        </div>

        {arrows && arrows.length > 0 && (
          <BoardAnnotations
            orientation={orientation}
            arrows={arrows}
            showArrows
          />
        )}

        {slide && slideGlide && (
          <MoveGlidePiece
            glideKey={slide.key}
            originLeft={slideGlide.left}
            originTop={slideGlide.top}
            deltaX={slideGlide.x}
            deltaY={slideGlide.y}
            color={slide.color}
            type={slide.type}
            pieceSet={pieceSet}
          />
        )}

        <div
          ref={ghostRef}
          aria-hidden
          className={[
            "pointer-events-none absolute left-0 top-0 z-40 flex items-center justify-center",
            "invisible will-change-transform opacity-95",
          ].join(" ")}
        >
          {dragPiece && (
            <div className="flex h-[88%] w-[88%] items-center justify-center">
              <ChessPiece
                color={dragPiece.color}
                type={dragPiece.type}
                pieceSet={pieceSet}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
