import type { ChimeraMemory, StoredGame, UserPattern } from "../types";
import { styleToRadar } from "../playStyle";
import { evolvePhenotypeAfterAdapt, createInitialEvolution } from "../cognition/personalityEvolution";
import { getPersonalityById } from "../cognition/personality400";
import {
  appendRadarSnapshot,
  radarCurrentFromMemory,
} from "../cognition/personalityRadar";
import { personalityToPhenotype } from "./phenotype";
import type { AdaptiveLearningState, CounterStyleId, LearnedLesson } from "./types";

/** CHIMERA runs a full learn + adapt pass every N rated games */
export const ADAPTATION_INTERVAL_GAMES = 3;

export function emptyLearningState(): AdaptiveLearningState {
  return {
    gamesAnalyzed: 0,
    adaptationCycles: 0,
    adaptationScore: 0,
    counterStyle: "solid",
    focusWeakness: null,
    lessons: [],
    lastLesson: null,
    habitTags: [],
    phenotype: null,
  };
}

export function gamesUntilNextAdaptation(L: AdaptiveLearningState): number {
  if (L.gamesAnalyzed === 0) return ADAPTATION_INTERVAL_GAMES;
  const rem = L.gamesAnalyzed % ADAPTATION_INTERVAL_GAMES;
  return rem === 0 ? 0 : ADAPTATION_INTERVAL_GAMES - rem;
}

export function isAdaptationCycle(gamesAnalyzed: number): boolean {
  return gamesAnalyzed > 0 && gamesAnalyzed % ADAPTATION_INTERVAL_GAMES === 0;
}

function deriveCounterStyle(
  aggression: number,
  precision: number,
  risk: number,
  tactics: number
): CounterStyleId {
  if (precision < 45 || risk > 70) return "solid";
  if (aggression > 65 && tactics > 55) return "squeeze";
  if (aggression > 60 || risk > 55) return "tactical";
  if (precision > 75 && aggression < 40) return "chaotic";
  return "solid";
}

function habitTagsFromRadar(
  aggression: number,
  precision: number,
  risk: number,
  initiative: number
): string[] {
  const tags: string[] = [];
  if (aggression > 60) tags.push("Aggressive");
  if (aggression < 35) tags.push("Patient");
  if (precision > 65) tags.push("Precise");
  if (precision < 40) tags.push("Loose");
  if (risk > 55) tags.push("Risk-taker");
  if (initiative > 60) tags.push("Initiative-seeker");
  if (tags.length === 0) tags.push("Balanced");
  return tags.slice(0, 4);
}

function lessonFromPattern(p: UserPattern): LearnedLesson {
  return {
    id: `pat-${p.positionKey}-${p.typicalBadMove}`,
    text: `You often play ${p.typicalBadMove} here — I punish with ${p.refutation} (${p.occurrences}× seen).`,
    kind: "habit",
    strength: Math.min(100, 40 + p.occurrences * 12),
    learnedAt: Date.now(),
    positionKey: p.positionKey,
  };
}

function buildStyleLessons(
  counter: CounterStyleId,
  focus: string | null,
  tags: string[]
): LearnedLesson[] {
  const counterText: Record<CounterStyleId, string> = {
    solid: "I play solid, prophylactic chess to blunt your attacks.",
    tactical: "I sharpen tactics and look for traps in your loose moments.",
    squeeze: "I trade into endings and squeeze when you overextend.",
    chaotic: "I mix complications to pull you off your comfort lines.",
  };
  const lessons: LearnedLesson[] = [
    {
      id: `counter-${counter}`,
      text: counterText[counter],
      kind: "counter",
      strength: 70,
      learnedAt: Date.now(),
    },
  ];
  if (focus) {
    lessons.push({
      id: "focus-weakness",
      text: focus,
      kind: "weakness",
      strength: 85,
      learnedAt: Date.now(),
    });
  }
  if (tags.length) {
    lessons.push({
      id: "habits-tags",
      text: `Your style reads as: ${tags.join(", ")}.`,
      kind: "habit",
      strength: 55,
      learnedAt: Date.now(),
    });
  }
  return lessons;
}

function computeAdaptationScore(
  adaptationCycles: number,
  patterns: UserPattern[],
  lessonCount: number
): number {
  const repeatPatterns = patterns.filter((p) => p.occurrences >= 2).length;
  const raw =
    Math.min(72, adaptationCycles * 24) +
    Math.min(20, repeatPatterns * 4) +
    Math.min(8, lessonCount);
  return Math.min(100, Math.round(raw));
}

function focusWeaknessFromGame(game: StoredGame, patterns: UserPattern[]): string | null {
  const blunders = game.mistakes.filter((m) => m.category === "blunder");
  if (blunders.length >= 2) {
    return "You drop material in tactical positions — I will prioritize forcing lines.";
  }
  const top = patterns
    .filter((p) => p.occurrences >= 2)
    .sort((a, b) => b.occurrences - a.occurrences)[0];
  if (top) {
    return `Recurring habit: ${top.typicalBadMove} in similar positions (${top.occurrences} games).`;
  }
  if (game.mistakes.length > 0) {
    return "Small inaccuracies add up — I increase precision when the position is calm.";
  }
  return null;
}

function mergeLessons(
  prev: LearnedLesson[],
  incoming: LearnedLesson[]
): LearnedLesson[] {
  const map = new Map<string, LearnedLesson>();
  for (const l of [...prev, ...incoming]) {
    const cur = map.get(l.id);
    if (!cur || l.strength >= cur.strength) map.set(l.id, l);
  }
  return [...map.values()]
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 12);
}

function lessonFromSingleGame(game: StoredGame): LearnedLesson | null {
  const worst = [...game.mistakes].sort((a, b) => b.cpLoss - a.cpLoss)[0];
  if (!worst) return null;
  return {
    id: `game-${game.id}`,
    text: `Noted ${worst.category}: ${worst.played} → ${worst.best}.`,
    kind: "habit",
    strength: 45,
    learnedAt: Date.now(),
  };
}

export function ensureLearning(memory: ChimeraMemory): AdaptiveLearningState {
  if (memory.learning) {
    return {
      ...emptyLearningState(),
      ...memory.learning,
      lessons: memory.learning.lessons ?? [],
      habitTags: memory.learning.habitTags ?? [],
      phenotype: memory.learning.phenotype ?? null,
      adaptationCycles: memory.learning.adaptationCycles ?? 0,
      evolution: memory.learning.evolution,
    };
  }
  return {
    ...emptyLearningState(),
    adaptationScore: memory.adaptation ?? 0,
  };
}

function runAdaptationCycle(
  prev: AdaptiveLearningState,
  memory: ChimeraMemory,
  game: StoredGame,
  patterns: UserPattern[]
): AdaptiveLearningState {
  const style = memory.userStyle;
  const radar = style ? styleToRadar(style) : [];
  const byLabel = Object.fromEntries(radar.map((a) => [a.short, a.value]));

  const aggression = byLabel.ATK ?? 50;
  const precision = byLabel.PRE ?? 50;
  const risk = byLabel.RISK ?? 50;
  const tactics = byLabel.TAC ?? 50;
  const initiative = byLabel.INIT ?? 50;

  const counterStyle = deriveCounterStyle(aggression, precision, risk, tactics);
  const habitTags = habitTagsFromRadar(aggression, precision, risk, initiative);
  const focusWeakness = focusWeaknessFromGame(game, patterns);

  const patternLessons = patterns
    .filter((p) => p.occurrences >= 2)
    .slice(0, 5)
    .map(lessonFromPattern);
  const styleLessons = buildStyleLessons(counterStyle, focusWeakness, habitTags);
  const lessons = mergeLessons(prev.lessons, [...patternLessons, ...styleLessons]);

  const adaptationCycles = prev.adaptationCycles + 1;
  const adaptationScore = computeAdaptationScore(
    adaptationCycles,
    patterns,
    lessons.length
  );

  const cycleNote = `Adaptation ${adaptationCycles} (every ${ADAPTATION_INTERVAL_GAMES} games): switched to ${counterStyle} counter-play.`;

  let lastLesson: string | null = cycleNote;
  if (patternLessons.length > 0) {
    lastLesson = `${cycleNote} ${patternLessons[0].text}`;
  } else if (focusWeakness) {
    lastLesson = `${cycleNote} ${focusWeakness}`;
  }

  return {
    ...prev,
    adaptationCycles,
    adaptationScore,
    counterStyle,
    focusWeakness,
    lessons,
    lastLesson,
    habitTags,
  };
}

export function learnFromGame(
  memory: ChimeraMemory,
  game: StoredGame,
  patterns: UserPattern[]
): AdaptiveLearningState {
  const prev = ensureLearning(memory);
  const gamesAnalyzed = prev.gamesAnalyzed + 1;
  const phenotype = prev.phenotype;

  if (!isAdaptationCycle(gamesAnalyzed)) {
    const gameLesson = lessonFromSingleGame(game);
    const lessons = gameLesson
      ? mergeLessons(prev.lessons, [gameLesson])
      : prev.lessons;

    return {
      ...prev,
      gamesAnalyzed,
      phenotype,
      lessons,
      lastLesson:
        gameLesson?.text ??
        `Game ${gamesAnalyzed} logged — full adapt in ${gamesUntilNextAdaptation({
          ...prev,
          gamesAnalyzed,
        })} game(s).`,
    };
  }

  const adapted = runAdaptationCycle(prev, memory, game, patterns);
  let evolution =
    prev.evolution ??
    (phenotype?.personalityId
      ? createInitialEvolution(phenotype.personalityId, memory)
      : undefined);
  let nextPhenotype = phenotype;
  let lastLesson = adapted.lastLesson;

  if (phenotype?.personalityId && evolution) {
    const evo = evolvePhenotypeAfterAdapt(
      { ...memory, learning: { ...prev, phenotype, evolution } },
      adapted.adaptationCycles
    );
    evolution = evo.evolution;
    if (evo.evolved && evo.message) {
      lastLesson = evo.message;
      const newDef = getPersonalityById(evo.evolution.currentPersonalityId);
      if (newDef) nextPhenotype = personalityToPhenotype(newDef);
    }

    const snapDef = getPersonalityById(evolution.currentPersonalityId);
    if (snapDef) {
      evolution = appendRadarSnapshot(
        evolution,
        radarCurrentFromMemory(memory, snapDef)
      );
    }
  }

  return {
    ...adapted,
    gamesAnalyzed,
    phenotype: nextPhenotype,
    evolution,
    lastLesson,
  };
}
