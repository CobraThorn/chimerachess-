/**
 * 12 macro → 60 subtypes (×5 mind) → 400 fine phenotypes (×5 soul per subtype chain).
 * Users see hierarchy first; fine codes stay under the hood.
 */

export type MacroArchetypeId =
  | "calculative-aggressor"
  | "tactical-predator"
  | "positional-hunter"
  | "strategic-architect"
  | "dynamic-gambler"
  | "defensive-fortress"
  | "endgame-engineer"
  | "initiative-zealot"
  | "chaos-artist"
  | "prophylactic-sage"
  | "counterattacking-phantom"
  | "grinding-titan";

export interface MacroArchetypeDef {
  id: MacroArchetypeId;
  /** User-facing e.g. "The Tactical Predator" */
  title: string;
  essence: string;
  /** Map 16Personalities base codes → this macro */
  baseCodes: string[];
}

export interface SubtypeDef {
  id: string;
  macroId: MacroArchetypeId;
  mindId: number;
  label: string;
  tagline: string;
}

export const MACRO_ARCHETYPES: MacroArchetypeDef[] = [
  {
    id: "strategic-architect",
    title: "The Strategic Architect",
    essence: "Builds long-term advantages and punishes structural errors.",
    baseCodes: ["INTJ", "INTP"],
  },
  {
    id: "calculative-aggressor",
    title: "The Calculative Aggressor",
    essence: "Forces the issue when the math says the attack works.",
    baseCodes: ["ENTJ", "ESTJ"],
  },
  {
    id: "tactical-predator",
    title: "The Tactical Predator",
    essence: "Overwhelms through initiative and calculated pressure.",
    baseCodes: ["ENTP", "ESTP"],
  },
  {
    id: "positional-hunter",
    title: "The Positional Hunter",
    essence: "Squeezes tiny edges until the position cracks.",
    baseCodes: ["INFJ", "ISFJ"],
  },
  {
    id: "prophylactic-sage",
    title: "The Prophylactic Sage",
    essence: "Reads your plans early and defuses them quietly.",
    baseCodes: ["ISTJ"],
  },
  {
    id: "defensive-fortress",
    title: "The Defensive Fortress",
    essence: "Absorbs pressure and strikes on your overreach.",
    baseCodes: ["ISFJ"],
  },
  {
    id: "grinding-titan",
    title: "The Grinding Titan",
    essence: "Wins long games through patience and technique.",
    baseCodes: ["ISTJ", "ESTJ"],
  },
  {
    id: "endgame-engineer",
    title: "The Endgame Engineer",
    essence: "Converts small advantages with machine-like precision.",
    baseCodes: ["INTJ", "ISTJ"],
  },
  {
    id: "initiative-zealot",
    title: "The Initiative Zealot",
    essence: "Lives for tempo — every move asks a question.",
    baseCodes: ["ENTJ", "ENFJ", "ESTP"],
  },
  {
    id: "dynamic-gambler",
    title: "The Dynamic Gambler",
    essence: "Thrives in imbalance, sacrifices, and complications.",
    baseCodes: ["ENFP", "ENTP"],
  },
  {
    id: "chaos-artist",
    title: "The Chaos Artist",
    essence: "Makes the board uncomfortable and profits from confusion.",
    baseCodes: ["ESFP", "ENFP"],
  },
  {
    id: "counterattacking-phantom",
    title: "The Counterattacking Phantom",
    essence: "Lets you overextend, then punishes in the shadows.",
    baseCodes: ["ISTP", "ISFP", "INFJ"],
  },
];

const MIND_SUBTYPE_LABELS = [
  { label: "Focused Striker", tagline: "Clarity under tension — picks the right moment." },
  { label: "Curious Experimenter", tagline: "Tests ideas quickly, refines what works." },
  { label: "Steady Controller", tagline: "Rarely rushed — improves the position move by move." },
  { label: "Restless Presser", tagline: "Keeps the heat on; hates passive positions." },
  { label: "Visionary Planner", tagline: "Sees five moves ahead of the crowd." },
];

export const SUBTYPE_COUNT = MACRO_ARCHETYPES.length * MIND_SUBTYPE_LABELS.length;

function buildSubtypes(): SubtypeDef[] {
  const subs: SubtypeDef[] = [];
  for (const macro of MACRO_ARCHETYPES) {
    for (const mind of MIND_SUBTYPE_LABELS) {
      const mindId = MIND_SUBTYPE_LABELS.indexOf(mind);
      subs.push({
        id: `${macro.id}-m${mindId}`,
        macroId: macro.id,
        mindId,
        label: `${macro.title.replace(/^The /, "")} · ${mind.label}`,
        tagline: mind.tagline,
      });
    }
  }
  return subs;
}

export const PERSONALITY_SUBTYPES_60: SubtypeDef[] = buildSubtypes();

const BASE_TO_MACRO = new Map<string, MacroArchetypeId>();
for (const m of MACRO_ARCHETYPES) {
  for (const code of m.baseCodes) {
    if (!BASE_TO_MACRO.has(code)) BASE_TO_MACRO.set(code, m.id);
  }
}

export function macroForBaseCode(baseCode: string): MacroArchetypeDef {
  const id = BASE_TO_MACRO.get(baseCode.toUpperCase()) ?? "strategic-architect";
  return MACRO_ARCHETYPES.find((m) => m.id === id)!;
}

export function subtypeFor(macroId: MacroArchetypeId, mindId: number): SubtypeDef {
  return (
    PERSONALITY_SUBTYPES_60.find(
      (s) => s.macroId === macroId && s.mindId === mindId
    ) ?? PERSONALITY_SUBTYPES_60[0]!
  );
}

export function getMacroById(id: MacroArchetypeId): MacroArchetypeDef {
  return MACRO_ARCHETYPES.find((m) => m.id === id)!;
}
