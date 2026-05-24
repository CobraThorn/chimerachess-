import type { MoveGrade } from "./types";

export interface MoveGradeMeta {
  /** Short badge (e.g. "Best") */
  name: string;
  /** Tiny chip for lists */
  short: string;
  textClass: string;
  borderClass: string;
  bgClass: string;
  /** Arrow / highlight color */
  accent: string;
}

/** Chess.com-inspired move classification colors */
export const MOVE_GRADE_META: Record<MoveGrade, MoveGradeMeta> = {
  brilliant: {
    name: "Brilliant",
    short: "!!",
    textClass: "text-[#67e8f9]",
    borderClass: "border-[rgba(103,232,249,0.5)]",
    bgClass: "bg-[rgba(34,211,238,0.15)]",
    accent: "rgba(103,232,249,0.9)",
  },
  best: {
    name: "Best",
    short: "★",
    textClass: "text-[#86efac]",
    borderClass: "border-[rgba(134,239,172,0.45)]",
    bgClass: "bg-[rgba(74,222,128,0.12)]",
    accent: "rgba(134,239,172,0.95)",
  },
  excellent: {
    name: "Excellent",
    short: "!",
    textClass: "text-[#a3e635]",
    borderClass: "border-[rgba(163,230,53,0.4)]",
    bgClass: "bg-[rgba(163,230,53,0.1)]",
    accent: "rgba(163,230,53,0.9)",
  },
  good: {
    name: "Good",
    short: "✓",
    textClass: "text-[#bef264]",
    borderClass: "border-[rgba(190,242,100,0.3)]",
    bgClass: "bg-[rgba(190,242,100,0.08)]",
    accent: "rgba(190,242,100,0.85)",
  },
  book: {
    name: "Book",
    short: "📖",
    textClass: "text-[#d4a574]",
    borderClass: "border-[rgba(212,165,116,0.35)]",
    bgClass: "bg-[rgba(212,165,116,0.1)]",
    accent: "rgba(212,165,116,0.85)",
  },
  inaccuracy: {
    name: "Inaccuracy",
    short: "?!",
    textClass: "text-[#fde047]",
    borderClass: "border-[rgba(253,224,71,0.4)]",
    bgClass: "bg-[rgba(253,224,71,0.1)]",
    accent: "rgba(253,224,71,0.9)",
  },
  mistake: {
    name: "Mistake",
    short: "?",
    textClass: "text-[#fb923c]",
    borderClass: "border-[rgba(251,146,60,0.45)]",
    bgClass: "bg-[rgba(251,146,60,0.12)]",
    accent: "rgba(251,146,60,0.95)",
  },
  miss: {
    name: "Miss",
    short: "✗",
    textClass: "text-[#f97316]",
    borderClass: "border-[rgba(249,115,22,0.45)]",
    bgClass: "bg-[rgba(249,115,22,0.12)]",
    accent: "rgba(249,115,22,0.95)",
  },
  blunder: {
    name: "Blunder",
    short: "??",
    textClass: "text-[#f87171]",
    borderClass: "border-[rgba(248,113,113,0.5)]",
    bgClass: "bg-[rgba(248,113,113,0.14)]",
    accent: "rgba(248,113,113,0.95)",
  },
};

export function isPositiveGrade(grade: MoveGrade): boolean {
  return (
    grade === "brilliant" ||
    grade === "best" ||
    grade === "excellent" ||
    grade === "good" ||
    grade === "book"
  );
}
