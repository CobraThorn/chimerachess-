import {
  BOARD_THEME_IDS,
  getBoardTheme,
  getPieceSet,
  PIECE_SET_IDS,
} from "./presets";
import {
  CUSTOMISATION_STORAGE_KEY,
  DEFAULT_CUSTOMISATION,
  type BoardTheme,
  type CustomisationPrefs,
  type PieceSet,
} from "./types";

export function loadCustomisation(): CustomisationPrefs {
  try {
    const raw = localStorage.getItem(CUSTOMISATION_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CUSTOMISATION };
    const parsed = JSON.parse(raw) as CustomisationPrefs;
    return {
      boardThemeId: isBoardThemeId(parsed.boardThemeId)
        ? parsed.boardThemeId
        : DEFAULT_CUSTOMISATION.boardThemeId,
      pieceSetId: isPieceSetId(parsed.pieceSetId)
        ? parsed.pieceSetId
        : DEFAULT_CUSTOMISATION.pieceSetId,
    };
  } catch {
    return { ...DEFAULT_CUSTOMISATION };
  }
}

export function saveCustomisation(prefs: CustomisationPrefs): void {
  localStorage.setItem(CUSTOMISATION_STORAGE_KEY, JSON.stringify(prefs));
}

export function resolveCustomisation(prefs: CustomisationPrefs): {
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
} {
  return {
    boardTheme: getBoardTheme(prefs.boardThemeId),
    pieceSet: getPieceSet(prefs.pieceSetId),
  };
}

export function isBoardThemeId(id: string): boolean {
  return BOARD_THEME_IDS.includes(id);
}

export function isPieceSetId(id: string): boolean {
  return PIECE_SET_IDS.includes(id);
}
