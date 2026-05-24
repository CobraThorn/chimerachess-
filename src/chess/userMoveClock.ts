/** Tracks per-user-move think time (ms) for post-game intelligence. */
export function createUserMoveClock(): { times: number[]; markTurnStart: () => void; recordMove: () => void } {
  let turnStartedAt = Date.now();
  const times: number[] = [];

  return {
    times,
    markTurnStart() {
      turnStartedAt = Date.now();
    },
    recordMove() {
      times.push(Math.max(0, Date.now() - turnStartedAt));
    },
  };
}
