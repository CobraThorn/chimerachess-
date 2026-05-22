import { useCustomisation } from "../../customisation";
import { isLightSquare } from "../../chess";
import type { Color, GameState, Move, Square } from "../../chess";
import ChessPiece from "./ChessPiece";

export interface ChessBoardGridProps {
  state: GameState;
  orientation?: Color;
  selected?: Square | null;
  legalTargets?: Move[];
  lastMove?: Move | null;
  onSquareClick?: (sq: Square) => void;
  disabled?: boolean;
  /** Highlight pieces of this color while thinking (mirror mode) */
  thinkingColor?: Color | null;
  /** Engine best-move highlight (from → to) */
  engineHighlight?: { from: Square; to: Square } | null;
  squareSize?: "default" | "compact";
  showCorners?: boolean;
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
  squareSize = "default",
  showCorners = true,
}: ChessBoardGridProps) {
  const { boardTheme, pieceSet } = useCustomisation();
  const flip = orientation === "b";
  const displayRank = (visualRank: number) => (flip ? visualRank : 7 - visualRank);
  const displayFile = (visualFile: number) => (flip ? 7 - visualFile : visualFile);
  const sizeClass =
    squareSize === "compact"
      ? "w-[min(11vw,58px)] sm:w-[58px]"
      : "w-[min(11vw,58px)] sm:w-[58px]";

  return (
    <div className="glass-panel relative rounded-sm p-2 shadow-[0_0_60px_rgba(232,197,71,0.08)]">
      {showCorners && (
        <>
          <span className="hud-corner hud-corner--tl" />
          <span className="hud-corner hud-corner--tr" />
          <span className="hud-corner hud-corner--bl" />
          <span className="hud-corner hud-corner--br" />
        </>
      )}
      <div
        className="grid grid-cols-8 gap-0 border"
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

          return (
            <button
              key={sq}
              type="button"
              disabled={disabled || !onSquareClick}
              onClick={() => onSquareClick?.(sq)}
              className={[
                "@container relative flex aspect-square items-center justify-center transition-colors duration-200",
                sizeClass,
                disabled && "opacity-90",
                isThinking && "ring-1 ring-inset",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                backgroundColor: isLast
                  ? boardTheme.lastMove
                  : isLight
                    ? boardTheme.lightSquare
                    : boardTheme.darkSquare,
                boxShadow: [
                  isSelected ? `inset 0 0 0 2px ${boardTheme.selectedRing}` : "",
                  isThinking ? "inset 0 0 0 1px rgba(0,229,255,0.35)" : "",
                  isEngineFrom
                    ? "inset 0 0 0 999px rgba(255,200,60,0.22)"
                    : "",
                  isEngineTo
                    ? "inset 0 0 0 999px rgba(0,229,255,0.28)"
                    : "",
                ]
                  .filter(Boolean)
                  .join(", ") || undefined,
              }}
            >
              {isLegal && !piece && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{
                    backgroundColor: boardTheme.legalDot,
                    boxShadow: `0 0 8px ${boardTheme.legalDot}`,
                  }}
                />
              )}
              {isLegal && isCapture && (
                <span
                  className="absolute inset-1 rounded-full border-2"
                  style={{ borderColor: boardTheme.legalCapture }}
                />
              )}
              {piece && (
                <ChessPiece
                  color={piece.color}
                  type={piece.type}
                  pieceSet={pieceSet}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
