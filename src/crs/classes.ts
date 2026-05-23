/** Prestige tiers — visible identity layer over raw CRS number. */

export interface ChimeraClass {
  id: string;
  name: string;
  min: number;
  max: number;
  emblem: string;
  accent: string;
}

export const CHIMERA_CLASSES: ChimeraClass[] = [
  { id: "ember", name: "Ember", min: 0, max: 699, emblem: "◇", accent: "rgba(255,120,80,0.85)" },
  { id: "hunter", name: "Hunter", min: 700, max: 999, emblem: "◈", accent: "rgba(200,180,140,0.85)" },
  { id: "sentinel", name: "Sentinel", min: 1000, max: 1299, emblem: "▣", accent: "rgba(160,200,180,0.85)" },
  { id: "warden", name: "Warden", min: 1300, max: 1599, emblem: "⬡", accent: "rgba(0,229,255,0.75)" },
  { id: "sovereign", name: "Sovereign", min: 1600, max: 1899, emblem: "♛", accent: "rgba(232,197,71,0.9)" },
  { id: "ascendant", name: "Ascendant", min: 1900, max: 2199, emblem: "✦", accent: "rgba(180,160,255,0.9)" },
  { id: "apex", name: "Apex", min: 2200, max: 2499, emblem: "◆", accent: "rgba(255,255,255,0.9)" },
  { id: "chimera", name: "Chimera", min: 2500, max: 9999, emblem: "☿", accent: "rgba(232,197,71,1)" },
];

export function getChimeraClass(rating: number): ChimeraClass {
  const r = Math.max(0, Math.round(rating));
  return (
    CHIMERA_CLASSES.find((c) => r >= c.min && r <= c.max) ??
    CHIMERA_CLASSES[0]!
  );
}

export function classIndex(id: string): number {
  return CHIMERA_CLASSES.findIndex((c) => c.id === id);
}

/** Rough population percentile from rating (no server census yet). */
export function estimatePercentile(rating: number): number {
  const p = 100 / (1 + Math.exp(-(rating - 1350) / 220));
  return Math.max(1, Math.min(99, Math.round(p)));
}

export function percentileLabel(rating: number): string {
  return `Top ${100 - estimatePercentile(rating)}%`;
}
