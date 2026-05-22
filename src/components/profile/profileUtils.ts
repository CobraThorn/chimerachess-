import { deriveCognitiveMetrics } from "../../ai/cognition/metrics";
import { getPrimaryDef, getSubdivisionDef } from "../../ai/cognition/archetypes";
import { createPlayStyleProfile } from "../../ai/playStyle";
import type { ChimeraMemory, StoredGame } from "../../ai";
import { INITIAL_USER_ELO } from "../../ai/types";

export const PROFILE_NAME_KEY = "chimera-profile-name";

export function getDisplayName(): string {
  try {
    return localStorage.getItem(PROFILE_NAME_KEY)?.trim() || "Operator";
  } catch {
    return "Operator";
  }
}

export function setDisplayName(name: string): void {
  localStorage.setItem(PROFILE_NAME_KEY, name.trim() || "Operator");
}

export function getRankTitle(elo: number): string {
  if (elo >= 500) return "Grandmaster";
  if (elo >= 400) return "Master";
  if (elo >= 300) return "Expert";
  if (elo >= 220) return "Specialist";
  if (elo >= 160) return "Tactician";
  if (elo >= 120) return "Operative";
  return "Initiate";
}

export function winRate(memory: ChimeraMemory): number {
  const { userWins, totalGames } = memory.stats;
  if (totalGames === 0) return 0;
  return Math.round((userWins / totalGames) * 100);
}

export function avgCpLoss(memory: ChimeraMemory): number {
  const s = memory.userStyle;
  if (!s || s.cpLossSamples === 0) return 0;
  return Math.round(s.cpLossSum / s.cpLossSamples);
}

export function formatResult(result: StoredGame["result"]): string {
  if (result === "user-win") return "Win";
  if (result === "chimera-win") return "Loss";
  return "Draw";
}

export function formatDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress?: string;
}

export function computeAchievements(memory: ChimeraMemory): Achievement[] {
  const { stats, adaptation } = memory;
  const ms = memory.mirrorStats?.total ?? 0;
  const conf = memory.cognitiveIdentity?.confidence ?? 0;
  const moves = memory.userStyle?.moves ?? 0;

  return [
    {
      id: "first-game",
      title: "First Contact",
      description: "Complete a rated game vs CHIMERA",
      unlocked: stats.totalGames >= 1,
      progress: `${Math.min(stats.totalGames, 1)}/1`,
    },
    {
      id: "first-win",
      title: "First Strike",
      description: "Defeat CHIMERA",
      unlocked: stats.userWins >= 1,
      progress: `${Math.min(stats.userWins, 1)}/1`,
    },
    {
      id: "five-wins",
      title: "Habit Breaker",
      description: "Win 5 games against CHIMERA",
      unlocked: stats.userWins >= 5,
      progress: `${Math.min(stats.userWins, 5)}/5`,
    },
    {
      id: "ten-games",
      title: "In the System",
      description: "Play 10 rated games",
      unlocked: stats.totalGames >= 10,
      progress: `${Math.min(stats.totalGames, 10)}/10`,
    },
    {
      id: "adapted",
      title: "Known Quantity",
      description: "CHIMERA adapts 50%+ to your habits",
      unlocked: adaptation >= 50,
      progress: `${adaptation}%`,
    },
    {
      id: "mirror",
      title: "Mirror Witness",
      description: "Watch a CHIMERA vs CHIMERA duel",
      unlocked: ms >= 1,
      progress: `${Math.min(ms, 1)}/1`,
    },
    {
      id: "moves-100",
      title: "Volume Shooter",
      description: "Record 100 moves in your profile",
      unlocked: moves >= 100,
      progress: `${Math.min(moves, 100)}/100`,
    },
    {
      id: "identity",
      title: "Mapped Mind",
      description: "Cognitive identity confidence 60%+",
      unlocked: conf >= 60,
      progress: `${conf}%`,
    },
  ];
}

export function archetypeHeadline(memory: ChimeraMemory): string {
  const id = memory.cognitiveIdentity;
  if (!id) return "Identity forming";
  const primary = getPrimaryDef(id.primary);
  const sub = getSubdivisionDef(id.subdivision);
  return sub ? `${primary.name} · ${sub.label}` : primary.name;
}

export function cognitiveSnapshot(memory: ChimeraMemory) {
  const profile = memory.userStyle ?? createPlayStyleProfile(INITIAL_USER_ELO);
  const m = deriveCognitiveMetrics(profile);
  return [
    { label: "Tactical eye", value: m.tactical.tacticSpotting },
    { label: "Precision", value: m.tactical.calculationDepth },
    { label: "Positional play", value: m.positional.strategicPatience },
    { label: "Emotional recovery", value: m.psychological.emotionalRecovery },
    { label: "Risk appetite", value: m.behavioural.riskAppetite },
    { label: "Conversion", value: m.behavioural.conversionStyle },
  ];
}
