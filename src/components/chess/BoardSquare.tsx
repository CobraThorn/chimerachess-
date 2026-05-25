import { memo } from "react";
import { isLightSquare } from "../../chess";
import type { GameState, Square } from "../../chess";
import type { BoardTheme, PieceSet } from "../../customisation/types";
import ChessPiece from "./ChessPiece";
import { LAST_MOVE_FROM_OPACITY, LAST_MOVE_TO_OPACITY, lastMoveSquareTint } from "./boardPointer";

const LEGAL_TINT = "rgba(120,200,140,0.14)";
const LEGAL_CAPTURE_TINT = "rgba(255,200,100,0.12)";

export interface BoardSquareProps {
  sq: Square;
  piece: GameState["board"][number];
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  interactive: boolean;
  isSelected: boolean;
  isLegal: boolean;
  isCapture: boolean;
  isLastFrom: boolean;
  isLastTo: boolean;
  isThinking: boolean;
  isEngineFrom: boolean;
  isEngineTo: boolean;
  heat?: { fill: string; ring: string };
  hidePiece: boolean;
  onPointerDown?: (e: React.PointerEvent) => void;
}

function BoardSquare({
  sq,
  piece,
  boardTheme,
  pieceSet,
  interactive,
  isSelected,
  isLegal,
  isCapture,
  isLastFrom,
  isLastTo,
  isThinking,
  isEngineFrom,
  isEngineTo,
  heat,
  hidePiece,
  onPointerDown,
}: BoardSquareProps) {
  const isLight = isLightSquare(sq);
  const bg = isLight ? boardTheme.lightSquare : boardTheme.darkSquare;
  const lastFromTint = lastMoveSquareTint(boardTheme.lastMove, LAST_MOVE_FROM_OPACITY);
  const lastToTint = lastMoveSquareTint(boardTheme.lastMove, LAST_MOVE_TO_OPACITY);

  return (
    <button
      type="button"
      data-square={sq}
      aria-disabled={!interactive}
      onPointerDown={interactive ? onPointerDown : undefined}
      style={{ backgroundColor: bg }}
      className={[
        "relative flex size-full min-h-0 min-w-0 items-center justify-center overflow-hidden p-0",
        "select-none",
        interactive ? "cursor-grab active:cursor-grabbing" : "pointer-events-none cursor-default",
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
          aria-hidden
        />
      )}
      {piece && !hidePiece && (
        <div
          data-piece-root
          className={[
            "relative z-[2] flex h-[88%] w-[88%] items-center justify-center will-change-transform",
            isSelected ? "scale-[1.04]" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <ChessPiece color={piece.color} type={piece.type} pieceSet={pieceSet} />
        </div>
      )}
    </button>
  );
}

export default memo(BoardSquare);
