import { useCallback, useEffect, useRef, useState } from "react";
import { useCustomisation } from "../../customisation";
import { isLightSquare } from "../../chess";
import type { Color, GameState, Move, PieceType, Square } from "../../chess";
import ChessPiece from "./ChessPiece";
import BoardAnnotations, { type BoardArrow } from "./BoardAnnotations";
import { MOVE_SLIDE_MS } from "../../chess/movePacing";
import MoveGlidePiece from "./MoveGlidePiece";
import {
  clientToSquare,
  DRAG_LIFT_SCALE,
  DRAG_START_PX,
  LAST_MOVE_FROM_OPACITY,
  LAST_MOVE_TO_OPACITY,
  lastMoveSquareTint,
  squareToPercent,
  squareTranslateDelta,
} from "./boardPointer";

export interface ChessBoardGridProps {
  state: GameState;
  orientation?: Color;
  selected?: Square | null;
  legalTargets?: Move[];
  lastMove?: Move | null;
  onSquareClick?: (sq: Square) => void;
  disabled?: boolean;
  thinkingColor?: Color | null;
  engineHighlight?: { from: Square; to: Square } | null;
  arrows?: BoardArrow[];
  squareHeats?: Map<number, { fill: string; ring: string }>;
  squareSize?: "default" | "compact";
  showCorners?: boolean;
}

const BOARD_SHELL_CLASS =
  "relative mx-auto w-full max-w-[min(100%,calc(100vw-1.25rem),32rem)]";
const BOARD_COMPACT_CLASS =
  "relative mx-auto w-full max-w-[min(100%,calc(100vw-1.25rem),20rem)]";

const LEGAL_TINT = "rgba(120,200,140,0.14)";
const LEGAL_CAPTURE_TINT = "rgba(255,200,100,0.12)";

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

export default function ChessBoardGrid({
  state,
  orientation = "w",
  selected = null,
  legalTargets = [],
  lastMove = null,
  onSquareClick,
  disabled = false,
  thinkingColor = null,
  engineHighlight = null,
  arrows,
  squareHeats,
  squareSize = "default",
  showCorners = true,
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
  const dragSession = useRef<{
    sq: Square;
    startX: number;
    startY: number;
    dragging: boolean;
    armed: boolean;
    piece: { color: Color; type: PieceType } | null;
  } | null>(null);

  const [dragPiece, setDragPiece] = useState<DragVisual | null>(null);
  const [dragFromSq, setDragFromSq] = useState<Square | null>(null);
  const [slide, setSlide] = useState<SlideAnim | null>(null);
  const prevMoveKey = useRef<string | null>(null);

  useEffect(() => {
    if (!lastMove) return;
    const key = `${lastMove.from}-${lastMove.to}-${lastMove.promotion ?? ""}`;
    if (key === prevMoveKey.current) return;
    prevMoveKey.current = key;

    const landed = state.board[lastMove.to];
    if (!landed) return;

    setSlide({
      from: lastMove.from,
      to: lastMove.to,
      color: landed.color,
      type: landed.type,
      key: Date.now(),
    });
    const t = window.setTimeout(() => setSlide(null), MOVE_SLIDE_MS + 40);
    return () => window.clearTimeout(t);
  }, [lastMove, state.board]);

  const positionGhost = useCallback((clientX: number, clientY: number) => {
    const board = boardRef.current;
    const ghost = ghostRef.current;
    if (!board || !ghost) return;

    const rect = board.getBoundingClientRect();
    const size = rect.width / 8;
    const x = clientX - rect.left - size / 2;
    const y = clientY - rect.top - size / 2;

    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
    ghost.style.transform = `translate3d(${x}px, ${y}px, 0) scale(${DRAG_LIFT_SCALE})`;
  }, []);

  const showGhost = useCallback(
    (visual: DragVisual, clientX: number, clientY: number) => {
      setDragPiece(visual);
      positionGhost(clientX, clientY);
    },
    [positionGhost]
  );

  const hideGhost = useCallback(() => {
    setDragPiece(null);
    const ghost = ghostRef.current;
    if (ghost) ghost.style.transform = "translate3d(0, 0, 0) scale(1)";
  }, []);

  const finishPointer = useCallback(
    (clientX: number, clientY: number, fallbackSq: Square) => {
      const session = dragSession.current;
      dragSession.current = null;

      if (!session || !onSquareClick) {
        hideGhost();
        setDragFromSq(null);
        return;
      }

      const el = boardRef.current;
      const dropSq =
        el && session.dragging
          ? clientToSquare(el.getBoundingClientRect(), clientX, clientY, flip)
          : null;

      hideGhost();
      setDragFromSq(null);

      if (session.dragging && dropSq !== null) {
        onSquareClick(dropSq);
      } else if (!session.dragging) {
        onSquareClick(fallbackSq);
      }
    },
    [flip, hideGhost, onSquareClick]
  );

  const onBoardPointerMove = useCallback(
    (e: React.PointerEvent) => {
      const session = dragSession.current;
      if (!session?.armed) return;

      const dx = e.clientX - session.startX;
      const dy = e.clientY - session.startY;
      const dist = Math.hypot(dx, dy);

      if (!session.dragging && dist >= DRAG_START_PX) {
        session.dragging = true;
        setDragFromSq(session.sq);
        onSquareClick?.(session.sq);

        const piece = session.piece ?? state.board[session.sq];
        if (piece) {
          showGhost(piece, e.clientX, e.clientY);
        }
        return;
      }

      if (session.dragging) {
        e.preventDefault();
        positionGhost(e.clientX, e.clientY);
      }
    },
    [onSquareClick, positionGhost, showGhost]
  );

  const onBoardPointerUp = useCallback(
    (e: React.PointerEvent) => {
      const session = dragSession.current;
      if (!session?.armed) return;
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
      try {
        boardRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    },
    [interactive, state.board]
  );

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
            const isLight = isLightSquare(sq);
            const isSelected = selected === sq;
            const isLastFrom = lastMove !== null && lastMove.from === sq;
            const isLastTo = lastMove !== null && lastMove.to === sq;
            const isLegal = legalTargets.some((m) => m.to === sq);
            const isCapture =
              isLegal &&
              (state.board[sq] ||
                legalTargets.find((m) => m.to === sq)?.flags?.includes("ep"));
            const isThinking =
              thinkingColor &&
              piece?.color === thinkingColor &&
              state.turn === thinkingColor;
            const isEngineFrom = engineHighlight?.from === sq;
            const isEngineTo = engineHighlight?.to === sq;
            const heat = squareHeats?.get(sq);
            const isDragSource = dragFromSq === sq;
            const hideForSlide =
              slide !== null && (slide.from === sq || slide.to === sq);

            const bg = isLight ? boardTheme.lightSquare : boardTheme.darkSquare;
            const lastFromTint = lastMoveSquareTint(
              boardTheme.lastMove,
              LAST_MOVE_FROM_OPACITY
            );
            const lastToTint = lastMoveSquareTint(
              boardTheme.lastMove,
              LAST_MOVE_TO_OPACITY
            );

            return (
              <button
                key={sq}
                type="button"
                disabled={!interactive}
                onPointerDown={
                  interactive ? (e) => onSquarePointerDown(sq, e) : undefined
                }
                style={{ backgroundColor: bg }}
                className={[
                  "relative flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-0",
                  "select-none transition-[background-color] duration-200 ease-out",
                  interactive ? "cursor-grab active:cursor-grabbing" : "cursor-default",
                  isThinking && "ring-1 ring-inset ring-[rgba(0,229,255,0.25)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
                aria-label={piece ? `${piece.color} ${piece.type}` : "empty"}
              >
                {isLastFrom && (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: lastFromTint }}
                    aria-hidden
                  />
                )}
                {isLastTo && (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: lastToTint }}
                    aria-hidden
                  />
                )}
                {isLegal && !piece && (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: LEGAL_TINT }}
                    aria-hidden
                  />
                )}
                {isLegal && isCapture && (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ backgroundColor: LEGAL_CAPTURE_TINT }}
                    aria-hidden
                  />
                )}
                {isEngineFrom && (
                  <span
                    className="pointer-events-none absolute inset-0 bg-[rgba(255,200,60,0.12)]"
                    aria-hidden
                  />
                )}
                {isEngineTo && (
                  <span
                    className="pointer-events-none absolute inset-0 bg-[rgba(0,229,255,0.14)]"
                    aria-hidden
                  />
                )}
                {heat && (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundColor: heat.fill,
                      boxShadow: `inset 0 0 0 2px ${heat.ring}`,
                    }}
                    aria-hidden
                  />
                )}
                {isSelected && (
                  <span
                    className="pointer-events-none absolute inset-0"
                    style={{ boxShadow: `inset 0 0 0 2px ${boardTheme.selectedRing}` }}
                    aria-hidden
                  />
                )}
                {isLegal && !piece && (
                  <span
                    className="relative z-[1] h-[18%] w-[18%] min-h-1.5 min-w-1.5 max-h-2.5 max-w-2.5 rounded-full"
                    style={{
                      backgroundColor: boardTheme.legalDot,
                      boxShadow: `0 0 6px ${boardTheme.legalDot}`,
                    }}
                  />
                )}
                {isLegal && isCapture && (
                  <span
                    className="pointer-events-none absolute inset-[14%] z-[1] rounded-full border border-opacity-75 box-border"
                    style={{ borderColor: boardTheme.legalCapture }}
                  />
                )}
                {piece && !hideForSlide && (
                  <div
                    className={[
                      "relative z-[2] flex h-[88%] w-[88%] items-center justify-center",
                      isSelected ? "scale-[1.04]" : "",
                      isDragSource ? "invisible" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <ChessPiece
                      color={piece.color}
                      type={piece.type}
                      pieceSet={pieceSet}
                    />
                  </div>
                )}
              </button>
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
            "pointer-events-none absolute left-0 top-0 z-40 flex h-0 w-0 items-center justify-center",
            "will-change-transform",
            dragPiece ? "visible" : "invisible",
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
