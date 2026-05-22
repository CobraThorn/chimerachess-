/** Standard Elo expected-score formula; score 1 = win, 0.5 = draw, 0 = loss. */
export function calculateEloChange(
  playerElo: number,
  opponentElo: number,
  score: 0 | 0.5 | 1,
  kFactor = 32
): number {
  const expected = 1 / (1 + Math.pow(10, (opponentElo - playerElo) / 400));
  return Math.round(kFactor * (score - expected));
}

export function resultToScore(
  result: "user-win" | "chimera-win" | "draw",
  forUser: boolean
): 0 | 0.5 | 1 {
  if (result === "draw") return 0.5;
  if (result === "user-win") return forUser ? 1 : 0;
  return forUser ? 0 : 1;
}

export function clampElo(elo: number, min = 80, max = 2800): number {
  return Math.max(min, Math.min(max, Math.round(elo)));
}
