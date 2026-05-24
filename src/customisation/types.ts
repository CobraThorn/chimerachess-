import type { Color, PieceType } from "../chess";

export interface BoardTheme {
  id: string;
  name: string;
  lightSquare: string;
  darkSquare: string;
  border: string;
  selectedRing: string;
  lastMove: string;
  legalDot: string;
  legalCapture: string;
}

export interface PieceSet {
  id: string;
  name: string;
  symbols: Record<Color, Record<PieceType, string>>;
  whiteClass: string;
  blackClass: string;
}

export interface CustomisationPrefs {
  boardThemeId: string;
  pieceSetId: string;
}

export const DEFAULT_CUSTOMISATION: CustomisationPrefs = {
  boardThemeId: "chimera",
  pieceSetId: "classic",
};

export const CUSTOMISATION_STORAGE_KEY = "chimera-customisation-v2";
