import { PIECE_SYMBOLS } from "../chess";
import type { Color, PieceType } from "../chess";
import type { BoardTheme, PieceSet } from "./types";

const LETTER_WHITE: Record<PieceType, string> = {
  k: "K",
  q: "Q",
  r: "R",
  b: "B",
  n: "N",
  p: "P",
};
const LETTER_BLACK: Record<PieceType, string> = {
  k: "k",
  q: "q",
  r: "r",
  b: "b",
  n: "n",
  p: "p",
};

function letterSymbols(): Record<Color, Record<PieceType, string>> {
  return { w: LETTER_WHITE, b: LETTER_BLACK };
}

function pieceSet(
  id: string,
  name: string,
  whiteClass: string,
  blackClass: string,
  symbols: Record<Color, Record<PieceType, string>> = PIECE_SYMBOLS
): PieceSet {
  return { id, name, symbols, whiteClass, blackClass };
}

function board(
  id: string,
  name: string,
  light: string,
  dark: string,
  accent: string
): BoardTheme {
  return {
    id,
    name,
    lightSquare: light,
    darkSquare: dark,
    border: accent.replace(/[\d.]+\)$/, "0.2)"),
    selectedRing: accent.replace(/[\d.]+\)$/, "0.38)"),
    lastMove: accent.replace(/[\d.]+\)$/, "0.07)"),
    legalDot: accent.replace(/[\d.]+\)$/, "0.2)"),
    legalCapture: accent.replace(/[\d.]+\)$/, "0.22)"),
  };
}

export const BOARD_THEMES: BoardTheme[] = [
  board("chimera", "CHIMERA Gold", "rgba(28,26,22,0.88)", "rgba(12,12,18,0.96)", "rgba(232,197,71,0.5)"),
  board("obsidian", "Obsidian", "rgba(42,42,48,0.92)", "rgba(18,18,22,0.98)", "rgba(200,200,210,0.5)"),
  board("ivory", "Ivory Hall", "rgba(235,228,210,0.92)", "rgba(176,152,120,0.88)", "rgba(90,60,30,0.5)"),
  board("cyber", "Cyber Grid", "rgba(8,24,32,0.9)", "rgba(4,12,18,0.98)", "rgba(0,229,255,0.5)"),
  board("forest", "Deep Forest", "rgba(32,48,36,0.9)", "rgba(14,26,18,0.96)", "rgba(120,200,140,0.5)"),
  board("crimson", "Crimson War", "rgba(48,22,26,0.9)", "rgba(22,8,12,0.96)", "rgba(255,100,100,0.5)"),
  board("midnight", "Midnight Blue", "rgba(22,32,56,0.92)", "rgba(8,14,28,0.98)", "rgba(100,140,255,0.5)"),
  board("sand", "Desert Sand", "rgba(210,190,150,0.9)", "rgba(160,130,90,0.88)", "rgba(140,100,50,0.5)"),
  board("slate", "Slate Stone", "rgba(72,78,88,0.9)", "rgba(40,44,52,0.96)", "rgba(160,170,185,0.5)"),
  board("lavender", "Lavender Mist", "rgba(72,64,96,0.88)", "rgba(40,32,60,0.96)", "rgba(180,160,255,0.5)"),
  board("amber", "Amber Glow", "rgba(56,44,28,0.9)", "rgba(32,24,12,0.96)", "rgba(255,180,60,0.5)"),
  board("glacier", "Glacier Ice", "rgba(200,220,235,0.9)", "rgba(120,160,190,0.85)", "rgba(180,220,255,0.5)"),
  board("volcanic", "Volcanic Ash", "rgba(48,40,38,0.92)", "rgba(24,18,16,0.98)", "rgba(255,120,40,0.5)"),
  board("sakura", "Sakura Bloom", "rgba(255,228,235,0.9)", "rgba(200,140,160,0.85)", "rgba(255,150,180,0.5)"),
  board("military", "Tactical Olive", "rgba(68,72,48,0.9)", "rgba(36,40,24,0.96)", "rgba(160,180,80,0.5)"),
  board("nordic", "Nordic Frost", "rgba(220,228,236,0.92)", "rgba(140,160,180,0.88)", "rgba(80,120,160,0.5)"),
  board("ocean", "Deep Ocean", "rgba(16,48,72,0.9)", "rgba(8,24,40,0.98)", "rgba(40,180,220,0.5)"),
  board("rosegold", "Rose Gold", "rgba(72,48,52,0.9)", "rgba(40,24,28,0.96)", "rgba(255,160,180,0.5)"),
  board("matrix", "Matrix Code", "rgba(4,16,8,0.92)", "rgba(2,8,4,0.98)", "rgba(0,255,80,0.5)"),
  board("dusk", "Purple Dusk", "rgba(56,40,72,0.9)", "rgba(28,18,40,0.96)", "rgba(160,120,255,0.5)"),
  board("terracotta", "Terracotta", "rgba(180,100,72,0.88)", "rgba(120,56,40,0.9)", "rgba(255,140,90,0.5)"),
];

export const PIECE_SETS: PieceSet[] = [
  pieceSet("classic", "Classic", "drop-shadow-[0_2px_3px_rgba(0,0,0,0.35)]", "drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"),
  pieceSet("gold", "Royal Gold", "drop-shadow-[0_0_10px_rgba(232,197,71,0.55)] brightness-105", "drop-shadow-[0_0_8px_rgba(168,139,42,0.45)] saturate-125"),
  pieceSet("cyber", "Cyber HUD", "drop-shadow-[0_0_12px_rgba(0,229,255,0.65)] hue-rotate-[180deg]", "drop-shadow-[0_0_10px_rgba(0,180,200,0.5)] brightness-90"),
  pieceSet("ivory", "Ivory Stone", "brightness-110 contrast-95", "brightness-75 contrast-110"),
  pieceSet("neon", "Neon Strike", "drop-shadow-[0_0_14px_rgba(255,230,100,0.7)] saturate-150", "drop-shadow-[0_0_12px_rgba(255,80,140,0.6)] hue-rotate-[-20deg]"),
  pieceSet("minimal", "Minimal", "opacity-95", "opacity-85"),
  pieceSet("marble", "Marble", "brightness-110 drop-shadow-[0_1px_2px_rgba(0,0,0,0.2)]", "brightness-50 contrast-125"),
  pieceSet("bronze", "Bronze", "sepia hue-rotate-[5deg] saturate-150 brightness-110", "sepia saturate-200 brightness-75"),
  pieceSet("silver", "Silver", "grayscale brightness-115 contrast-105", "grayscale brightness-70 contrast-110"),
  pieceSet("hologram", "Hologram", "drop-shadow-[0_0_12px_rgba(0,229,255,0.5)] saturate-150", "drop-shadow-[0_0_10px_rgba(100,180,255,0.45)] hue-rotate-[200deg]"),
  pieceSet("sunset", "Sunset", "sepia saturate-150 hue-rotate-[-10deg] brightness-110", "sepia saturate-200 hue-rotate-[320deg] brightness-90"),
  pieceSet("midnight-pieces", "Midnight", "drop-shadow-[0_0_8px_rgba(120,160,255,0.5)]", "drop-shadow-[0_0_10px_rgba(30,50,120,0.6)] brightness-75"),
  pieceSet("arctic", "Arctic", "brightness-115 drop-shadow-[0_0_8px_rgba(200,230,255,0.5)]", "hue-rotate-[200deg] brightness-90 saturate-80"),
  pieceSet("desert", "Desert", "sepia saturate-80 brightness-110", "sepia saturate-150 brightness-70"),
  pieceSet("violet", "Violet", "hue-rotate-[260deg] saturate-125 brightness-110", "hue-rotate-[270deg] brightness-75 saturate-150"),
  pieceSet("emerald", "Emerald", "hue-rotate-[80deg] saturate-125", "hue-rotate-[100deg] brightness-70 saturate-150"),
  pieceSet("copper", "Copper", "sepia saturate-200 hue-rotate-[-15deg]", "sepia saturate-250 brightness-65"),
  pieceSet("ghost", "Ghost", "opacity-80 drop-shadow-[0_0_12px_rgba(255,255,255,0.35)]", "opacity-55 brightness-110"),
  pieceSet("terminal", "Terminal", "hue-rotate-[90deg] saturate-200 drop-shadow-[0_0_8px_rgba(0,255,80,0.5)]", "hue-rotate-[90deg] brightness-60 saturate-150"),
  pieceSet("vintage", "Vintage", "sepia saturate-[0.85] brightness-105", "sepia saturate-[1.2] brightness-70"),
  pieceSet("blood", "Blood Moon", "drop-shadow-[0_0_10px_rgba(255,80,80,0.45)]", "hue-rotate-[340deg] saturate-200 brightness-70"),
  pieceSet("sapphire", "Sapphire", "hue-rotate-[200deg] saturate-125 drop-shadow-[0_0_10px_rgba(80,140,255,0.5)]", "hue-rotate-[210deg] brightness-65"),
  pieceSet("rose", "Rose Gold", "sepia saturate-125 hue-rotate-[-15deg] brightness-110", "sepia saturate-150 hue-rotate-[330deg] brightness-80"),
  pieceSet(
    "stencil",
    "Stencil",
    "font-[family-name:var(--font-hud)] font-bold text-[#e8e8f0] tracking-tighter",
    "font-[family-name:var(--font-hud)] font-bold text-[#505058] tracking-tighter",
    letterSymbols()
  ),
  pieceSet(
    "outline",
    "Outline",
    "text-transparent [-webkit-text-stroke:1.5px_rgba(255,255,255,0.85)]",
    "text-transparent [-webkit-text-stroke:1.5px_rgba(140,140,150,0.75)]"
  ),
];

export const BOARD_THEME_IDS = BOARD_THEMES.map((t) => t.id);
export const PIECE_SET_IDS = PIECE_SETS.map((p) => p.id);

export function getBoardTheme(id: string): BoardTheme {
  return BOARD_THEMES.find((t) => t.id === id) ?? BOARD_THEMES[0];
}

export function getPieceSet(id: string): PieceSet {
  return PIECE_SETS.find((p) => p.id === id) ?? PIECE_SETS[0];
}
