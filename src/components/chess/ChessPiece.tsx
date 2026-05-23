import type { PieceSet } from "../../customisation";
import type { Color, PieceType } from "../../chess";

const PIECE_FILE: Record<PieceType, string> = {
  k: "K",
  q: "Q",
  r: "R",
  b: "B",
  n: "N",
  p: "P",
};

export function pieceSvgUrl(color: Color, type: PieceType): string {
  const prefix = color === "w" ? "w" : "b";
  return `/pieces/cburnett/${prefix}${PIECE_FILE[type]}.svg`;
}

export function usesUnicodePieces(pieceSet: PieceSet): boolean {
  return pieceSet.id === "stencil" || pieceSet.id === "outline";
}

interface ChessPieceProps {
  color: Color;
  type: PieceType;
  pieceSet: PieceSet;
}

/** Fills ~90% of the square — chess.com-style sizing. */
export default function ChessPiece({ color, type, pieceSet }: ChessPieceProps) {
  if (usesUnicodePieces(pieceSet)) {
    return (
      <span
        className={[
          "pointer-events-none flex h-[88%] w-[88%] max-h-full max-w-full select-none items-center justify-center leading-none",
          color === "w" ? pieceSet.whiteClass : pieceSet.blackClass,
        ].join(" ")}
        style={{ fontSize: "min(88cqmin, 88%)" }}
        aria-hidden
      >
        {pieceSet.symbols[color][type]}
      </span>
    );
  }

  return (
    <img
      src={pieceSvgUrl(color, type)}
      alt=""
      draggable={false}
      className={[
        "pointer-events-none h-[88%] w-[88%] max-h-full max-w-full object-contain",
        color === "w" ? pieceSet.whiteClass : pieceSet.blackClass,
      ].join(" ")}
    />
  );
}
