import type { Square } from "../chess";

/** Chimera cognitive overlay states — not engine eval bands. */
export type CognitiveState =
  | "peak"
  | "stable"
  | "theory"
  | "strain"
  | "collapse"
  | "blind";

export type CognitiveOverlayMode =
  | "cognitive"
  | "tactical"
  | "pressure"
  | "timeStress";

export interface CognitiveCell {
  square: Square;
  state: CognitiveState;
  /** 0–1 — drives opacity and pulse strength */
  intensity: number;
  tooltip: string;
}

export interface TiltEvent {
  active: boolean;
  message: string;
  severity: "watch" | "tilt";
}

export interface CognitiveMapResult {
  cells: CognitiveCell[];
  tilt: TiltEvent | null;
  /** Engine / tactics screaming at the user right now */
  engineAlarm: boolean;
  headline: string;
}

export const COGNITIVE_LEGEND: {
  state: CognitiveState;
  label: string;
  meaning: string;
  swatch: string;
}[] = [
  {
    state: "peak",
    label: "Gold",
    meaning: "Peak calculation — you fully understood this position",
    swatch: "linear-gradient(135deg, #f5d76e, #c9a227)",
  },
  {
    state: "stable",
    label: "Emerald",
    meaning: "Comfortable — operating naturally here",
    swatch: "linear-gradient(135deg, #34d399, #059669)",
  },
  {
    state: "theory",
    label: "Blue",
    meaning: "Theory / prep — knowledge carried the move",
    swatch: "linear-gradient(135deg, #60a5fa, #2563eb)",
  },
  {
    state: "strain",
    label: "Amber",
    meaning: "Mental strain — confidence slipping",
    swatch: "linear-gradient(135deg, #fb923c, #ea580c)",
  },
  {
    state: "collapse",
    label: "Crimson",
    meaning: "Cognitive collapse — pattern recognition failed",
    swatch: "linear-gradient(135deg, #f87171, #b91c1c)",
  },
  {
    state: "blind",
    label: "Blind zone",
    meaning: "Tactical blind spot — you overlook threats here",
    swatch: "linear-gradient(135deg, #7f1d1d, #450a0a)",
  },
];

export const OVERLAY_MODE_LABELS: Record<
  CognitiveOverlayMode,
  { title: string; description: string }
> = {
  cognitive: {
    title: "Cognitive State",
    description: "Strength, prep, strain, and collapse in one map",
  },
  tactical: {
    title: "Tactical Vision",
    description: "Forks, skewers, and squares you chronically miss",
  },
  pressure: {
    title: "Pressure",
    description: "Passive pieces and accuracy drop under attack",
  },
  timeStress: {
    title: "Time Stress",
    description: "Where the clock erodes your clarity",
  },
};
