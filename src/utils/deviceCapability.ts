/** Heuristic for phones / low-memory devices where WASM workers crash easily. */
export function isLowPowerDevice(): boolean {
  if (typeof window === "undefined") return false;

  const coarse =
    window.matchMedia?.("(max-width: 768px)")?.matches ||
    window.matchMedia?.("(pointer: coarse)")?.matches;

  const ua = navigator.userAgent || "";
  const mobileUa =
    /Android|iPhone|iPad|iPod|Mobile|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
      ua
    );

  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
  const lowMem = typeof mem === "number" && mem > 0 && mem <= 4;

  return Boolean(coarse && (mobileUa || lowMem));
}

export function prefersReducedEffects(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true
  );
}
