/**
 * 400 CHIMERA personality types — 16 MBTI-style bases × 25 mind/soul facets
 * (same combinatorial idea as 16Personalities: type + nuanced identity).
 */
import type { ArchetypeWeights } from "./archetypes";
import {
  getPrimaryDef,
  type PrimaryArchetypeId,
  type SubdivisionId,
} from "./archetypes";
import {
  macroForBaseCode,
  subtypeFor,
  type MacroArchetypeId,
} from "./personalityHierarchy";
import { buildRichProfile, type PersonalityRichProfile } from "./personalityNarrative";

export type PersonalityRole = "Analyst" | "Diplomat" | "Sentinel" | "Explorer";

export interface PersonalityMindFacet {
  id: number;
  label: string;
  short: string;
}

export interface PersonalitySoulFacet {
  id: number;
  label: string;
  short: string;
}

export interface PersonalityBase16 {
  code: string;
  title: string;
  role: PersonalityRole;
  primary: PrimaryArchetypeId;
  tagline: string;
}

export interface PersonalityTypeDef {
  id: string;
  typeCode: string;
  baseCode: string;
  title: string;
  name: string;
  role: PersonalityRole;
  tagline: string;
  mind: string;
  soul: string;
  mindId: number;
  soulId: number;
  primary: PrimaryArchetypeId;
  subdivision: SubdivisionId;
  weightAdjust: ArchetypeWeights;
  macroId: MacroArchetypeId;
  subtypeId: string;
  /** 1–400 human-facing fine type number */
  fineIndex: number;
}

export const PERSONALITY_MIND_FACETS: PersonalityMindFacet[] = [
  { id: 0, label: "Focused", short: "F" },
  { id: 1, label: "Curious", short: "C" },
  { id: 2, label: "Steady", short: "S" },
  { id: 3, label: "Restless", short: "R" },
  { id: 4, label: "Visionary", short: "V" },
];

export const PERSONALITY_SOUL_FACETS: PersonalitySoulFacet[] = [
  { id: 0, label: "Calm", short: "A" },
  { id: 1, label: "Bold", short: "B" },
  { id: 2, label: "Warm", short: "W" },
  { id: 3, label: "Cool", short: "L" },
  { id: 4, label: "Wild", short: "X" },
];

/** 16 core types — INTJ-style codes mapped to CHIMERA archetypes */
export const PERSONALITY_BASE_16: PersonalityBase16[] = [
  {
    code: "INTJ",
    title: "Architect",
    role: "Analyst",
    primary: "architect",
    tagline: "Strategic mastermind — long plans, cold calculation",
  },
  {
    code: "INTP",
    title: "Logician",
    role: "Analyst",
    primary: "architect",
    tagline: "Abstract theorist — probes ideas before committing",
  },
  {
    code: "ENTJ",
    title: "Commander",
    role: "Analyst",
    primary: "sovereign",
    tagline: "Decisive leader — seizes space and initiative",
  },
  {
    code: "ENTP",
    title: "Debater",
    role: "Analyst",
    primary: "alchemist",
    tagline: "Provocateur — thrives in complications and traps",
  },
  {
    code: "INFJ",
    title: "Advocate",
    role: "Diplomat",
    primary: "oracle",
    tagline: "Quiet visionary — reads intentions behind moves",
  },
  {
    code: "INFP",
    title: "Mediator",
    role: "Diplomat",
    primary: "oracle",
    tagline: "Idealist — creative, principled, hard to pin down",
  },
  {
    code: "ENFJ",
    title: "Protagonist",
    role: "Diplomat",
    primary: "warlord",
    tagline: "Charismatic pressure — coordinates attack waves",
  },
  {
    code: "ENFP",
    title: "Campaigner",
    role: "Diplomat",
    primary: "alchemist",
    tagline: "Enthusiastic chaos — sacrifices for initiative",
  },
  {
    code: "ISTJ",
    title: "Logistician",
    role: "Sentinel",
    primary: "titan",
    tagline: "Reliable structure — punishes sloppy play",
  },
  {
    code: "ISFJ",
    title: "Defender",
    role: "Sentinel",
    primary: "titan",
    tagline: "Protective — fortifies then counterattacks",
  },
  {
    code: "ESTJ",
    title: "Executive",
    role: "Sentinel",
    primary: "sovereign",
    tagline: "Order and tempo — converts small edges",
  },
  {
    code: "ESFJ",
    title: "Consul",
    role: "Sentinel",
    primary: "warlord",
    tagline: "Harmony through control — restricts your plans",
  },
  {
    code: "ISTP",
    title: "Virtuoso",
    role: "Explorer",
    primary: "phantom",
    tagline: "Tactical craftsman — cold in crisis",
  },
  {
    code: "ISFP",
    title: "Adventurer",
    role: "Explorer",
    primary: "phantom",
    tagline: "Flexible artist — surprises in open positions",
  },
  {
    code: "ESTP",
    title: "Entrepreneur",
    role: "Explorer",
    primary: "warlord",
    tagline: "Bold opportunist — strikes when you hesitate",
  },
  {
    code: "ESFP",
    title: "Entertainer",
    role: "Explorer",
    primary: "alchemist",
    tagline: "High-energy flair — lives for tactics on the clock",
  },
];

function subdivisionFor(
  primary: PrimaryArchetypeId,
  mindId: number,
  soulId: number
): SubdivisionId {
  const subs = getPrimaryDef(primary).subdivisions;
  const idx = (mindId * 5 + soulId) % subs.length;
  return subs[idx]!.id;
}

function weightAdjustFor(
  base: PersonalityBase16,
  mindId: number,
  soulId: number
): ArchetypeWeights {
  const roleAtk =
    base.role === "Explorer" ? 0.04 : base.role === "Analyst" ? 0.01 : 0.02;
  const mindAtk = ([0.02, 0.04, -0.02, 0.08, 0.05][mindId] ?? 0) + roleAtk;
  const mindDef = [0.06, 0, 0.08, -0.04, 0.02][mindId] ?? 0;
  const soulRisk = [ -0.06, 0.1, 0.04, -0.02, 0.12][soulId] ?? 0;
  const soulChaos = [-0.08, 0.06, 0.02, -0.04, 0.14][soulId] ?? 0;

  return {
    initiativeValuation: mindAtk + soulRisk * 0.5,
    attackSpeed: mindAtk,
    structureQuality: mindDef,
    prophylaxis: mindDef * 0.8,
    calculationDepth: mindId === 0 || mindId === 2 ? 0.1 : 0,
    precision: mindId === 0 ? 0.08 : mindId === 3 ? -0.06 : 0,
    riskAppetite: soulRisk,
    chaosTolerance: soulChaos,
    sacrificeFrequency: soulChaos * 0.6 + mindAtk * 0.4,
    panicFrequency: soulId === 4 ? 0.06 : soulId === 0 ? -0.08 : 0,
    tiltBehaviour: soulId === 4 ? 0.05 : -0.03,
  };
}

function buildPersonalityCatalog(): PersonalityTypeDef[] {
  const catalog: PersonalityTypeDef[] = [];
  let fineIndex = 0;

  for (const base of PERSONALITY_BASE_16) {
    for (const mind of PERSONALITY_MIND_FACETS) {
      for (const soul of PERSONALITY_SOUL_FACETS) {
        fineIndex += 1;
        const macro = macroForBaseCode(base.code);
        const subtype = subtypeFor(macro.id, mind.id);
        const id = `${base.code.toLowerCase()}-${mind.id}-${soul.id}`;
        const typeCode = `${base.code}-${mind.short}${soul.short}`;
        const subdivision = subdivisionFor(base.primary, mind.id, soul.id);
        const subLabel = getPrimaryDef(base.primary).subdivisions.find(
          (s) => s.id === subdivision
        )?.label;

        catalog.push({
          id,
          typeCode,
          baseCode: base.code,
          title: base.title,
          name: `${macro.title.replace(/^The /, "")} · ${mind.label} ${soul.label}`,
          role: base.role,
          tagline: `${base.tagline} (${mind.label.toLowerCase()} mind, ${soul.label.toLowerCase()} soul${subLabel ? ` · ${subLabel}` : ""})`,
          mind: mind.label,
          soul: soul.label,
          mindId: mind.id,
          soulId: soul.id,
          primary: base.primary,
          subdivision,
          weightAdjust: weightAdjustFor(base, mind.id, soul.id),
          macroId: macro.id,
          subtypeId: subtype.id,
          fineIndex,
        });
      }
    }
  }

  return catalog;
}

export const PERSONALITY_TYPES_400: PersonalityTypeDef[] = buildPersonalityCatalog();

const BY_ID = new Map(PERSONALITY_TYPES_400.map((p) => [p.id, p]));
const BY_CODE = new Map(PERSONALITY_TYPES_400.map((p) => [p.typeCode, p]));

export const PERSONALITY_COUNT = PERSONALITY_TYPES_400.length;

export function getPersonalityById(id: string): PersonalityTypeDef | undefined {
  return BY_ID.get(id);
}

export function getPersonalityByTypeCode(code: string): PersonalityTypeDef | undefined {
  return BY_CODE.get(code.toUpperCase());
}

export function getPersonalitiesForBase(baseCode: string): PersonalityTypeDef[] {
  const c = baseCode.toUpperCase();
  return PERSONALITY_TYPES_400.filter((p) => p.baseCode === c);
}

export function rollRandomPersonality(): PersonalityTypeDef {
  return PERSONALITY_TYPES_400[
    Math.floor(Math.random() * PERSONALITY_TYPES_400.length)
  ]!;
}

export function searchPersonalities(query: string): PersonalityTypeDef[] {
  const q = query.trim().toLowerCase();
  if (!q) return PERSONALITY_TYPES_400;
  return PERSONALITY_TYPES_400.filter(
    (p) => {
      const rich = getRichProfile(p);
      return (
        p.name.toLowerCase().includes(q) ||
        p.typeCode.toLowerCase().includes(q) ||
        p.baseCode.toLowerCase().includes(q) ||
        p.title.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q) ||
        p.tagline.toLowerCase().includes(q) ||
        rich.displayTitle.toLowerCase().includes(q) ||
        rich.headline.toLowerCase().includes(q) ||
        String(p.fineIndex).includes(q)
      );
    }
  );
}

export function getRichProfile(def: PersonalityTypeDef): PersonalityRichProfile {
  return buildRichProfile(def, def.fineIndex);
}
