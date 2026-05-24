import type { MoveGrade } from "./types";
import type { MistakeCategory } from "../ai/types";

/**
 * Chess.com-style centipawn loss bands (post-game review).
 * @see GRADING.md
 */
export const CP_EXCELLENT = 50;
export const CP_GOOD = 100;
export const CP_INACCURACY = 100;
export const CP_MISTAKE = 300;
export const CP_BLUNDER = 500;

export function categoryFromCpLoss(cpLoss: number): MistakeCategory | null {
  if (cpLoss >= CP_BLUNDER) return "blunder";
  if (cpLoss >= CP_MISTAKE) return "mistake";
  if (cpLoss >= CP_INACCURACY) return "inaccuracy";
  return null;
}

export function userCpFromWhite(cpWhite: number, userColor: "w" | "b"): number {
  return userColor === "w" ? cpWhite : -cpWhite;
}

/**
 * Classify a user move like Chess.com Game Review.
 * Requires cpLoss from engine (best line vs played line).
 */
export function classifyMoveGrade(input: {
  cpLoss: number;
  playedBest: boolean;
  brilliantCandidate?: boolean;
  ply: number;
  userEvalBeforeCp: number;
}): MoveGrade {
  const { cpLoss, playedBest, brilliantCandidate, ply, userEvalBeforeCp } = input;

  if (brilliantCandidate) return "brilliant";
  if (playedBest) return "best";

  if (ply <= 14 && cpLoss < 35) return "book";

  if (userEvalBeforeCp >= 200 && cpLoss >= CP_MISTAKE) return "miss";

  if (cpLoss <= CP_EXCELLENT) return "excellent";
  if (cpLoss <= CP_GOOD) return "good";
  if (cpLoss < CP_MISTAKE) return "inaccuracy";
  if (cpLoss < CP_BLUNDER) return "mistake";
  return "blunder";
}

export function insightForGrade(
  grade: MoveGrade,
  cpLoss: number,
  bestUci: string,
  playedUci: string,
  playedSan?: string
): string {
  const played = playedSan ?? playedUci;
  switch (grade) {
    case "brilliant":
      return "Brilliant — a strong sacrifice or only-move idea the engine approves.";
    case "best":
      return "Best move — you played the engine's #1 line.";
    case "excellent":
      return "Excellent — very close to the best move.";
    case "good":
      return "Good — a reasonable choice with a small eval drop.";
    case "book":
      return "Book — standard opening play in this phase.";
    case "inaccuracy":
      return `Inaccuracy — ${played} is playable, but ${bestUci} keeps more pressure (+${(cpLoss / 100).toFixed(1)} pawns).`;
    case "mistake":
      return `Mistake — ${bestUci} was stronger than ${played} (~${(cpLoss / 100).toFixed(1)} pawns lost).`;
    case "miss":
      return `Missed win — you were winning but ${played} let the advantage slip. Play ${bestUci}.`;
    case "blunder":
      return `Blunder — ${played} drops roughly ${(cpLoss / 100).toFixed(1)} pawns. The best move was ${bestUci}.`;
    default:
      return "";
  }
}
