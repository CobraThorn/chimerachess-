import type { PersonalityTypeDef } from "./personality400";
import {
  macroForBaseCode,
  subtypeFor,
  type MacroArchetypeId,
} from "./personalityHierarchy";

export interface PlaystyleIndicator {
  label: string;
  value: number;
}

export interface PersonalityRichProfile {
  displayTitle: string;
  headline: string;
  strengths: string[];
  weaknesses: string[];
  underPressure: string;
  training: string[];
  similarTo: string;
  playstyleIndicators: PlaystyleIndicator[];
  tiltTendency: string;
  roadmap: string[];
  macroTitle: string;
  subtypeLabel: string;
  fineLabel: string;
  hierarchyLine: string;
}

const FAMOUS_BY_MACRO: Record<MacroArchetypeId, string> = {
  "strategic-architect": "Mikhail Botvinnik",
  "calculative-aggressor": "Garry Kasparov",
  "tactical-predator": "Mikhail Tal",
  "positional-hunter": "Anatoly Karpov",
  "prophylactic-sage": "Tigran Petrosian",
  "defensive-fortress": "Wesley So",
  "endgame-engineer": "José Capablanca",
  "initiative-zealot": "Bobby Fischer",
  "dynamic-gambler": "Alexander Alekhine",
  "chaos-artist": "Rashid Nezhmetdinov",
  "counterattacking-phantom": "Veselin Topalov",
  "grinding-titan": "Magnus Carlsen",
};

const SOUL_PRESSURE: Record<string, string> = {
  Calm: "stays composed — converts without drama",
  Bold: "raises the stakes when ahead",
  Warm: "plays for clarity, avoids unnecessary chaos",
  Cool: "detached and clinical under clock pressure",
  Wild: "swings between brilliance and impulsive grabs",
};

const SOUL_TILT: Record<string, string> = {
  Calm: "Rarely tilts; may become too passive when behind.",
  Bold: "Tilts when denied attacking chances.",
  Warm: "Tilts when the position feels unfair or murky.",
  Cool: "Tilts when forced into emotional, unclear melees.",
  Wild: "Tilts into blitzing when time drops — chaos doubles.",
};

const MIND_TRAINING: Record<string, string[]> = {
  Focused: ["Deep calculation drills", "Critical position analysis"],
  Curious: ["Opening experiments", "Model games outside your comfort zone"],
  Steady: ["Endgame technique", "Prophylaxis puzzles"],
  Restless: ["Clock management training", "Forcing-line tactics"],
  Visionary: ["Strategic planning exercises", "Pawn-structure studies"],
};

function indicatorsFor(def: PersonalityTypeDef): PlaystyleIndicator[] {
  const w = def.weightAdjust;
  const atk = Math.round(
    50 + ((w.initiativeValuation ?? 0) + (w.attackSpeed ?? 0)) * 120
  );
  const pos = Math.round(50 + ((w.structureQuality ?? 0) + (w.prophylaxis ?? 0)) * 100);
  const tac = Math.round(
    50 + ((w.sacrificeFrequency ?? 0) + (w.chaosTolerance ?? 0)) * 90
  );
  const risk = Math.round(50 + (w.riskAppetite ?? 0) * 100);
  const calc = Math.round(50 + (w.calculationDepth ?? 0) * 80 + (w.precision ?? 0) * 60);
  return [
    { label: "Aggression", value: Math.min(100, Math.max(0, atk)) },
    { label: "Positional", value: Math.min(100, Math.max(0, pos)) },
    { label: "Tactical", value: Math.min(100, Math.max(0, tac)) },
    { label: "Risk appetite", value: Math.min(100, Math.max(0, risk)) },
    { label: "Calculation", value: Math.min(100, Math.max(0, calc)) },
  ];
}

const MACRO_STRENGTHS: Record<MacroArchetypeId, string[]> = {
  "strategic-architect": [
    "Long-term planning",
    "Structural understanding",
    "Converting small edges",
  ],
  "calculative-aggressor": [
    "Forcing sequences when ahead",
    "Initiative conversion",
    "Sharp calculation in attacks",
  ],
  "tactical-predator": [
    "Initiative and pressure",
    "Punishing inaccuracies",
    "Forcing mistakes under tension",
  ],
  "positional-hunter": [
    "Squeezing advantages",
    "Piece activity in closed games",
    "Patient improvement of pieces",
  ],
  "prophylactic-sage": [
    "Stopping your plans early",
    "Quiet improving moves",
    "Reducing your counterplay",
  ],
  "defensive-fortress": [
    "Solid defence",
    "Counter when you overextend",
    "Trade into favourable endings",
  ],
  "endgame-engineer": [
    "Technical endings",
    "Precision in quiet positions",
    "King and pawn technique",
  ],
  "initiative-zealot": [
    "Tempo and development",
    "Keeping the initiative",
    "Practical attacking chances",
  ],
  "dynamic-gambler": [
    "Complicated positions",
    "Sacrifices for initiative",
    "Unbalancing the position",
  ],
  "chaos-artist": [
    "Creating confusion",
    "Psychological pressure",
    "Thriving in tactics",
  ],
  "counterattacking-phantom": [
    "Spotting overextension",
    "Fast counterpunches",
    "Defensive resourcefulness",
  ],
  "grinding-titan": [
    "Relentless technique",
    "Outplaying in long games",
    "Minimal risk when ahead",
  ],
};

const MACRO_WEAKNESSES: Record<MacroArchetypeId, string[]> = {
  "strategic-architect": [
    "Can miss one-move tactics in open positions",
    "Slow to switch to concrete attacks",
  ],
  "calculative-aggressor": [
    "Impatient in dead-equal positions",
    "Occasionally overpresses",
  ],
  "tactical-predator": [
    "Impatience in quiet positions",
    "Sometimes forces play too early",
  ],
  "positional-hunter": [
    "Misses tactical explosions",
    "Can be out-calculated in sharp lines",
  ],
  "prophylactic-sage": [
    "Passive when behind on activity",
    "Struggles if forced to attack",
  ],
  "defensive-fortress": [
    "Difficulty creating winning chances",
    "Can be outmanoeuvred in space battles",
  ],
  "endgame-engineer": [
    "Less comfortable in wild tactics",
    "May delay necessary complications",
  ],
  "initiative-zealot": [
    "Weakness in purely defensive holds",
    "Time trouble from overthinking attacks",
  ],
  "dynamic-gambler": [
    "Inaccuracy after failed attacks",
    "Uneven when the position simplifies",
  ],
  "chaos-artist": [
    "Inconsistent in simple positions",
    "Prone to unsound sacrifices",
  ],
  "counterattacking-phantom": [
    "Can be cramped if never allowed to counter",
    "Needs the opponent to overreach",
  ],
  "grinding-titan": [
    "Less explosive when quick wins are needed",
    "Can be out-tacticked in sharp prep wars",
  ],
};

export function buildRichProfile(
  def: PersonalityTypeDef,
  fineIndex?: number
): PersonalityRichProfile {
  const macro = macroForBaseCode(def.baseCode);
  const subtype = subtypeFor(macro.id, def.mindId);
  const soul = def.soul;

  const displayTitle = macro.title;
  const headline = `${macro.essence} Your ${def.mind.toLowerCase()} mind and ${soul.toLowerCase()} soul shape how that shows up at the board — ${def.tagline.split("(")[0]?.trim() ?? ""}.`;

  const strengths = [...MACRO_STRENGTHS[macro.id]];
  if (def.mindId === 0) strengths.push("Sharp focus in critical moments");
  if (def.soulId === 1) strengths.push("Bold when the position demands it");

  const weaknesses = [...MACRO_WEAKNESSES[macro.id]];
  if (def.mindId === 3) weaknesses.push("Restlessness in quiet manoeuvring");
  if (def.soulId === 4) weaknesses.push("Volatility when emotions run high");

  const training = [
    ...(MIND_TRAINING[def.mind] ?? ["Mixed tactics and strategy"]),
    macro.id.includes("tactical") || macro.id.includes("predator")
      ? "Tactical puzzles + forcing lines"
      : "Strategic model games",
  ];
  if (macro.id === "positional-hunter") {
    training.push("Dynamic imbalance studies");
  }

  const roadmap = [
    `Weeks 1–2: ${training[0] ?? "Foundation drills"}`,
    `Weeks 3–4: ${training[1] ?? "Review your losses for pattern habits"}`,
    `Ongoing: Re-test after every 3 rated games — CHIMERA adapts with you`,
  ];

  const fineNum = fineIndex ?? 0;
  const hierarchyLine = `${macro.title} → ${subtype.label.split("·")[1]?.trim() ?? subtype.label} → fine type #${fineNum}`;

  return {
    displayTitle,
    headline,
    strengths,
    weaknesses,
    underPressure: SOUL_PRESSURE[soul] ?? "adapts to the moment",
    training,
    similarTo: FAMOUS_BY_MACRO[macro.id],
    playstyleIndicators: indicatorsFor(def),
    tiltTendency: SOUL_TILT[soul] ?? "Varies with mood and clock",
    roadmap,
    macroTitle: macro.title,
    subtypeLabel: subtype.label,
    fineLabel: `${def.mind} ${soul}`,
    hierarchyLine,
  };
}

export function displayNameForPersonality(
  def: PersonalityTypeDef,
  fineIndex?: number
): string {
  return buildRichProfile(def, fineIndex).displayTitle;
}
