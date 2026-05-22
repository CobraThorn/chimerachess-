import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { resolveCustomisation } from "./storage";
import { loadCustomisation, saveCustomisation } from "./storage";
import type { BoardTheme, CustomisationPrefs, PieceSet } from "./types";

interface CustomisationContextValue {
  prefs: CustomisationPrefs;
  boardTheme: BoardTheme;
  pieceSet: PieceSet;
  setBoardTheme: (id: string) => void;
  setPieceSet: (id: string) => void;
}

const CustomisationContext = createContext<CustomisationContextValue | null>(
  null
);

export function CustomisationProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<CustomisationPrefs>(() =>
    loadCustomisation()
  );

  const { boardTheme, pieceSet } = useMemo(
    () => resolveCustomisation(prefs),
    [prefs]
  );

  const persist = useCallback((next: CustomisationPrefs) => {
    setPrefs(next);
    saveCustomisation(next);
  }, []);

  const setBoardTheme = useCallback(
    (id: string) => persist({ ...prefs, boardThemeId: id }),
    [prefs, persist]
  );

  const setPieceSet = useCallback(
    (id: string) => persist({ ...prefs, pieceSetId: id }),
    [prefs, persist]
  );

  const value = useMemo(
    () => ({
      prefs,
      boardTheme,
      pieceSet,
      setBoardTheme,
      setPieceSet,
    }),
    [prefs, boardTheme, pieceSet, setBoardTheme, setPieceSet]
  );

  return (
    <CustomisationContext.Provider value={value}>
      {children}
    </CustomisationContext.Provider>
  );
}

export function useCustomisation(): CustomisationContextValue {
  const ctx = useContext(CustomisationContext);
  if (!ctx) {
    throw new Error("useCustomisation must be used within CustomisationProvider");
  }
  return ctx;
}
