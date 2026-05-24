import { useEffect, useRef } from "react";
import type { Color, PieceType } from "../../chess";
import type { PieceSet } from "../../customisation/types";
import ChessPiece from "./ChessPiece";
import { MOVE_GLIDE_EASE, MOVE_GLIDE_MS } from "./boardPointer";

interface MoveGlidePieceProps {
  glideKey: number;
  originLeft: string;
  originTop: string;
  deltaX: string;
  deltaY: string;
  color: Color;
  type: PieceType;
  pieceSet: PieceSet;
}

/** Hardware-accelerated piece glide (Chess.com-style, no spring lag). */
export default function MoveGlidePiece({
  glideKey,
  originLeft,
  originTop,
  deltaX,
  deltaY,
  color,
  type,
  pieceSet,
}: MoveGlidePieceProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    el.style.transition = "none";
    el.style.transform = "translate3d(0, 0, 0)";

    const raf = requestAnimationFrame(() => {
      el.style.transition = `transform ${MOVE_GLIDE_MS}ms ${MOVE_GLIDE_EASE}`;
      el.style.transform = `translate3d(${deltaX}, ${deltaY}, 0)`;
    });

    return () => cancelAnimationFrame(raf);
  }, [glideKey, deltaX, deltaY]);

  return (
    <div
      ref={ref}
      className="pointer-events-none absolute z-30 flex items-center justify-center will-change-transform"
      style={{
        left: originLeft,
        top: originTop,
        width: "12.5%",
        height: "12.5%",
      }}
    >
      <ChessPiece color={color} type={type} pieceSet={pieceSet} />
    </div>
  );
}
