import { isSquareAttacked } from "../../chess/attacks";
import { findKing, getPiece, opponent } from "../../chess/board";
import { getLegalMoves, makeMove } from "../../chess/game";
import { fromFen } from "../../chess/fen";
import { algebraic, file, rank, square } from "../../chess/square";
import type { Color, GameState, Square } from "../../chess";
import { uciToMove } from "../../chess/uci";
import {
  analyzeOpenFiles,
  detectBlindSpots,
} from "../../review/positionInsights";

export interface TacticalScanResult {
  themes: string[];
  missedVisualCues: string[];
  hangingBefore: string[];
  hangingAfter: string[];
  newHangings: string[];
  blindSpotsBefore: string[];
  blindSpotsAfter: string[];
  missedCapture: boolean;
  kingExposureIncreased: boolean;
}

function hangingSquares(state: GameState, color: Color): Square[] {
  const opp = opponent(color);
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p || p.color !== color) continue;
    if (isSquareAttacked(state, sq, opp) && !isSquareAttacked(state, sq, color)) {
      out.push(sq);
    }
  }
  return out;
}

function pieceName(sq: Square, state: GameState): string {
  const p = getPiece(state, sq);
  if (!p) return algebraic(sq);
  const names: Record<string, string> = {
    p: "pawn",
    n: "knight",
    b: "bishop",
    r: "rook",
    q: "queen",
    k: "king",
  };
  return `${names[p.type] ?? "piece"} on ${algebraic(sq)}`;
}

export function scanTacticalContext(
  fenBefore: string,
  fenAfter: string,
  userColor: Color,
  playedUci: string,
  bestUci: string
): TacticalScanResult {
  const before = fromFen(fenBefore);
  const after = fromFen(fenAfter);
  const themes: string[] = [];
  const missedVisualCues: string[] = [];

  if (!before || !after) {
    return {
      themes: ["positional"],
      missedVisualCues: ["Position data incomplete — rely on engine best line."],
      hangingBefore: [],
      hangingAfter: [],
      newHangings: [],
      blindSpotsBefore: [],
      blindSpotsAfter: [],
      missedCapture: false,
      kingExposureIncreased: false,
    };
  }

  const hangB = hangingSquares(before, userColor).map((s) => algebraic(s));
  const hangA = hangingSquares(after, userColor).map((s) => algebraic(s));
  const newHangings = hangA.filter((s) => !hangB.includes(s));

  const blindB = detectBlindSpots(before, userColor).map(algebraic);
  const blindA = detectBlindSpots(after, userColor).map(algebraic);
  const kingExposureIncreased = blindA.length > blindB.length + 1;

  const best = uciToMove(before, bestUci);
  const played = uciToMove(before, playedUci);
  const missedCapture =
    Boolean(best?.flags?.includes("capture")) &&
    !played?.flags?.includes("capture");

  if (newHangings.length > 0) {
    themes.push("hanging piece");
    const sq = newHangings[0];
    const sqNum = algebraicToSquare(sq);
    if (sqNum !== null) {
      missedVisualCues.push(
        `After your move, ${pieceName(sqNum, after)} became attacked without adequate defense.`
      );
    }
  }

  if (missedCapture) {
    themes.push("missed capture");
    missedVisualCues.push(
      `The engine's ${bestUci} was a capture — you played a quiet move while material was available.`
    );
  }

  const { open: openBefore } = analyzeOpenFiles(before, userColor);
  const { open: openAfter } = analyzeOpenFiles(after, userColor);
  if (openAfter.length > openBefore.length) {
    themes.push("open file exposure");
    missedVisualCues.push(
      `Open file(s) ${openAfter.filter((f) => !openBefore.includes(f)).join(", ") || openAfter.join(", ")} — rooks can infiltrate along these lanes.`
    );
  }

  if (kingExposureIncreased) {
    themes.push("king safety");
    missedVisualCues.push(
      `Squares near your king (${blindA.slice(0, 3).join(", ")}) are now controlled by the opponent without your cover.`
    );
  }

  if (played && best && played.from !== best.from && played.to !== best.to) {
    const legal = getLegalMoves(before);
    const oppKing = findKing(before, opponent(userColor));
    let checkCount = 0;
    if (oppKing !== null) {
      for (const m of legal) {
        const next = makeMove(before, m);
        if (next && isSquareAttacked(next, oppKing, userColor)) checkCount++;
      }
    }
    if (checkCount > 0 && !playedUci.includes("+") && !bestUci.includes("+")) {
      themes.push("forcing move missed");
      missedVisualCues.push(
        `${checkCount} check(s) were available — forcing lines often define the correct plan.`
      );
    }
  }

  if (themes.length === 0 && blindA.length > blindB.length) {
    themes.push("tactical vulnerability");
    missedVisualCues.push("Your king zone lost defensive control on key squares.");
  }

  return {
    themes,
    missedVisualCues,
    hangingBefore: hangB,
    hangingAfter: hangA,
    newHangings,
    blindSpotsBefore: blindB,
    blindSpotsAfter: blindA,
    missedCapture,
    kingExposureIncreased,
  };
}

function algebraicToSquare(alg: string): Square | null {
  if (alg.length < 2) return null;
  const f = "abcdefgh".indexOf(alg[0]!);
  const r = parseInt(alg[1]!, 10) - 1;
  if (f < 0 || r < 0 || r > 7) return null;
  return square(f, r);
}

/** Simple discovered-attack hint: moving piece unmasked a line to a high-value target. */
export function detectDiscoveredAttackHint(
  fenBefore: string,
  playedUci: string,
  userColor: Color
): string | null {
  const state = fromFen(fenBefore);
  const mv = state ? uciToMove(state, playedUci) : null;
  if (!state || !mv) return null;
  const movedFrom = mv.from;
  const piece = getPiece(state, movedFrom);
  if (!piece || piece.type === "p" || piece.type === "k") return null;

  const opp = opponent(userColor);
  for (let sq = 0; sq < 64; sq++) {
    const target = getPiece(state, sq);
    if (!target || target.color !== opp) continue;
    if (target.type !== "q" && target.type !== "r" && target.type !== "k") continue;
    if (!isSquareAttacked(state, sq, userColor)) continue;
    const f1 = file(movedFrom);
    const r1 = rank(movedFrom);
    const f2 = file(sq);
    const r2 = rank(sq);
    if (f1 === f2 || r1 === r2 || Math.abs(f1 - f2) === Math.abs(r1 - r2)) {
      return `Moving the ${piece.type === "n" ? "knight" : piece.type} may have unmasked pressure on ${algebraic(sq)} — check for discovered attacks after every piece move.`;
    }
  }
  return null;
}
