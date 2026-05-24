import type { PhenotypeRadarValues } from "../ai/cognition/personalityRadar";
import { ELITE_PLAYER_REFERENCES } from "../ai/cognition/personalityRadar";
import legendGames from "./legendGames.json";

export type LegendId =
  | "hikaru"
  | "magnus"
  | "tal"
  | "karpov"
  | "kasparov"
  | "naroditsky";

export type LegendBannerKind = "memorial" | "honorary";

export interface LegendBanner {
  kind: LegendBannerKind;
  label: string;
  sublabel?: string;
}

export interface LegendGame {
  title: string;
  event: string;
  year: number;
  opponent: string;
  result: string;
  /** Color the featured legend played */
  legendColor: "w" | "b";
  highlightPly?: number;
  moves: string[];
}

export interface LegendProfile {
  id: LegendId;
  name: string;
  fullName: string;
  epithet: string;
  years: string;
  country: string;
  imageUrl: string;
  banner?: LegendBanner;
  /** Exactly four sentences */
  bio: [string, string, string, string];
  radar: PhenotypeRadarValues;
  game: LegendGame;
}

const moves = legendGames as Record<LegendId, string[]>;

function refRadar(
  id: "nakamura" | "carlsen" | "kasparov"
): PhenotypeRadarValues {
  const row = ELITE_PLAYER_REFERENCES.find((r) => r.id === id);
  if (!row) throw new Error(`Missing elite reference: ${id}`);
  return { ...row.values };
}

export const LEGENDS: LegendProfile[] = [
  {
    id: "hikaru",
    name: "Hikaru",
    fullName: "Hikaru Nakamura",
    epithet: "Speed Chess Icon",
    years: "b. 1987",
    country: "United States",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/5/55/Hikaru_Nakamura_%28cropped%29.jpg/480px-Hikaru_Nakamura_%28cropped%29.jpg",
    bio: [
      "Hikaru Nakamura became a grandmaster at fifteen and has since defined elite blitz and bullet chess for a global audience.",
      "His intuitive tactics and fast pattern recognition make him one of the most dangerous speed players in history.",
      "On the classical board he favors sharp Sicilians and pragmatic piece activity over slow maneuvering.",
      "CHIMERA maps his profile as high tactical vision with bold risk tolerance—ideal for training initiative under clock pressure.",
    ],
    radar: refRadar("nakamura"),
    game: {
      title: "Najdorf Fireworks",
      event: "Featured Sicilian slugfest",
      year: 2010,
      opponent: "GM opponent",
      result: "1–0",
      legendColor: "w",
      highlightPly: 22,
      moves: moves.hikaru,
    },
  },
  {
    id: "magnus",
    name: "Magnus",
    fullName: "Magnus Carlsen",
    epithet: "The Grindmaster",
    years: "b. 1990",
    country: "Norway",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/0/0f/Magnus_Carlsen_2014_%28cropped%29.jpg/480px-Magnus_Carlsen_2014_%28cropped%29.jpg",
    bio: [
      "Magnus Carlsen has held the world number one spot for longer than any player in the modern rating era.",
      "He converts tiny edges through endgame precision, patience, and relentless practical decision-making.",
      "His Berlin Ruy Lopez and squeeze-style technique are textbook examples of modern professional chess.",
      "CHIMERA highlights his conversion ability and consistency under pressure—the benchmark for closing won positions.",
    ],
    radar: refRadar("carlsen"),
    game: {
      title: "Berlin Initiative",
      event: "World Championship style Ruy Lopez",
      year: 2016,
      opponent: "Sergey Karjakin",
      result: "1–0",
      legendColor: "w",
      highlightPly: 18,
      moves: moves.magnus,
    },
  },
  {
    id: "tal",
    name: "Mikhail Tal",
    fullName: "Mikhail Tal",
    epithet: "The Magician from Riga",
    years: "1936–1992",
    country: "Latvia / USSR",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/4/4b/Mikhail_Tal_1967.jpg/480px-Mikhail_Tal_1967.jpg",
    banner: {
      kind: "memorial",
      label: "In memoriam",
      sublabel: "1936 – 1992 · 8th World Champion",
    },
    bio: [
      "Mikhail Tal became World Champion in 1960 with the most spectacular attacking chess the Soviet school had ever produced.",
      "He treated complications as invitations, sacrificing material to keep kings unsafe and clocks ticking.",
      "His 1965 Candidates win over Bent Larsen featured one of the most famous knight sacrifices in chess literature.",
      "CHIMERA honors Tal with maximum tactical vision and risk tolerance—study his games to train calculation bravery.",
    ],
    radar: {
      tacticalVision: 99,
      positionalUnderstanding: 82,
      aggression: 97,
      riskTolerance: 95,
      endgamePrecision: 78,
      openingPreparation: 70,
      timeManagement: 65,
      consistencyUnderPressure: 72,
      patternRecognition: 96,
      conversionAbility: 85,
    },
    game: {
      title: "A Bent Pin",
      event: "Candidates Semifinal, Bled",
      year: 1965,
      opponent: "Bent Larsen",
      result: "1–0",
      legendColor: "w",
      highlightPly: 32,
      moves: moves.tal,
    },
  },
  {
    id: "karpov",
    name: "Anatoly Karpov",
    fullName: "Anatoly Karpov",
    epithet: "The Boa Constrictor",
    years: "b. 1951",
    country: "Russia",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/Anatoly_Karpov_1995_%28cropped%29.jpg/480px-Anatoly_Karpov_1995_%28cropped%29.jpg",
    bio: [
      "Anatoly Karpov was World Champion from 1975 to 1985 and again in the FIDE title lineage through 1993.",
      "He suffocates opponents by improving pieces quietly, trading into favorable endings, and denying counterplay.",
      "His Ruy Lopez and Queen's Indian systems set the template for prophylactic chess in the computer age.",
      "CHIMERA scores him highest on positional understanding and consistency—train here to master the long squeeze.",
    ],
    radar: {
      tacticalVision: 88,
      positionalUnderstanding: 97,
      aggression: 58,
      riskTolerance: 42,
      endgamePrecision: 94,
      openingPreparation: 92,
      timeManagement: 88,
      consistencyUnderPressure: 95,
      patternRecognition: 90,
      conversionAbility: 93,
    },
    game: {
      title: "Spanish Squeeze",
      event: "Classical Ruy Lopez mastery",
      year: 1974,
      opponent: "GM opponent",
      result: "1–0",
      legendColor: "w",
      highlightPly: 20,
      moves: moves.karpov,
    },
  },
  {
    id: "kasparov",
    name: "Garry Kasparov",
    fullName: "Garry Kasparov",
    epithet: "The Beast of Baku",
    years: "b. 1963",
    country: "Azerbaijan / Russia",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/6/6f/Garry_Kasparov_%28cropped%29.jpg/480px-Garry_Kasparov_%28cropped%29.jpg",
    bio: [
      "Garry Kasparov dominated world chess from 1985 to 2000 with preparation depth and dynamic attacking play.",
      "He fused Botvinnik's scientific training with Tal's initiative, producing generations of opening theory.",
      "His 1999 rout of Veselin Topalov in Wijk aan Zee is widely called the greatest tournament game ever played.",
      "CHIMERA uses Kasparov as the benchmark for tactical vision and opening preparation in elite comparisons.",
    ],
    radar: refRadar("kasparov"),
    game: {
      title: "Kasparov's Immortal",
      event: "Hoogovens, Wijk aan Zee",
      year: 1999,
      opponent: "Veselin Topalov",
      result: "1–0",
      legendColor: "w",
      highlightPly: 48,
      moves: moves.kasparov,
    },
  },
  {
    id: "naroditsky",
    name: "Danya",
    fullName: "Daniel Naroditsky",
    epithet: "Speed Chess Teacher & GM",
    years: "1995–2025",
    country: "United States",
    imageUrl:
      "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8e/Daniel_Naroditsky_in_2024.jpg/480px-Daniel_Naroditsky_in_2024.jpg",
    banner: {
      kind: "memorial",
      label: "In memoriam",
      sublabel: "1995 – 2025 · GM, author, and beloved chess educator",
    },
    bio: [
      "Daniel \"Danya\" Naroditsky was an American grandmaster who became one of the youngest chess authors in history at age fourteen.",
      "He thrilled millions as a streamer and commentator, blending blistering speed-chess skill with lucid, generous teaching.",
      "His 2024 victory over Hikaru Nakamura showcased the sacrificial flair and calculation that defined his best games.",
      "CHIMERA honors Naroditsky as a legend of the board and the classroom—pattern recognition, speed, and heart.",
    ],
    radar: {
      tacticalVision: 94,
      positionalUnderstanding: 86,
      aggression: 88,
      riskTolerance: 85,
      endgamePrecision: 90,
      openingPreparation: 82,
      timeManagement: 97,
      consistencyUnderPressure: 82,
      patternRecognition: 96,
      conversionAbility: 91,
    },
    game: {
      title: "Storm vs the World #1",
      event: "Chess.com Main Event",
      year: 2024,
      opponent: "Hikaru Nakamura",
      result: "1–0",
      legendColor: "w",
      highlightPly: 44,
      moves: moves.naroditsky,
    },
  },
];

export function getLegendById(id: LegendId): LegendProfile | undefined {
  return LEGENDS.find((l) => l.id === id);
}

export function radarValuesToSeries(
  values: PhenotypeRadarValues
): number[] {
  return [
    values.tacticalVision,
    values.positionalUnderstanding,
    values.aggression,
    values.riskTolerance,
    values.endgamePrecision,
    values.openingPreparation,
    values.timeManagement,
    values.consistencyUnderPressure,
    values.patternRecognition,
    values.conversionAbility,
  ];
}
