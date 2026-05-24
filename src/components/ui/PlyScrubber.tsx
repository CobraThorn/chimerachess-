import { useCallback, useRef, useState } from "react";

export interface PlyScrubberProps {
  min: number;
  max: number;
  value: number;
  onChange: (value: number) => void;
  /** Live preview while dragging without committing (e.g. board ply). */
  onPreview?: (value: number) => void;
  onScrubStart?: () => void;
  onScrubEnd?: (value: number) => void;
  className?: string;
  fillClassName?: string;
  thumbClassName?: string;
  "aria-label"?: string;
}

/**
 * Pointer-captured ply scrubber — smoother than native range inputs on touch/desktop.
 */
export default function PlyScrubber({
  min,
  max,
  value,
  onChange,
  onPreview,
  onScrubStart,
  onScrubEnd,
  className = "",
  fillClassName = "bg-[rgba(0,229,255,0.55)]",
  thumbClassName = "border-[rgba(255,255,255,0.25)] bg-[rgba(0,229,255,0.85)] shadow-[0_0_12px_rgba(0,229,255,0.35)]",
  "aria-label": ariaLabel = "Scrub timeline",
}: PlyScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const [dragValue, setDragValue] = useState<number | null>(null);

  const display = dragValue ?? value;
  const span = Math.max(1, max - min);
  const percent = ((display - min) / span) * 100;

  const valueFromClientX = useCallback(
    (clientX: number) => {
      const el = trackRef.current;
      if (!el) return value;
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0) return value;
      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return Math.round(min + ratio * span);
    },
    [min, span, value]
  );

  const applyAt = useCallback(
    (clientX: number, commit: boolean) => {
      const next = valueFromClientX(clientX);
      setDragValue(next);
      onPreview?.(next);
      if (commit) onChange(next);
    },
    [onChange, onPreview, valueFromClientX]
  );

  const endScrub = useCallback(
    (clientX: number) => {
      if (!dragging.current) return;
      dragging.current = false;
      const next = valueFromClientX(clientX);
      setDragValue(null);
      onChange(next);
      onScrubEnd?.(next);
    },
    [onChange, onScrubEnd, valueFromClientX]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragging.current = true;
    onScrubStart?.();
    e.currentTarget.setPointerCapture(e.pointerId);
    applyAt(e.clientX, false);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    applyAt(e.clientX, false);
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* released */
    }
    endScrub(e.clientX);
  };

  return (
    <div
      ref={trackRef}
      role="slider"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={display}
      className={`relative h-9 cursor-pointer touch-none select-none ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          e.preventDefault();
          onChange(Math.max(min, value - 1));
        }
        if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          e.preventDefault();
          onChange(Math.min(max, value + 1));
        }
        if (e.key === "Home") {
          e.preventDefault();
          onChange(min);
        }
        if (e.key === "End") {
          e.preventDefault();
          onChange(max);
        }
      }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[rgba(255,255,255,0.08)]" />
      <div
        className={`pointer-events-none absolute top-1/2 h-1 -translate-y-1/2 rounded-full transition-[width] duration-75 ease-out ${fillClassName}`}
        style={{ width: `${percent}%` }}
      />
      <div
        className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border will-change-[left] ${thumbClassName}`}
        style={{ left: `${percent}%` }}
      />
    </div>
  );
}
