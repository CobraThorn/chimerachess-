import { findKing, getPiece } from "../../chess/board";
import { fromFen } from "../../chess/fen";
import { algebraic, file, rank, square } from "../../chess/square";
import type { Color, GameState } from "../../chess";
import { analyzeOpenFiles, detectBlindSpots } from "../../review/positionInsights";

export interface PositionalEvidence {
  violatedConcepts: string[];
  boardConsequences: string[];
  narrativeLines: string[];
}

function centerPawnCount(state: GameState, color: Color): number {
  let c = 0;
  for (const f of [3, 4]) {
    for (let r = 0; r < 8; r++) {
      const p = getPiece(state, square(f, r));
      if (p?.color === color && p.type === "p") c++;
    }
  }
  return c;
}

export function analyzePositionalEvidence(
  fenBefore: string,
  fenAfter: string,
  userColor: Color,
  cpLoss: number
): PositionalEvidence {
  const before = fromFen(fenBefore);
  const after = fromFen(fenAfter);
  const violatedConcepts: string[] = [];
  const boardConsequences: string[] = [];
  const narrativeLines: string[] = [];

  if (!before || !after) {
    return {
      violatedConcepts: ["coordination"],
      boardConsequences: ["The position shifted in the opponent's favor."],
      narrativeLines: ["Structural details could not be fully resolved from FEN."],
    };
  }

  const { open: openB, semiOpen: semiB } = analyzeOpenFiles(before, userColor);
  const { open: openA, semiOpen: semiA } = analyzeOpenFiles(after, userColor);
  const blindB = detectBlindSpots(before, userColor);
  const blindA = detectBlindSpots(after, userColor);

  if (blindA.length > blindB.length) {
    violatedConcepts.push("king safety", "weak squares");
    boardConsequences.push(
      `King-zone control weakened (${blindB.length} → ${blindA.length} vulnerable squares near your king).`
    );
    narrativeLines.push(
      `You weakened square control near your king while the opponent gained infiltration routes on ${blindA.slice(0, 3).map(algebraic).join(", ")}.`
    );
  }

  if (openA.length > openB.length || semiA.length > semiB.length) {
    violatedConcepts.push("open files", "piece activity");
    const files = [...openA, ...semiA].filter((f) => !openB.includes(f) && !semiB.includes(f));
    boardConsequences.push(
      `File pressure increased${files.length ? ` on ${files.join(", ")}` : ""} — rooks belong behind your pawns or on open lines.`
    );
    narrativeLines.push(
      `Open or semi-open files (${[...openA, ...semiA].join(", ")}) now favor the side that can occupy them first.`
    );
  }

  const centerBefore = centerPawnCount(before, userColor);
  const centerAfter = centerPawnCount(after, userColor);
  if (centerAfter < centerBefore) {
    violatedConcepts.push("center control", "pawn structure");
    narrativeLines.push(
      "You surrendered central pawn presence — the opponent can anchor pieces in the middle with more freedom."
    );
  }

  const king = findKing(after, userColor);
  if (king !== null) {
    const kf = file(king);
    const kr = rank(king);
    const castled =
      (userColor === "w" && kr >= 6 && (kf <= 2 || kf >= 6)) ||
      (userColor === "b" && kr <= 1 && (kf <= 2 || kf >= 6));
    if (!castled && after.fullmoveNumber > 12) {
      violatedConcepts.push("king safety");
      narrativeLines.push(
        "Your king remains in the center longer than ideal — development and castling are lagging behind the tension."
      );
    }
  }

  if (cpLoss >= 100) {
    violatedConcepts.push("coordination", "initiative");
    boardConsequences.push(
      "Piece coordination broke down — one move left multiple units misaligned with your plan."
    );
  }

  if (violatedConcepts.length === 0) {
    violatedConcepts.push("precision", "tempo");
    narrativeLines.push(
      "The error is subtle: you conceded tempo or allowed a quieter improvement the engine values highly."
    );
    boardConsequences.push("Small inaccuracies accumulate — the opponent gets easier improving moves.");
  }

  return {
    violatedConcepts: [...new Set(violatedConcepts)],
    boardConsequences,
    narrativeLines,
  };
}
