import type { Color, GameState } from "../chess";
import {
  createInitialState,
  findBookMove,
  makeMove,
  positionKeyFromState,
  toFen,
} from "../chess";
import { CHIMERA_SIGNATURE_OPENING } from "../content/chimeraSignatureOpening";
import { positionKey } from "./memory";

const CHIMERA_COLOR = CHIMERA_SIGNATURE_OPENING.chimeraColor;

/** position key → UCI when it is CHIMERA's turn */
const BOOK = new Map<string, string>();

/** Every position reached along any ingested line (either side to move). */
const LINE_POSITIONS = new Set<string>();

function ingestLine(moves: readonly string[]): void {
  let state = createInitialState();

  for (const uci of moves) {
    const key = positionKeyFromState(state);
    LINE_POSITIONS.add(key);

    if (state.turn === CHIMERA_COLOR && !BOOK.has(key)) {
      BOOK.set(key, uci);
    }

    const move = findBookMove(state, uci);
    if (!move) {
      if (import.meta.env?.DEV) {
        console.warn(
          `[chimera-book] illegal ${uci} at ${toFen(state)} in ${CHIMERA_SIGNATURE_OPENING.id}`
        );
      }
      return;
    }
    const next = makeMove(state, move);
    if (!next) return;
    state = next;
    LINE_POSITIONS.add(positionKeyFromState(state));
  }
}

for (const line of CHIMERA_SIGNATURE_OPENING.lines) {
  ingestLine(line);
}

export function getChimeraSignatureMeta() {
  return {
    id: CHIMERA_SIGNATURE_OPENING.id,
    name: CHIMERA_SIGNATURE_OPENING.name,
    eco: CHIMERA_SIGNATURE_OPENING.eco,
    tagline: CHIMERA_SIGNATURE_OPENING.tagline,
    bookDepth: Math.max(...CHIMERA_SIGNATURE_OPENING.lines.map((l) => l.length)),
    positions: BOOK.size,
  };
}

export function isInSignatureOpeningTerritory(fen: string): boolean {
  return LINE_POSITIONS.has(positionKey(fen));
}

export function isChimeraBookTurn(fen: string): boolean {
  const parts = fen.split(" ");
  return parts[1] === CHIMERA_COLOR && BOOK.has(positionKey(fen));
}

/**
 * Perfect book move for CHIMERA in the Scandinavian — null if out of book or not Black to move.
 */
export function getChimeraBookMove(
  state: GameState,
  chimeraColor: Color
): string | null {
  if (chimeraColor !== CHIMERA_COLOR) return null;
  const fen = toFen(state);
  if (state.turn !== chimeraColor) return null;
  const uci = BOOK.get(positionKey(fen));
  if (!uci) return null;
  const move = findBookMove(state, uci);
  return move ? uci : null;
}

export function signatureOpeningHint(fen: string): string | null {
  if (!isInSignatureOpeningTerritory(fen)) return null;
  if (isChimeraBookTurn(fen)) {
    return `${CHIMERA_SIGNATURE_OPENING.name} — book move locked in`;
  }
  return `${CHIMERA_SIGNATURE_OPENING.name} — CHIMERA knows this structure cold`;
}
