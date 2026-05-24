import { motion } from "framer-motion";
import { useCallback, useMemo, useState } from "react";
import { fromFen, getLegalMoves, makeMove, parseUciSquare } from "../../chess";
import type { GameState, Move, PieceType, Square } from "../../chess";
import { useCustomisation } from "../../customisation";
import { isPuzzleSolution } from "../../personalPuzzles/puzzleBuilder";
import type { PersonalPuzzle } from "../../personalPuzzles/types";
import ChessBoardGrid from "../chess/ChessBoardGrid";
import ChessPiece from "../chess/ChessPiece";
import type { BoardArrow } from "../chess/BoardAnnotations";

interface PersonalPuzzleDrillProps {
  puzzle: PersonalPuzzle;
  index: number;
  total: number;
  onBack: () => void;
  onNext: () => void;
}

export default function PersonalPuzzleDrill({
  puzzle,
  index,
  total,
  onBack,
  onNext,
}: PersonalPuzzleDrillProps) {
  const { pieceSet } = useCustomisation();
  const initial = useMemo(() => fromFen(puzzle.fen) ?? undefined, [puzzle.fen]);
  const [state, setState] = useState<GameState>(() => initial ?? fromFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")!);
  const [selected, setSelected] = useState<Square | null>(null);
  const [legalTargets, setLegalTargets] = useState<Move[]>([]);
  const [solved, setSolved] = useState(false);
  const [wrong, setWrong] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [promotionPick, setPromotionPick] = useState<{
    from: Square;
    to: Square;
  } | null>(null);

  const orientation = puzzle.sideToMove;
  const arrows = useMemo((): BoardArrow[] => {
    if (!showHint || solved) return [];
    for (let sq = 0; sq < 64; sq++) {
      const moves = getLegalMoves(state, sq as Square);
      const hit = moves.find((mv) => isPuzzleSolution(state, mv, puzzle.solutionUci));
      if (hit) return [{ from: hit.from, to: hit.to, color: "green" }];
    }
    const from = parseUciSquare(puzzle.solutionUci.slice(0, 2));
    const to = parseUciSquare(puzzle.solutionUci.slice(2, 4));
    if (from !== null && to !== null) {
      return [{ from: from as Square, to: to as Square, color: "green" }];
    }
    return [];
  }, [showHint, solved, state, puzzle.solutionUci]);

  const applySolution = useCallback(
    (move: Move) => {
      const next = makeMove(state, move);
      if (!next) {
        setWrong(true);
        return;
      }
      if (isPuzzleSolution(state, move, puzzle.solutionUci)) {
        setState(next);
        setSolved(true);
        setWrong(false);
        setSelected(null);
        setLegalTargets([]);
        setPromotionPick(null);
        return;
      }
      setWrong(true);
      setState(next);
      setSelected(null);
      setLegalTargets([]);
    },
    [state, puzzle.solutionUci]
  );

  const onSquareClick = useCallback(
    (sq: Square) => {
      if (solved) return;
      if (promotionPick) return;

      const target = legalTargets.find((m) => m.to === sq);
      if (target) {
        const promos = legalTargets.filter((m) => m.to === sq && m.promotion);
        if (promos.length > 1) {
          setPromotionPick({ from: selected!, to: sq });
          return;
        }
        applySolution(promos[0] ?? target);
        return;
      }

      const piece = state.board[sq];
      if (piece && piece.color === state.turn) {
        setSelected(sq);
        setLegalTargets(getLegalMoves(state, sq));
        setWrong(false);
        return;
      }
      setSelected(null);
      setLegalTargets([]);
    },
    [applySolution, legalTargets, promotionPick, solved, selected, state]
  );

  const onPromotion = (type: PieceType) => {
    if (!promotionPick) return;
    const move = legalTargets.find(
      (m) => m.to === promotionPick.to && m.promotion === type
    );
    if (move) applySolution(move);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-8 rounded-sm border border-[rgba(180,140,255,0.2)] bg-[rgba(40,20,80,0.12)] p-6 md:p-8"
    >
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <button
            type="button"
            onClick={onBack}
            className="nav-link mb-2 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.2em]"
          >
            ← All puzzles
          </button>
          <p className="font-[family-name:var(--font-hud)] text-[8px] tracking-[0.3em] text-[rgba(180,140,255,0.7)] uppercase">
            Weak point · {puzzle.weakpointLabel}
          </p>
          <h3 className="mt-1 font-[family-name:var(--font-display)] text-xl text-gold-glow">
            {puzzle.headline}
          </h3>
          <p className="mt-1 font-[family-name:var(--font-body)] text-xs text-[rgba(255,255,255,0.45)]">
            {puzzle.moveLabel} · Puzzle {index + 1}/{total}
          </p>
        </div>
        <span className="rounded-sm border border-[rgba(255,255,255,0.1)] px-2 py-1 font-[family-name:var(--font-hud)] text-[8px] text-[rgba(255,255,255,0.45)] uppercase">
          {puzzle.severity}
        </span>
      </div>

      <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-start lg:justify-center">
        <div className="w-full max-w-[min(100%,32rem)]">
          <ChessBoardGrid
            state={state}
            orientation={orientation}
            selected={selected}
            legalTargets={legalTargets}
            onSquareClick={onSquareClick}
            arrows={arrows}
            disabled={solved}
          />
        </div>

        <div className="w-full max-w-md space-y-4">
          <p className="font-[family-name:var(--font-body)] text-sm leading-relaxed text-[rgba(255,255,255,0.55)]">
            {puzzle.coachingLine}
          </p>
          {puzzle.playedUci && (
            <p className="font-[family-name:var(--font-hud)] text-[9px] text-[rgba(255,160,120,0.75)]">
              In the game you played {puzzle.playedUci}
            </p>
          )}

          {wrong && !solved && (
            <p className="text-sm text-[rgba(255,120,120,0.85)]">
              Not the engine line — try again or reveal the hint.
            </p>
          )}

          {solved && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-[family-name:var(--font-display)] text-lg text-[rgba(120,255,180,0.95)]"
            >
              Correct — {puzzle.solutionUci}
            </motion.p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowHint((h) => !h)}
              disabled={solved}
              className="rounded-sm border border-[rgba(0,229,255,0.25)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-[rgba(0,229,255,0.75)] uppercase"
            >
              {showHint ? "Hide hint" : "Hint"}
            </button>
            {index + 1 < total && (
              <button
                type="button"
                onClick={onNext}
                className="rounded-sm border border-[rgba(232,197,71,0.35)] px-3 py-1.5 font-[family-name:var(--font-hud)] text-[8px] tracking-[0.15em] text-gold-glow uppercase"
              >
                {solved ? "Next puzzle" : "Skip"}
              </button>
            )}
          </div>
        </div>
      </div>

      {promotionPick && (
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {(["q", "r", "b", "n"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onPromotion(t)}
              className="rounded-sm border border-[rgba(232,197,71,0.3)] p-2"
            >
              <ChessPiece color={state.turn} type={t} pieceSet={pieceSet} />
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}
