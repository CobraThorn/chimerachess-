import { applyMove, isInCheck, opponent } from "../chess";
import type { GameState, Move } from "../chess";
import type { RadarAxis } from "./memoryRadar";

export interface PlayStyleProfile {
  elo: number;
  games: number;
  moves: number;
  captures: number;
  checks: number;
  castles: number;
  quietMoves: number;
  blunders: number;
  mistakes: number;
  cpLossSum: number;
  cpLossSamples: number;
  evalSwingUp: number;
  evalSwingDown: number;
  earlyQueen: number;
  pawnAdvances: number;
  development: number;
  endgameMoves: number;
  /** Captures / sacrifices in attacking contexts */
  sacrifices: number;
  /** Quiet non-forcing moves that reduce opponent activity */
  prophylaxis: number;
}

export function createPlayStyleProfile(elo = 100): PlayStyleProfile {
  return {
    elo,
    games: 0,
    moves: 0,
    captures: 0,
    checks: 0,
    castles: 0,
    quietMoves: 0,
    blunders: 0,
    mistakes: 0,
    cpLossSum: 0,
    cpLossSamples: 0,
    evalSwingUp: 0,
    evalSwingDown: 0,
    earlyQueen: 0,
    pawnAdvances: 0,
    development: 0,
    endgameMoves: 0,
    sacrifices: 0,
    prophylaxis: 0,
  };
}

export function updateStyleFromMove(
  profile: PlayStyleProfile,
  before: GameState,
  move: Move,
  cpLoss?: number
): PlayStyleProfile {
  const next = { ...profile, moves: profile.moves + 1 };
  const flags = move.flags ?? [];
  const piece = before.board[move.from];

  if (flags.includes("capture") || flags.includes("ep")) {
    next.captures += 1;
    if (
      flags.includes("capture") &&
      (before.fullmoveNumber <= 28 || ["n", "b", "r"].includes(piece?.type ?? ""))
    ) {
      next.sacrifices += 1;
    }
  }
  if (flags.includes("castle-k") || flags.includes("castle-q")) next.castles += 1;
  else if (!flags.includes("capture") && !flags.includes("ep")) {
    next.quietMoves += 1;
    if (
      !isInCheck(before, before.turn) &&
      before.fullmoveNumber > 6 &&
      before.fullmoveNumber < 40
    ) {
      next.prophylaxis += 1;
    }
  }

  if (piece?.type === "p") next.pawnAdvances += 1;
  if (piece && ["n", "b"].includes(piece.type) && before.fullmoveNumber <= 12) {
    next.development += 1;
  }
  if (piece?.type === "q" && before.fullmoveNumber <= 8) next.earlyQueen += 1;

  const after = applyMove(before, move);
  if (after && isInCheck(after, opponent(before.turn))) {
    next.checks += 1;
  }

  const pieceCount = after?.board.filter(Boolean).length ?? before.board.filter(Boolean).length;
  if (pieceCount <= 12) next.endgameMoves += 1;

  if (cpLoss !== undefined) {
    next.cpLossSamples += 1;
    next.cpLossSum += cpLoss;
    if (cpLoss >= 200) next.blunders += 1;
    else if (cpLoss >= 80) next.mistakes += 1;
    if (cpLoss <= 20) next.evalSwingUp += 1;
    if (cpLoss >= 60) next.evalSwingDown += 1;
  }

  return next;
}

/** How you play — style axes (0–100). */
export function styleToRadar(profile: PlayStyleProfile): RadarAxis[] {
  const m = Math.max(1, profile.moves);
  const avgLoss =
    profile.cpLossSamples > 0 ? profile.cpLossSum / profile.cpLossSamples : 40;

  const aggression = Math.min(
    100,
    ((profile.captures * 1.4 + profile.checks * 2.2) / m) * 100
  );
  const defense = Math.min(
    100,
    (profile.castles / m) * 350 +
      Math.max(0, 100 - profile.blunders * 12 - avgLoss * 0.35)
  );
  const tactics = Math.min(
    100,
    (profile.evalSwingUp / m) * 120 + (profile.captures / m) * 40
  );
  const positional = Math.min(
    100,
    (profile.quietMoves / m) * 90 +
      (profile.development / m) * 200 +
      (profile.castles / m) * 80
  );
  const endgame = Math.min(100, (profile.endgameMoves / m) * 180 + defense * 0.2);
  const precision = Math.max(0, Math.min(100, 100 - avgLoss * 0.9));
  const risk = Math.min(
    100,
    (profile.earlyQueen / m) * 500 +
      (profile.blunders / m) * 200 +
      (profile.evalSwingDown / m) * 50
  );
  const initiative = Math.min(
    100,
    (profile.checks / m) * 250 + (profile.pawnAdvances / m) * 60
  );

  return [
    { label: "Aggression", short: "ATK", value: Math.round(aggression) },
    { label: "Solid defense", short: "DEF", value: Math.round(defense) },
    { label: "Tactical eye", short: "TAC", value: Math.round(tactics) },
    { label: "Positional play", short: "POS", value: Math.round(positional) },
    { label: "Endgame skill", short: "END", value: Math.round(endgame) },
    { label: "Move precision", short: "PRE", value: Math.round(precision) },
    { label: "Risk appetite", short: "RISK", value: Math.round(risk) },
    { label: "Initiative", short: "INIT", value: Math.round(initiative) },
  ];
}

export function adjustElo(profile: PlayStyleProfile, delta: number): PlayStyleProfile {
  return {
    ...profile,
    elo: Math.max(80, Math.min(800, profile.elo + delta)),
  };
}
