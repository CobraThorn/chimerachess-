import { isSquareAttacked } from "../chess/attacks";
import { findKing, getPiece, opponent } from "../chess/board";
import { getLegalMoves } from "../chess/game";
import { algebraic, file, offset, square } from "../chess/square";
import type { Color, GameState, Square } from "../chess/types";
import { uciToMove } from "../chess/uci";
import type { HeatKind, MoveGrade, ReviewPositionInsight, SquareHeat } from "./types";

const FILE_CHARS = "abcdefgh";

function pawnsOnFile(state: GameState, f: number): { w: boolean; b: boolean } {
  let w = false;
  let b = false;
  for (let r = 0; r < 8; r++) {
    const p = getPiece(state, square(f, r));
    if (p?.type === "p") {
      if (p.color === "w") w = true;
      else b = true;
    }
  }
  return { w, b };
}

export function analyzeOpenFiles(
  state: GameState,
  userColor: Color
): { open: string[]; semiOpen: string[] } {
  const open: string[] = [];
  const semiOpen: string[] = [];
  for (let f = 0; f < 8; f++) {
    const { w, b } = pawnsOnFile(state, f);
    const ch = FILE_CHARS[f];
    if (!w && !b) open.push(ch);
    else if (userColor === "w" && !w && b) semiOpen.push(ch);
    else if (userColor === "b" && !b && w) semiOpen.push(ch);
  }
  return { open, semiOpen };
}

/** Squares near the king that opponent attacks without adequate user defense. */
export function detectBlindSpots(state: GameState, userColor: Color): Square[] {
  const king = findKing(state, userColor);
  if (king === null) return [];
  const opp = opponent(userColor);
  const out: Square[] = [];

  for (let df = -2; df <= 2; df++) {
    for (let dr = -2; dr <= 2; dr++) {
      if (df === 0 && dr === 0) continue;
      const sq = offset(king, df, dr);
      if (sq === null) continue;
      const oppAtk = isSquareAttacked(state, sq, opp);
      const userDef = isSquareAttacked(state, sq, userColor);
      if (oppAtk && !userDef) out.push(sq);
    }
  }
  return out;
}

function squaresOnFiles(files: string[]): Square[] {
  const sqs: Square[] = [];
  for (const ch of files) {
    const f = FILE_CHARS.indexOf(ch);
    if (f < 0) continue;
    for (let r = 0; r < 8; r++) sqs.push(square(f, r));
  }
  return sqs;
}

export function buildFindBestMoveSteps(
  state: GameState,
  _userColor: Color,
  bestUci: string,
  playedUci: string,
  openFiles: string[],
  blindSpots: string[]
): string[] {
  const steps: string[] = [];
  steps.push(
    "Use a CCT scan first: all Checks, Captures, and Threats (to you and them) before quiet moves."
  );

  const legal = getLegalMoves(state);
  const captures = legal.filter((m) => m.flags?.includes("capture"));
  if (captures.length > 0) {
    steps.push(
      `There were ${captures.length} capture(s) available — compare recapture value and piece safety before moving.`
    );
  }

  if (openFiles.length > 0) {
    steps.push(
      `Open file${openFiles.length > 1 ? "s" : ""} ${openFiles.join(", ")}: place rooks (or queen) behind pawns on these files to seize infiltration routes.`
    );
  }

  if (blindSpots.length > 0) {
    steps.push(
      `Blind spots near your king (${blindSpots.slice(0, 4).join(", ")}${blindSpots.length > 4 ? "…" : ""}): opponent can land there without your control — shore up with pawns or defenders.`
    );
  }

  const best = uciToMove(state, bestUci);
  const played = uciToMove(state, playedUci);
  if (best && played && best.to !== played.to) {
    steps.push(
      `Engine line ${bestUci} improves the position; your ${playedUci} missed that resource. Replay: ask "what does their last move threaten?" then "what forcing reply wins material or tempo?"`
    );
  } else if (best) {
    steps.push(`Best continuation was ${bestUci} — calculate one more ply of opponent replies before committing.`);
  }

  steps.push(
    "Next game habit: name the opponent's plan in one word (file, king, piece) then pick a move that stops it or ignores it with interest."
  );

  return steps.slice(0, 6);
}

export function buildFutureScanHabits(
  grade: MoveGrade,
  openFiles: string[],
  blindCount: number
): string[] {
  const habits: string[] = [
    "Before every move: 3-second scan — checks, hanging pieces, open lines to your king.",
  ];
  if (grade === "blunder" || grade === "mistake") {
    habits.push("After a blunder: pause 10 seconds on the next move — accuracy recovers when you slow down.");
  }
  if (openFiles.length > 0) {
    habits.push("Track open files each turn; if you don't occupy them, assume rooks will.");
  }
  if (blindCount > 2) {
    habits.push("King safety drill: mark the 8 squares around your king — if 2+ are enemy-only, fix before attacking.");
  }
  habits.push("Use engine review heat maps after each session to spot recurring blind spots.");
  return habits.slice(0, 5);
}

export function buildMistakeHeatSquares(
  state: GameState,
  userColor: Color,
  playedUci: string,
  bestUci: string,
  cpLoss: number,
  grade: MoveGrade
): SquareHeat[] {
  const heats: SquareHeat[] = [];
  const intensity = Math.min(1, 0.35 + cpLoss / 280);

  const played = uciToMove(state, playedUci);
  const best = uciToMove(state, bestUci);

  if (played && grade !== "brilliant" && grade !== "great") {
    heats.push({
      square: played.to,
      kind: "blunder",
      intensity,
    });
    if (played.from !== played.to) {
      heats.push({
        square: played.from,
        kind: "blunder",
        intensity: intensity * 0.45,
      });
    }
  }

  if (best && bestUci !== playedUci) {
    heats.push({ square: best.from, kind: "best", intensity: 0.55 });
    heats.push({ square: best.to, kind: "best", intensity: 0.95 });
  }

  const { open, semiOpen } = analyzeOpenFiles(state, userColor);
  const fileList = [...open, ...semiOpen];
  for (const sq of squaresOnFiles(fileList)) {
    if (!heats.some((h) => h.square === sq && h.kind === "open_file")) {
      heats.push({ square: sq, kind: "open_file", intensity: open.includes(FILE_CHARS[file(sq)]) ? 0.5 : 0.32 });
    }
  }

  for (const sq of detectBlindSpots(state, userColor)) {
    heats.push({ square: sq, kind: "blind_spot", intensity: 0.65 });
  }

  const king = findKing(state, userColor);
  if (king !== null && (grade === "mistake" || grade === "blunder")) {
    for (let df = -1; df <= 1; df++) {
      for (let dr = -1; dr <= 1; dr++) {
        const sq = offset(king, df, dr);
        if (sq === null) continue;
        if (heats.some((h) => h.square === sq)) continue;
        const p = getPiece(state, sq);
        if (p && p.color === userColor && p.type !== "k" && p.type !== "p") {
          heats.push({ square: sq, kind: "weak", intensity: 0.4 });
        }
      }
    }
  }

  return heats;
}

export function analyzePositionForReview(
  state: GameState,
  userColor: Color,
  playedUci: string,
  bestUci: string,
  cpLoss: number,
  grade: MoveGrade
): ReviewPositionInsight {
  const { open, semiOpen } = analyzeOpenFiles(state, userColor);
  const blindSq = detectBlindSpots(state, userColor);
  const blindSpots = blindSq.map(algebraic);

  return {
    openFiles: open,
    semiOpenFiles: semiOpen,
    blindSpots,
    findBestMoveSteps: buildFindBestMoveSteps(
      state,
      userColor,
      bestUci,
      playedUci,
      [...open, ...semiOpen],
      blindSpots
    ),
    futureScanHabits: buildFutureScanHabits(grade, open, blindSq.length),
    heatSquares: buildMistakeHeatSquares(
      state,
      userColor,
      playedUci,
      bestUci,
      cpLoss,
      grade
    ),
  };
}

/** Merge square heats for board overlay (strongest kind wins per square). */
export function mergeSquareHeats(heats: SquareHeat[]): Map<number, SquareHeat> {
  const priority: Record<HeatKind, number> = {
    blunder: 5,
    best: 4,
    blind_spot: 3,
    open_file: 2,
    weak: 1,
  };
  const map = new Map<number, SquareHeat>();
  for (const h of heats) {
    const cur = map.get(h.square);
    if (!cur || priority[h.kind] > priority[cur.kind]) {
      map.set(h.square, h);
    } else if (cur && h.kind === cur.kind) {
      map.set(h.square, { ...cur, intensity: Math.max(cur.intensity, h.intensity) });
    }
  }
  return map;
}
