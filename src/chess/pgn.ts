import type { Color } from "./types";
import type { GameMoveRecord } from "../ai/types";

const RESULT_TAG: Record<string, string> = {
  "user-win": "1-0",
  "chimera-win": "0-1",
  draw: "1/2-1/2",
};

/**
 * Minimal PGN from stored UCI moves (sufficient for sync / archive).
 */
export function gameMovesToPgn(
  moves: GameMoveRecord[],
  userColor: Color,
  result: keyof typeof RESULT_TAG,
  options?: {
    event?: string;
    terminationReason?: string;
    white?: string;
    black?: string;
  }
): string {
  const white = options?.white ?? (userColor === "w" ? "Player" : "CHIMERA");
  const black = options?.black ?? (userColor === "b" ? "Player" : "CHIMERA");
  const pairs: string[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    const moveNum = Math.floor(i / 2) + 1;
    const w = moves[i]?.san ?? moves[i]?.uci ?? "";
    const b = moves[i + 1]?.san ?? moves[i + 1]?.uci ?? "";
    pairs.push(b ? `${moveNum}. ${w} ${b}` : `${moveNum}. ${w}`);
  }

  const headers = [
    `[Event "${options?.event ?? "CHIMERA Arena"}"]`,
    `[White "${white}"]`,
    `[Black "${black}"]`,
    `[Result "${RESULT_TAG[result] ?? "*"}"]`,
  ];
  if (options?.terminationReason) {
    headers.push(`[Termination "${options?.terminationReason}"]`);
  }

  return `${headers.join("\n")}\n\n${pairs.join(" ")} ${RESULT_TAG[result] ?? "*"}\n`;
}
