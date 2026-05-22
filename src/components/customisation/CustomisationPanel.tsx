import { motion } from "framer-motion";
import {
  BOARD_THEMES,
  PIECE_SETS,
  useCustomisation,
} from "../../customisation";
import ChessBoardGrid from "../chess/ChessBoardGrid";
import ChessPiece from "../chess/ChessPiece";
import { usesUnicodePieces } from "../chess/ChessPiece";
import { createInitialState } from "../../chess";

const PREVIEW_STATE = createInitialState();

export default function CustomisationPanel() {
  const { prefs, boardTheme, pieceSet, setBoardTheme, setPieceSet } =
    useCustomisation();

  return (
    <div className="mt-10 border-t border-[rgba(232,197,71,0.1)] pt-10">
      <h3 className="font-[family-name:var(--font-display)] text-xl tracking-wide text-gold-glow">
        Customisation
      </h3>
      <p className="mt-2 max-w-xl font-[family-name:var(--font-body)] text-sm text-[rgba(255,255,255,0.42)]">
        Board colours and piece styling apply to every arena — play, CHIMERA
        matches, and mirror duels. Saved on this device.
      </p>

      <div className="mt-10 flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
        <div className="shrink-0">
          <p className="font-[family-name:var(--font-hud)] text-[9px] tracking-[0.35em] text-[rgba(0,229,255,0.45)] uppercase">
            Live preview
          </p>
          <div className="mt-4 scale-90 origin-top-left sm:scale-100">
            <ChessBoardGrid
              state={PREVIEW_STATE}
              disabled
              showCorners
            />
          </div>
          <p className="mt-3 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em] text-[rgba(255,255,255,0.3)]">
            {boardTheme.name} · {pieceSet.name}
          </p>
        </div>

        <div className="min-w-0 flex-1 space-y-10">
          <div>
            <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.3em] text-[rgba(232,197,71,0.65)] uppercase">
              Board
            </h4>
            <div className="mt-4 grid max-h-[min(50vh,420px)] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
              {BOARD_THEMES.map((theme) => {
                const active = prefs.boardThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => setBoardTheme(theme.id)}
                    className={[
                      "group rounded-sm border p-3 text-left transition-all",
                      active
                        ? "border-[rgba(232,197,71,0.55)] bg-[rgba(232,197,71,0.08)]"
                        : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]",
                    ].join(" ")}
                  >
                    <div className="grid grid-cols-4 gap-0.5 overflow-hidden rounded-sm border border-[rgba(255,255,255,0.06)]">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                        <div
                          key={i}
                          className="aspect-square w-full"
                          style={{
                            backgroundColor:
                              (i + Math.floor(i / 4)) % 2 === 0
                                ? theme.lightSquare
                                : theme.darkSquare,
                          }}
                        />
                      ))}
                    </div>
                    <p
                      className={`mt-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.12em] ${
                        active ? "text-gold-glow" : "text-[rgba(255,255,255,0.45)]"
                      }`}
                    >
                      {theme.name}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <h4 className="font-[family-name:var(--font-hud)] text-[10px] tracking-[0.3em] text-[rgba(232,197,71,0.65)] uppercase">
              Pieces
            </h4>
            <div className="mt-4 grid max-h-[min(50vh,420px)] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 md:grid-cols-4">
              {PIECE_SETS.map((set) => {
                const active = prefs.pieceSetId === set.id;
                return (
                  <motion.button
                    key={set.id}
                    type="button"
                    onClick={() => setPieceSet(set.id)}
                    whileHover={{ scale: 1.02 }}
                    className={[
                      "rounded-sm border px-4 py-4 text-center transition-all",
                      active
                        ? "border-[rgba(232,197,71,0.55)] bg-[rgba(232,197,71,0.08)]"
                        : "border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]",
                    ].join(" ")}
                  >
                    <div className="flex h-12 items-center justify-center gap-2">
                      {usesUnicodePieces(set) ? (
                        <>
                          <span
                            className={`text-2xl leading-none ${set.whiteClass}`}
                          >
                            {set.symbols.w.k}
                            {set.symbols.w.q}
                          </span>
                          <span
                            className={`text-2xl leading-none ${set.blackClass}`}
                          >
                            {set.symbols.b.k}
                            {set.symbols.b.q}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="flex h-9 w-9 items-center justify-center">
                            <ChessPiece color="w" type="k" pieceSet={set} />
                          </div>
                          <div className="flex h-9 w-9 items-center justify-center">
                            <ChessPiece color="w" type="q" pieceSet={set} />
                          </div>
                          <div className="flex h-9 w-9 items-center justify-center">
                            <ChessPiece color="b" type="k" pieceSet={set} />
                          </div>
                        </>
                      )}
                    </div>
                    <p
                      className={`mt-2 font-[family-name:var(--font-hud)] text-[9px] tracking-[0.12em] ${
                        active ? "text-gold-glow" : "text-[rgba(255,255,255,0.45)]"
                      }`}
                    >
                      {set.name}
                    </p>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
