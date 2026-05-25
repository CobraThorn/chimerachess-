import type { ReactNode, RefObject } from "react";
import { useInView } from "../../hooks/useInView";

interface DeferredMountProps {
  children: ReactNode;
  /** Placeholder height while off-screen (reduces layout shift). */
  minHeight?: string;
  rootMargin?: string;
  className?: string;
}

/**
 * Mount children only after the block enters (or nears) the viewport.
 * Critical for mobile: prevents 6× Stockfish + analyze + play engines at once.
 */
export default function DeferredMount({
  children,
  minHeight = "12rem",
  rootMargin = "240px 0px",
  className,
}: DeferredMountProps) {
  const { ref, inView } = useInView(rootMargin);

  return (
    <div ref={ref as RefObject<HTMLDivElement | null>} className={className}>
      {inView ? (
        children
      ) : (
        <div
          className="flex items-center justify-center rounded-sm border border-[rgba(255,255,255,0.04)] bg-[rgba(0,0,0,0.2)]"
          style={{ minHeight }}
          aria-hidden
        >
          <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.2em] text-[rgba(255,255,255,0.25)] uppercase">
            Loading…
          </p>
        </div>
      )}
    </div>
  );
}
