export type PrimaryArchetypeId =
  | "architect"
  | "warlord"
  | "oracle"
  | "phantom"
  | "titan"
  | "alchemist"
  | "sovereign";

export type SubdivisionId =
  | "architect-fortress"
  | "architect-commander"
  | "architect-machine"
  | "warlord-berserker"
  | "warlord-tyrant"
  | "warlord-predator"
  | "oracle-prophet"
  | "oracle-illusionist"
  | "oracle-visionary"
  | "phantom-assassin"
  | "phantom-mirage"
  | "phantom-venom"
  | "titan-bastion"
  | "titan-anvil"
  | "titan-sentinel"
  | "alchemist-madman"
  | "alchemist-artist"
  | "alchemist-gambler"
  | "sovereign-emperor"
  | "sovereign-ascendant"
  | "sovereign-apex";

export interface ArchetypeWeights {
  [metric: string]: number;
}

export interface SubdivisionDef {
  id: SubdivisionId;
  label: string;
  tagline: string;
  weightAdjust: ArchetypeWeights;
}

export interface PrimaryArchetypeDef {
  id: PrimaryArchetypeId;
  name: string;
  cognition: string;
  essence: string;
  weights: ArchetypeWeights;
  subdivisions: SubdivisionDef[];
}

export const PRIMARY_ARCHETYPES: PrimaryArchetypeDef[] = [
  {
    id: "architect",
    name: "The Architect",
    cognition: "Strategic systems thinker",
    essence: "Long-term control, structural pressure, calculated optimisation",
    weights: {
      strategicPatience: 0.18,
      structureQuality: 0.2,
      prophylaxis: 0.14,
      conversionStyle: 0.14,
      calculationDepth: 0.12,
      precision: 0.12,
      riskAppetite: -0.12,
      panicFrequency: -0.1,
      chaosTolerance: -0.08,
    },
    subdivisions: [
      {
        id: "architect-fortress",
        label: "Fortress",
        tagline: "Ultra-defensive positional suffocation",
        weightAdjust: { structureQuality: 0.12, prophylaxis: 0.1, riskAppetite: -0.15, sacrificeFrequency: -0.08 },
      },
      {
        id: "architect-commander",
        label: "Commander",
        tagline: "Builds pressure, attacks decisively",
        weightAdjust: { initiativeValuation: 0.12, conversionStyle: 0.1, attackSpeed: 0.08 },
      },
      {
        id: "architect-machine",
        label: "Machine",
        tagline: "Precision-focused, emotionally cold",
        weightAdjust: { calculationDepth: 0.15, precision: 0.12, panicFrequency: -0.12, tiltBehaviour: -0.1 },
      },
    ],
  },
  {
    id: "warlord",
    name: "The Warlord",
    cognition: "Aggressive battlefield controller",
    essence: "Initiative, pressure, domination, forcing lines",
    weights: {
      initiativeValuation: 0.2,
      attackSpeed: 0.16,
      sacrificeFrequency: 0.1,
      tacticSpotting: 0.1,
      movePacing: 0.1,
      chaosTolerance: 0.08,
      strategicPatience: -0.08,
    },
    subdivisions: [
      {
        id: "warlord-berserker",
        label: "Berserker",
        tagline: "Chaotic overwhelming aggression",
        weightAdjust: { chaosTolerance: 0.15, sacrificeFrequency: 0.12, riskAppetite: 0.1, panicFrequency: 0.05 },
      },
      {
        id: "warlord-tyrant",
        label: "Tyrant",
        tagline: "Positional domination with initiative",
        weightAdjust: { structureQuality: 0.1, initiativeValuation: 0.12, spaceManagement: 0.08 },
      },
      {
        id: "warlord-predator",
        label: "Predator",
        tagline: "Precise tactical killer",
        weightAdjust: { tacticSpotting: 0.14, calculationDepth: 0.1, conversionStyle: 0.08 },
      },
    ],
  },
  {
    id: "oracle",
    name: "The Oracle",
    cognition: "Deep intuitive strategist",
    essence: "Hidden ideas, long concepts, psychological foresight",
    weights: {
      strategicPatience: 0.14,
      prophylaxis: 0.12,
      calculationDepth: 0.14,
      tacticSpotting: 0.1,
      spaceManagement: 0.1,
      sacrificeFrequency: -0.08,
      chaosTolerance: -0.06,
    },
    subdivisions: [
      {
        id: "oracle-prophet",
        label: "Prophet",
        tagline: "Deep strategic forecasting",
        weightAdjust: { strategicPatience: 0.12, prophylaxis: 0.1, calculationDepth: 0.08 },
      },
      {
        id: "oracle-illusionist",
        label: "Illusionist",
        tagline: "Deceptive move sequencing",
        weightAdjust: { trapInduction: 0.14, tacticSpotting: 0.08, movePacing: 0.06 },
      },
      {
        id: "oracle-visionary",
        label: "Visionary",
        tagline: "Abstract positional creativity",
        weightAdjust: { spaceManagement: 0.12, structureQuality: 0.08, chaosTolerance: 0.06 },
      },
    ],
  },
  {
    id: "phantom",
    name: "The Phantom",
    cognition: "Ambush and deception specialist",
    essence: "Traps, manipulation, hidden tactics, psychological pressure",
    weights: {
      trapInduction: 0.2,
      tacticSpotting: 0.14,
      pressureTiming: 0.1,
      tiltBehaviour: 0.06,
      sacrificeFrequency: 0.08,
      structureQuality: -0.06,
    },
    subdivisions: [
      {
        id: "phantom-assassin",
        label: "Assassin",
        tagline: "Precision tactical traps",
        weightAdjust: { trapInduction: 0.12, tacticSpotting: 0.14, attackSpeed: 0.08 },
      },
      {
        id: "phantom-mirage",
        label: "Mirage",
        tagline: "Deceptive positional manipulation",
        weightAdjust: { strategicPatience: 0.1, trapInduction: 0.1, prophylaxis: 0.06 },
      },
      {
        id: "phantom-venom",
        label: "Venom",
        tagline: "Slow psychological poisoning",
        weightAdjust: { strategicPatience: 0.12, pressureCollapse: 0.08, movePacing: -0.06 },
      },
    ],
  },
  {
    id: "titan",
    name: "The Titan",
    cognition: "Defensive resilience and endurance",
    essence: "Solidity, defensive accuracy, counterpunching",
    weights: {
      structureQuality: 0.18,
      emotionalRecovery: 0.12,
      prophylaxis: 0.12,
      pressureCollapse: -0.14,
      panicFrequency: -0.1,
      conversionStyle: 0.1,
      riskAppetite: -0.1,
    },
    subdivisions: [
      {
        id: "titan-bastion",
        label: "Bastion",
        tagline: "Nearly unbreakable defense",
        weightAdjust: { structureQuality: 0.14, prophylaxis: 0.1, sacrificeFrequency: -0.1 },
      },
      {
        id: "titan-anvil",
        label: "Anvil",
        tagline: "Absorbs pressure, counterattacks",
        weightAdjust: { emotionalRecovery: 0.12, conversionStyle: 0.1, initiativeValuation: 0.06 },
      },
      {
        id: "titan-sentinel",
        label: "Sentinel",
        tagline: "Disciplined strategic defense",
        weightAdjust: { calculationDepth: 0.1, strategicPatience: 0.1, precision: 0.08 },
      },
    ],
  },
  {
    id: "alchemist",
    name: "The Alchemist",
    cognition: "Creative chaos manipulator",
    essence: "Experimentation, sacrifices, dynamic imbalance",
    weights: {
      chaosTolerance: 0.22,
      sacrificeFrequency: 0.16,
      riskAppetite: 0.14,
      movePacing: 0.08,
      structureQuality: -0.1,
    },
    subdivisions: [
      {
        id: "alchemist-madman",
        label: "Madman",
        tagline: "Extreme chaos creator",
        weightAdjust: { chaosTolerance: 0.18, riskAppetite: 0.12, panicFrequency: 0.06 },
      },
      {
        id: "alchemist-artist",
        label: "Artist",
        tagline: "Elegant creative attacker",
        weightAdjust: { tacticSpotting: 0.12, sacrificeFrequency: 0.1, calculationDepth: 0.06 },
      },
      {
        id: "alchemist-gambler",
        label: "Gambler",
        tagline: "Highly speculative tactics",
        weightAdjust: { riskAppetite: 0.16, sacrificeFrequency: 0.12, pressureCollapse: 0.05 },
      },
    ],
  },
  {
    id: "sovereign",
    name: "The Sovereign",
    cognition: "Balanced strategic mastery",
    essence: "Rare adaptive blend of aggression, structure, and precision",
    weights: {
      calculationDepth: 0.1,
      initiativeValuation: 0.08,
      structureQuality: 0.08,
      conversionStyle: 0.08,
      emotionalRecovery: 0.08,
      tacticSpotting: 0.08,
      strategicPatience: 0.06,
    },
    subdivisions: [
      {
        id: "sovereign-emperor",
        label: "Emperor",
        tagline: "Strategic domination",
        weightAdjust: { structureQuality: 0.1, conversionStyle: 0.1, initiativeValuation: 0.08 },
      },
      {
        id: "sovereign-ascendant",
        label: "Ascendant",
        tagline: "Rapidly evolving universal style",
        weightAdjust: { movePacing: 0.08, emotionalRecovery: 0.08, chaosTolerance: 0.06 },
      },
      {
        id: "sovereign-apex",
        label: "Apex",
        tagline: "Near-complete behavioural profile",
        weightAdjust: { calculationDepth: 0.1, precision: 0.1, conversionStyle: 0.08 },
      },
    ],
  },
];

export function getPrimaryDef(id: PrimaryArchetypeId): PrimaryArchetypeDef {
  return PRIMARY_ARCHETYPES.find((a) => a.id === id)!;
}

export function getSubdivisionDef(id: SubdivisionId): SubdivisionDef | undefined {
  for (const p of PRIMARY_ARCHETYPES) {
    const sub = p.subdivisions.find((s) => s.id === id);
    if (sub) return sub;
  }
  return undefined;
}
