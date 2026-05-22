import type { TiltEvent } from "./cognitiveState";

export interface TiltSession {
  wrongAttempts: number;
  wrongTimestamps: number[];
  moveTimestamps: number[];
  lastEvalSwing?: number;
}

export function createTiltSession(): TiltSession {
  return {
    wrongAttempts: 0,
    wrongTimestamps: [],
    moveTimestamps: [],
  };
}

export function recordWrongAttempt(session: TiltSession): TiltSession {
  const now = Date.now();
  const wrongTimestamps = [...session.wrongTimestamps, now].filter(
    (t) => now - t < 120_000
  );
  return {
    ...session,
    wrongAttempts: session.wrongAttempts + 1,
    wrongTimestamps,
  };
}

export function recordMove(session: TiltSession): TiltSession {
  const now = Date.now();
  const moveTimestamps = [...session.moveTimestamps, now].filter(
    (t) => now - t < 120_000
  );
  return { ...session, moveTimestamps };
}

export function detectTilt(session: TiltSession): TiltEvent | null {
  const now = Date.now();
  const recentWrong = session.wrongTimestamps.filter(
    (t) => now - t < 45_000
  ).length;
  const recentMoves = session.moveTimestamps.filter((t) => now - t < 20_000);

  if (recentWrong >= 3) {
    return {
      active: true,
      severity: "tilt",
      message:
        "Tilt event detected — blunders clustering. Slow down; cognitive collapse initiated.",
    };
  }

  if (recentWrong >= 2) {
    return {
      active: true,
      severity: "tilt",
      message:
        "Emotional tilt risk — repeated book-move misses. Breathe before the next ply.",
    };
  }

  if (recentMoves.length >= 4 && recentWrong >= 1) {
    return {
      active: true,
      severity: "watch",
      message:
        "Move speed spiking with inaccuracies — confidence may be slipping.",
    };
  }

  if (session.wrongAttempts >= 4) {
    return {
      active: true,
      severity: "tilt",
      message:
        "Cognitive collapse pattern — multiple non-book attempts this line.",
    };
  }

  return null;
}
