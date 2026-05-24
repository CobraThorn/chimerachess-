import { useCustomisation } from "../../customisation";
import { isLightSquare } from "../../chess";
import type { Color, GameState, Move, Square } from "../../chess";
import ChessPiece from "./ChessPiece";
import BoardAnnotations, { type BoardArrow } from "./BoardAnnotations";

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
  /** Review / analysis arrows (aligned to the 8×8 grid) */
  arrows?: BoardArrow[];
  /** Pastel review heat overlays per square */
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
      <div className="relative aspect-square w-full overflow-hidden rounded-[2px]">
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
            const isLast =
              lastMove !== null && (lastMove.from === sq || lastMove.to === sq);
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

            const bg = isLast
              ? boardTheme.lastMove
              : isLight
                ? boardTheme.lightSquare
                : boardTheme.darkSquare;

            return (
              <button
                key={sq}
                type="button"
                disabled={!interactive}
                onClick={() => onSquareClick?.(sq)}
                className={[
                  "relative flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-0",
                  "transition-[background-color] duration-200 ease-out",
                  "touch-manipulation select-none",
                  interactive ? "cursor-pointer" : "cursor-default",
                  isThinking && "ring-1 ring-inset ring-[rgba(0,229,255,0.25)]",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ backgroundColor: bg }}
                aria-label={piece ? `${piece.color} ${piece.type}` : "empty"}
              >
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
                    className="relative z-[1] h-[18%] w-[18%] min-h-1.5 min-w-1.5 max-h-2.5 max-w-2.5 rounded-full opacity-90"
                    style={{
                      backgroundColor: boardTheme.legalDot,
                      boxShadow: `0 0 4px ${boardTheme.legalDot}`,
                    }}
                  />
                )}
                {isLegal && isCapture && (
                  <span
                    className="pointer-events-none absolute inset-[14%] z-[1] rounded-full border box-border opacity-70"
                    style={{ borderColor: boardTheme.legalCapture }}
                  />
                )}
                {piece && (
                  <div className="relative z-[2] flex h-[88%] w-[88%] items-center justify-center">
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
      </div>
    </div>
  );
}
