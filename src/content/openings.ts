import type { Color } from "../chess";

export interface OpeningLine {
  id: string;
  name: string;
  eco: string;
  tagline: string;
  /** Side you practice */
  userColor: Color;
  /** Full UCI line from the starting position */
  moves: string[];
  /** Tips shown after each of your moves (same order as your moves in the line) */
  userTips: string[];
}

export const OPENING_LINES: OpeningLine[] = [
  {
    id: "italian",
    name: "Italian Game",
    eco: "C50",
    tagline: "Rapid development and pressure on f7.",
    userColor: "w",
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"],
    userTips: [
      "Claim the center — most classical openings start here.",
      "Develop the knight and attack the e5 pawn.",
      "The bishop eyes f7; keep pieces coordinated.",
    ],
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez",
    eco: "C60",
    tagline: "The Spanish — pin the knight and fight for the center.",
    userColor: "w",
    moves: ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"],
    userTips: [
      "Open with e4 to stake a central claim.",
      "Knights before bishops — develop with tempo.",
      "Bb5 pressures the c6 knight and Black's structure.",
    ],
  },
  {
    id: "sicilian-najdorf",
    name: "Sicilian Najdorf",
    eco: "B90",
    tagline: "Counterattack with …a6 and flexible piece play.",
    userColor: "b",
    moves: ["e2e4", "c7c5", "g1f3", "d7d6", "d2d4", "c5d4", "f3d4", "g8f6", "b1c3", "a7a6"],
    userTips: [
      "Fight for the c-file and queenside expansion.",
      "The Najdorf pawn shield keeps …d5 in reserve.",
      "…a6 stops Nb5 and prepares …b5 or …e5.",
    ],
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    eco: "D06",
    tagline: "Offer the c-pawn to dominate the center.",
    userColor: "w",
    moves: ["d2d4", "d7d5", "c2c4", "e7e6", "b1c3"],
    userTips: [
      "Build on d4 — the queen's pawn family controls e5.",
      "c4 challenges Black's d5 pawn immediately.",
      "Develop the knight to support e4 and cxd5 ideas.",
    ],
  },
  {
    id: "kings-indian",
    name: "King's Indian",
    eco: "E60",
    tagline: "Fianchetto and strike back in the center.",
    userColor: "b",
    moves: ["d2d4", "g8f6", "c2c4", "g7g6", "b1c3", "f8g7", "e2e4", "d7d6"],
    userTips: [
      "Hypermodern: let White occupy the center, then challenge it.",
      "…g6 and …Bg7 aim at the long diagonal.",
      "…d6 supports …e5 or …c5 breaks later.",
    ],
  },
  {
    id: "french",
    name: "French Defense",
    eco: "C00",
    tagline: "Solid e6 chain and counterplay on c5.",
    userColor: "b",
    moves: ["e2e4", "e7e6", "d2d4", "d7d5", "b1c3", "g8f6"],
    userTips: [
      "e6 prepares …d5 without weakening f7.",
      "The pawn chain fights for the center.",
      "…Nf6 pressures e4 and develops naturally.",
    ],
  },
  {
    id: "london",
    name: "London System",
    eco: "D02",
    tagline: "System chess — same setup regardless of Black.",
    userColor: "w",
    moves: ["d2d4", "d7d5", "c1f4", "g8f6", "e2e3"],
    userTips: [
      "A low-risk d4 setup you can play every game.",
      "Bf4 before e3 keeps the bishop active.",
      "e3 reinforces d4 and prepares Bd3 or c4.",
    ],
  },
  {
    id: "caro-kann",
    name: "Caro-Kann",
    eco: "B12",
    tagline: "Sturdy structure — trade on d5 and develop smoothly.",
    userColor: "b",
    moves: ["e2e4", "c7c6", "d2d4", "d7d5", "b1c3", "d5e4", "c3e4"],
    userTips: [
      "c6 supports …d5 without blocking the c8 bishop.",
      "The main line trades on d5 for a solid pawn structure.",
      "Recapture with the knight — central piece stays active.",
    ],
  },
  {
    id: "scandinavian",
    name: "Scandinavian",
    eco: "B01",
    tagline: "Immediate counter — queen out early, then develop.",
    userColor: "b",
    moves: ["e2e4", "d7d5", "e4d5", "d8d5", "b1c3"],
    userTips: [
      "Strike the center on move one.",
      "After …Qxd5, be ready to move the queen again.",
      "Nc3 gains tempo on the queen — classic Scandinavian idea.",
    ],
  },
  {
    id: "english",
    name: "English Opening",
    eco: "A20",
    tagline: "Flank play — control d5 without committing e4 early.",
    userColor: "w",
    moves: ["c2c4", "e7e5", "b1c3", "g8f6", "g2g3"],
    userTips: [
      "c4 fights for d5 from the wing.",
      "Nc3 supports e4 and d5 breaks.",
      "g3 prepares Bg2 on the long diagonal.",
    ],
  },
];

export function moveColorAtIndex(index: number): Color {
  return index % 2 === 0 ? "w" : "b";
}

export function isUserMoveIndex(index: number, userColor: Color): boolean {
  return moveColorAtIndex(index) === userColor;
}

export function countUserMoves(line: OpeningLine): number {
  return line.moves.filter((_, i) => isUserMoveIndex(i, line.userColor)).length;
}
