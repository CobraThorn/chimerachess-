import type { HeatKind } from "./types";

/** Pastel overlay tints for review heat map (readable on dark boards). */
export const HEAT_PASTEL: Record<
  HeatKind,
  { fill: string; ring: string; label: string }
> = {
  blunder: {
    fill: "rgba(255, 160, 175, 0.52)",
    ring: "rgba(255, 120, 140, 0.75)",
    label: "Your mistake",
  },
  best: {
    fill: "rgba(160, 235, 195, 0.48)",
    ring: "rgba(100, 210, 160, 0.7)",
    label: "Engine best",
  },
  open_file: {
    fill: "rgba(210, 190, 255, 0.38)",
    ring: "rgba(180, 160, 240, 0.55)",
    label: "Open file",
  },
  blind_spot: {
    fill: "rgba(255, 210, 170, 0.5)",
    ring: "rgba(255, 180, 130, 0.65)",
    label: "Blind spot",
  },
  weak: {
    fill: "rgba(255, 248, 180, 0.42)",
    ring: "rgba(240, 220, 120, 0.55)",
    label: "Weak square",
  },
};

export const HEAT_KIND_ORDER: HeatKind[] = [
  "blunder",
  "best",
  "blind_spot",
  "open_file",
  "weak",
];
