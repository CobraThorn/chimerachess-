import { isSquareAttacked } from "../chess/attacks";
import { findKing, opponent } from "../chess/board";
import { file, rank, square } from "../chess/square";
import type { Color, GameState, Square } from "../chess";
import type { OpeningLine } from "../content/openings";
import type { UserPattern } from "../ai/types";
import {
  applyUciLine,
  findBookMove,
} from "../components/train/openingUtils";
import {
  blindSpotsFromPatterns,
  kingsidePressureHint,
  tacticalFamilyHint,
} from "./userBlindSpots";
import type {
  CognitiveCell,
  CognitiveMapResult,
  CognitiveOverlayMode,
  CognitiveState,
  TiltEvent,
} from "./cognitiveState";

export interface BuildCognitiveMapInput {
  state: GameState;
  perspective: Color;
  overlayMode: CognitiveOverlayMode;
  opening?: OpeningLine;
  focusPly: number;
  /** User just played / is playing book move */
  isBookLine: boolean;
  /** Ply indices user nailed first try this session */
  masteredPlies: Set<number>;
  wrongSquares: Square[];
  clockSeconds?: number;
  patterns: UserPattern[];
  tilt: TiltEvent | null;
}

function setCell(
  map: Map<Square, CognitiveCell>,
  sq: Square,
  state: CognitiveState,
  intensity: number,
  tooltip: string
): void {
  const prev = map.get(sq);
  const rank: Record<CognitiveState, number> = {
    collapse: 6,
    blind: 5,
    strain: 4,
    theory: 3,
    stable: 2,
    peak: 1,
  };
  if (prev && rank[prev.state] >= rank[state] && prev.intensity >= intensity) {
    return;
  }
  map.set(sq, {
    square: sq,
    state,
    intensity: Math.min(1, intensity),
    tooltip,
  });
}

function hangingSquares(state: GameState, color: Color): Square[] {
  const opp = opponent(color);
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p || p.color !== color) continue;
    const attacked = isSquareAttacked(state, sq, opp);
    const defended = isSquareAttacked(state, sq, color);
    if (attacked && !defended) out.push(sq);
  }
  return out;
}

function passivePieceSquares(state: GameState, color: Color): Square[] {
  const out: Square[] = [];
  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (!p || p.color !== color || p.type === "k" || p.type === "p") continue;
    const opp = opponent(color);
    if (isSquareAttacked(state, sq, opp) && !isSquareAttacked(state, sq, color)) {
      out.push(sq);
    }
  }
  return out;
}

function kingRing(state: GameState, color: Color): Square[] {
  const k = findKing(state, color);
  if (k === null) return [];
  const ring: Square[] = [];
  for (let df = -1; df <= 1; df++) {
    for (let dr = -1; dr <= 1; dr++) {
      if (!df && !dr) continue;
      const f = file(k) + df;
      const r = rank(k) + dr;
      if (f >= 0 && f < 8 && r >= 0 && r < 8) ring.push(square(f, r));
    }
  }
  return ring;
}

function centerSquares(): Square[] {
  return [square(3, 3), square(4, 3), square(3, 4), square(4, 4)];
}

function buildTactical(
  input: BuildCognitiveMapInput,
  map: Map<Square, CognitiveCell>
): void {
  const { state, perspective } = input;
  const opp = opponent(perspective);

  for (const hint of blindSpotsFromPatterns(input.patterns)) {
    setCell(
      map,
      hint.square,
      "blind",
      0.75 + hint.severity * 0.2,
      hint.tooltip
    );
  }

  for (const sq of hangingSquares(state, perspective)) {
    setCell(
      map,
      sq,
      "blind",
      0.9,
      "Tactical oversight — this piece is attacked and not adequately defended."
    );
  }

  for (let sq = 0; sq < 64; sq++) {
    if (!isSquareAttacked(state, sq, opp)) continue;
    if (!isSquareAttacked(state, sq, perspective)) {
      const p = state.board[sq];
      if (!p || p.color === perspective) {
        setCell(
          map,
          sq,
          "blind",
          0.55,
          tacticalFamilyHint(sq)
        );
      }
    }
  }

  for (const sq of input.wrongSquares) {
    setCell(
      map,
      sq,
      "collapse",
      0.85,
      "Non-book attempt here — pattern recognition failed vs preparation."
    );
  }
}

function buildPressure(
  input: BuildCognitiveMapInput,
  map: Map<Square, CognitiveCell>
): void {
  const { state, perspective } = input;

  for (const sq of passivePieceSquares(state, perspective)) {
    setCell(
      map,
      sq,
      "strain",
      0.7,
      "Pressure — piece is passive under fire. Accuracy drops in these structures."
    );
  }

  const kRing = kingRing(state, perspective);
  const opp = opponent(perspective);
  let kingPressure = false;
  for (const sq of kRing) {
    if (isSquareAttacked(state, sq, opp)) kingPressure = true;
  }
  if (kingPressure) {
    for (const sq of kRing) {
      setCell(
        map,
        sq,
        "strain",
        0.65,
        kingsidePressureHint(perspective)
      );
    }
  }

  for (const sq of centerSquares()) {
    if (isSquareAttacked(state, sq, opp)) {
      setCell(
        map,
        sq,
        "strain",
        0.5,
        "Center tension — weak central control collapses plans under attack."
      );
    }
  }
}

function buildTimeStress(
  input: BuildCognitiveMapInput,
  map: Map<Square, CognitiveCell>
): void {
  const { state } = input;
  const clock = input.clockSeconds ?? 120;
  const stress = clock < 30 ? 1 : clock < 60 ? 0.7 : clock < 90 ? 0.4 : 0.15;
  if (stress < 0.2) return;

  for (const sq of centerSquares()) {
    setCell(
      map,
      sq,
      "strain",
      stress,
      clock < 30
        ? "Under 30 seconds — center squares overheat; tactical oversight spikes."
        : "Clock pressure — calculation strain building in the core."
    );
  }

  for (let sq = 0; sq < 64; sq++) {
    const p = state.board[sq];
    if (p && p.color === input.perspective && p.type !== "p" && p.type !== "k") {
      if (stress > 0.6) {
        setCell(
          map,
          sq,
          "strain",
          stress * 0.85,
          "Time stress — piece coordination frays when you rush."
        );
      }
    }
  }

  if (input.tilt?.active) {
    for (const sq of centerSquares()) {
      setCell(
        map,
        sq,
        "collapse",
        0.8,
        input.tilt.message
      );
    }
  }
}

function buildCognitiveCombined(
  input: BuildCognitiveMapInput,
  map: Map<Square, CognitiveCell>
): void {
  const { state, perspective, opening, focusPly, isBookLine, masteredPlies } =
    input;
  const opp = opponent(perspective);

  if (focusPly >= 0 && opening && focusPly < opening.moves.length) {
    const uci = opening.moves[focusPly];
    const before =
      focusPly === 0
        ? state
        : applyUciLine(opening.moves.slice(0, focusPly));
    const move = findBookMove(before, uci);
    if (move) {
      const mover = before.turn;
      const isStudentMove = mover === opening.userColor;
      const mastered = masteredPlies.has(focusPly);
      const moveState: CognitiveState = mastered
        ? "peak"
        : isStudentMove
          ? "theory"
          : "stable";
      const tip =
        moveState === "peak"
          ? "Peak cognitive control — you fully understood this position."
          : moveState === "theory"
            ? "Knowledge carried the move — prep, not improvisation."
            : "Opponent's familiar structure — stable, comfortable territory for them.";

      setCell(map, move.from, moveState, mastered ? 0.95 : 0.75, tip);
      setCell(map, move.to, moveState, mastered ? 1 : 0.85, tip);
    }
  }

  for (let sq = 0; sq < 64; sq++) {
    const mine = isSquareAttacked(state, sq, perspective);
    const theirs = isSquareAttacked(state, sq, opp);
    if (mine && !theirs) {
      setCell(
        map,
        sq,
        "peak",
        0.55,
        "Dominant square — strong tactical awareness and control."
      );
    } else if (mine && theirs) {
      setCell(
        map,
        sq,
        "stable",
        0.45,
        "Contested but held — you're operating naturally in familiar tension."
      );
    }
  }

  if (isBookLine && focusPly >= 0 && opening) {
    const m = opening.moves[focusPly];
    const before =
      focusPly === 0 ? state : applyUciLine(opening.moves.slice(0, focusPly));
    const book = findBookMove(before, m);
    if (book && before.turn === opening.userColor) {
      setCell(
        map,
        book.to,
        masteredPlies.has(focusPly) ? "peak" : "theory",
        0.8,
        masteredPlies.has(focusPly)
          ? "Your brilliance — prep absorbed into intuition."
          : "Engine-approved theory — knowledge carried the move."
      );
    }
  }

  for (const sq of hangingSquares(state, perspective)) {
    setCell(
      map,
      sq,
      "collapse",
      0.95,
      "Cognitive collapse — hanging piece. The engine is screaming here."
    );
  }

  const king = findKing(state, perspective);
  if (king !== null && isSquareAttacked(state, king, opp)) {
    setCell(
      map,
      king,
      "collapse",
      1,
      "Tunnel vision risk — king in check. Pattern recognition failed under pressure."
    );
  }

  buildTactical(input, map);
  buildPressure(input, map);
}

export function buildCognitiveMap(
  input: BuildCognitiveMapInput
): CognitiveMapResult {
  const map = new Map<Square, CognitiveCell>();

  switch (input.overlayMode) {
    case "tactical":
      buildTactical(input, map);
      break;
    case "pressure":
      buildPressure(input, map);
      break;
    case "timeStress":
      buildTimeStress(input, map);
      break;
    default:
      buildCognitiveCombined(input, map);
      if (input.overlayMode === "cognitive") {
        buildTimeStress(
          { ...input, overlayMode: "timeStress" },
          map
        );
      }
  }

  const cells = [...map.values()];
  const engineAlarm = cells.some(
    (c) => c.state === "collapse" && c.intensity >= 0.8
  );

  let headline = "Mapping where you're strong, blind, and under strain.";
  if (engineAlarm) {
    headline = "Engine alarm — tactical collapse zones detected on the board.";
  } else if (cells.some((c) => c.state === "peak")) {
    headline = "Peak control zones active — you own these squares.";
  } else if (cells.some((c) => c.state === "theory")) {
    headline = "Theory layer — preparation is carrying your decisions.";
  } else if (input.tilt?.active) {
    headline = input.tilt.message;
  }

  return {
    cells,
    tilt: input.tilt,
    engineAlarm,
    headline,
  };
}
