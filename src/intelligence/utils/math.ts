export function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function emaUpdate(
  prev: number,
  sample: number,
  rate: number
): number {
  return prev * (1 - rate) + sample * rate;
}

export function learningRate(base: number, gamesSampled: number): number {
  return base / Math.sqrt(Math.max(1, gamesSampled));
}

export function directionFromDelta(
  delta: number,
  threshold = 1.5
): "up" | "down" | "flat" {
  if (delta > threshold) return "up";
  if (delta < -threshold) return "down";
  return "flat";
}

export function avg(nums: number[]): number {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}
