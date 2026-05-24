import type { ChimeraMemory, StoredGame } from "../ai/types";
import type { IntelligenceArchive } from "../intelligence/types";
import { fromFen, moveToUci, uciToMove } from "../chess";
import type { Color, Move } from "../chess";
import { stateAtPly } from "../review/replay";
import type { MistakeIntelligence } from "../mistakeIntel/types";
import { PERSONAL_PUZZLE_CONFIG as CFG } from "./config";
import type { DetectedWeakpoint, PersonalPuzzle, WeakpointTheme } from "./types";

interface PuzzleCandidate {
  weakpointId: string;
  weakpointLabel: string;
  theme: WeakpointTheme;
  fen: string;
  sideToMove: Color;
  solutionUci: string;
  playedUci?: string;
  headline: string;
  coachingLine: string;
  gameId: string;
  moveLabel: string;
  cpLoss: number;
  severity: PersonalPuzzle["severity"];
  priority: number;
}

function severityFromCp(cpLoss: number): PersonalPuzzle["severity"] {
  if (cpLoss >= 300) return "blunder";
  if (cpLoss >= 140) return "mistake";
  if (cpLoss >= 80) return "inaccuracy";
  return "inaccuracy";
}

function familyForMistake(m: MistakeIntelligence): {
  id: string;
  label: string;
  theme: WeakpointTheme;
} {
  const tag = m.patternTags.find((t) => !t.includes("recurring")) ?? m.patternTags[0];
  const id = tag?.replace(":recurring", "") ?? "tactical_blind";
  const labels: Record<string, string> = {
    hanging_piece: "Hanging piece / undefended material",
    missed_capture: "Missed capture or recapture",
    open_file: "Open-file infiltration",
    king_safety: "King safety breakdown",
    forcing_missed: "Missed forcing move",
    tactical_blind: "Tactical blind spot",
    opening_gap: "Opening preparation",
    endgame: "Endgame technique",
    clock_pressure: "Clock-pressure errors",
  };
  return {
    id,
    label: labels[id] ?? m.tacticalTheme?.[0] ?? "Tactical pattern",
    theme: id === "opening_gap" || id === "endgame" ? "phase" : id === "clock_pressure" ? "cognitive" : "tactical",
  };
}

function moveLabelForGame(game: StoredGame, moveIndex: number): string {
  const m = game.moves[moveIndex];
  if (!m) return "Your move";
  const num = Math.floor(moveIndex / 2) + 1;
  const prefix = moveIndex % 2 === 0 ? `${num}.` : `${num}…`;
  return `${prefix} ${m.san ?? m.uci}`;
}

function candidatesFromStoredMistake(
  game: StoredGame,
  weakpoints: DetectedWeakpoint[]
): PuzzleCandidate[] {
  const out: PuzzleCandidate[] = [];
  const defaultWp = weakpoints[0] ?? {
    id: "tactical_blind",
    label: "Tactical pattern",
    theme: "tactical" as const,
    priority: 10,
    occurrences: 1,
    insight: "",
  };

  for (const mist of game.mistakes) {
    if (mist.cpLoss < CFG.minCpLossForPuzzle) continue;
    const state = fromFen(mist.fenBefore);
    if (!state) continue;
    const move = uciToMove(state, mist.best);
    if (!move) continue;

    out.push({
      weakpointId: defaultWp.id,
      weakpointLabel: defaultWp.label,
      theme: defaultWp.theme,
      fen: mist.fenBefore,
      sideToMove: state.turn,
      solutionUci: mist.best,
      playedUci: mist.played,
      headline: `Fix: ${mist.category}`,
      coachingLine: `You played ${mist.played}; engine prefers ${mist.best}.`,
      gameId: game.id,
      moveLabel: "Critical moment",
      cpLoss: mist.cpLoss,
      severity: severityFromCp(mist.cpLoss),
      priority: mist.cpLoss + 20,
    });
  }
  return out;
}

function candidatesFromIntelligence(
  game: StoredGame,
  mistake: MistakeIntelligence,
  weakpoints: DetectedWeakpoint[]
): PuzzleCandidate | null {
  const moveIndex = Math.max(0, mistake.ply - 1);
  const before = stateAtPly(game.moves, moveIndex);
  const fen = before.fen;
  const state = before.state;
  const solution = mistake.bestMove;
  const move = uciToMove(state, solution);
  if (!move) return null;

  const fam = familyForMistake(mistake);
  const wp =
    weakpoints.find((w) => w.id === fam.id) ??
    ({
      id: fam.id,
      label: fam.label,
      theme: fam.theme,
      priority: 10,
      occurrences: 1,
      insight: mistake.headline,
    } satisfies DetectedWeakpoint);

  return {
    weakpointId: wp.id,
    weakpointLabel: wp.label,
    theme: wp.theme,
    fen,
    sideToMove: state.turn,
    solutionUci: solution,
    playedUci: mistake.playerMove,
    headline: mistake.headline,
    coachingLine:
      mistake.explanation.preventionAdvice ||
      mistake.trainingRecommendation[0] ||
      mistake.whyItMatters,
    gameId: game.id,
    moveLabel: moveLabelForGame(game, moveIndex),
    cpLoss: mistake.evaluationSwing,
    severity: mistake.severity,
    priority: mistake.evaluationSwing + (mistake.severity === "blunder" ? 80 : 40),
  };
}

export function buildPersonalPuzzles(
  memory: ChimeraMemory,
  archive: IntelligenceArchive,
  weakpoints: DetectedWeakpoint[]
): PersonalPuzzle[] {
  const games = memory.games.slice(-CFG.recentGamesWindow);
  const gameById = new Map(games.map((g) => [g.id, g]));
  const pool: PuzzleCandidate[] = [];

  for (const report of archive.reports.slice(-CFG.recentReportsWindow)) {
    const game = gameById.get(report.gameId);
    if (!game) continue;
    const mi = report.mistakeIntelligence;
    if (mi) {
      for (const m of mi.mistakes) {
        const c = candidatesFromIntelligence(game, m, weakpoints);
        if (c) pool.push(c);
      }
    }
  }

  for (const game of games) {
    pool.push(...candidatesFromStoredMistake(game, weakpoints));
  }

  pool.sort((a, b) => b.priority - a.priority);

  const seenFen = new Set<string>();
  const perWeak = new Map<string, number>();
  const puzzles: PersonalPuzzle[] = [];

  for (const c of pool) {
    if (puzzles.length >= CFG.maxPuzzlesTotal) break;
    const fenKey = c.fen.slice(0, 32);
    if (seenFen.has(fenKey)) continue;
    const count = perWeak.get(c.weakpointId) ?? 0;
    if (count >= CFG.maxPuzzlesPerWeakpoint) continue;

    seenFen.add(fenKey);
    perWeak.set(c.weakpointId, count + 1);
    puzzles.push({
      id: `${c.gameId}-${c.solutionUci}-${puzzles.length}`,
      weakpointId: c.weakpointId,
      weakpointLabel: c.weakpointLabel,
      theme: c.theme,
      fen: c.fen,
      sideToMove: c.sideToMove,
      solutionUci: c.solutionUci,
      playedUci: c.playedUci,
      headline: c.headline,
      coachingLine: c.coachingLine,
      gameId: c.gameId,
      moveLabel: c.moveLabel,
      cpLoss: c.cpLoss,
      severity: c.severity,
      createdAt: Date.now(),
    });
  }

  return puzzles;
}

export function isPuzzleSolution(
  state: import("../chess").GameState,
  move: Move,
  solutionUci: string
): boolean {
  const played = moveToUci(move);
  if (played === solutionUci) return true;
  const base = solutionUci.slice(0, 4);
  if (played.slice(0, 4) === base) {
    const legal = uciToMove(state, solutionUci);
    return legal !== null && legal.from === move.from && legal.to === move.to;
  }
  return false;
}
