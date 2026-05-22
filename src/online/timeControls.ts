export type TimeControlId = "bullet" | "blitz" | "rapid";

export interface TimeControlDef {
  id: TimeControlId;
  label: string;
  tagline: string;
  initialMs: number;
  incrementMs: number;
}

export const TIME_CONTROLS: TimeControlDef[] = [
  {
    id: "bullet",
    label: "Bullet",
    tagline: "1+0",
    initialMs: 60_000,
    incrementMs: 0,
  },
  {
    id: "blitz",
    label: "Blitz",
    tagline: "3+2",
    initialMs: 180_000,
    incrementMs: 2_000,
  },
  {
    id: "rapid",
    label: "Rapid",
    tagline: "10+5",
    initialMs: 600_000,
    incrementMs: 5_000,
  },
];

export function getTimeControl(id: string): TimeControlDef | undefined {
  return TIME_CONTROLS.find((t) => t.id === id);
}

export function hashToTimeControl(hash: string): TimeControlId | null {
  if (hash === "play-bullet") return "bullet";
  if (hash === "play-blitz") return "blitz";
  if (hash === "play-rapid") return "rapid";
  return null;
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}
