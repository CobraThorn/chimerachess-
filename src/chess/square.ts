import type { Color, Square } from "./types";

export function file(sq: Square): number {
  return sq & 7;
}

export function rank(sq: Square): number {
  return sq >> 3;
}

export function square(f: number, r: number): Square {
  return r * 8 + f;
}

export function inBounds(f: number, r: number): boolean {
  return f >= 0 && f < 8 && r >= 0 && r < 8;
}

export function offset(sq: Square, df: number, dr: number): Square | null {
  const f = file(sq) + df;
  const r = rank(sq) + dr;
  return inBounds(f, r) ? square(f, r) : null;
}

export function sameColor(a: Square, b: Square): boolean {
  return (Math.floor(a / 8) + (a & 7)) % 2 === (Math.floor(b / 8) + (b & 7)) % 2;
}

export function algebraic(sq: Square): string {
  return `${"abcdefgh"[file(sq)]}${rank(sq) + 1}`;
}

export function parseSquare(notation: string): Square | null {
  if (notation.length !== 2) return null;
  const f = notation.charCodeAt(0) - 97;
  const r = parseInt(notation[1], 10) - 1;
  return inBounds(f, r) ? square(f, r) : null;
}

export function pawnStartRank(color: Color): number {
  return color === "w" ? 1 : 6;
}

export function pawnDir(color: Color): number {
  return color === "w" ? 1 : -1;
}

export function kingHome(color: Color): Square {
  return color === "w" ? square(4, 0) : square(4, 7);
}

export function rookKingside(color: Color): Square {
  return color === "w" ? square(7, 0) : square(7, 7);
}

export function rookQueenside(color: Color): Square {
  return color === "w" ? square(0, 0) : square(0, 7);
}
