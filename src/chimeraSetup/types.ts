import type { CounterStyleId } from "../ai/learning/types";
import type { ChimeraPhenotype } from "../ai/learning/types";
import type { CustomisationPrefs } from "../customisation/types";

export type ChimeraCoachingTone = "calm" | "sharp" | "chaotic";
export type ChimeraAccentId = "gold" | "cyan" | "crimson" | "violet" | "emerald";

/** User-facing CHIMERA identity — chosen at signup / customise flow */
export interface ChimeraUserSetup {
  version: 1;
  codename: string;
  phenotype: ChimeraPhenotype;
  /** How CHIMERA counters you once adaptation cycles run */
  preferredCounter: CounterStyleId | "auto";
  coachingTone: ChimeraCoachingTone;
  accent: ChimeraAccentId;
  boardThemeId: string;
  pieceSetId: string;
  completedAt: number;
}

export interface ChimeraSaveBundle {
  version: 3;
  savedAt: number;
  setup: ChimeraUserSetup | null;
  customisation: CustomisationPrefs;
  /** Serialized ChimeraMemory — optional; restored when present */
  memory?: unknown;
}

export const CHIMERA_SETUP_STORAGE_KEY = "chimera-user-setup-v3";
