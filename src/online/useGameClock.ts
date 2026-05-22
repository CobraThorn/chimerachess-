import { useEffect, useState } from "react";
import type { Color } from "../chess";
import type { OnlineClock } from "./types";

export function useGameClock(
  clock: OnlineClock | null,
  turn: Color | null,
  turnStartedAt: number | null
): OnlineClock {
  const [display, setDisplay] = useState<OnlineClock>({ w: 0, b: 0 });

  useEffect(() => {
    if (!clock || !turn || turnStartedAt == null) {
      setDisplay(clock ?? { w: 0, b: 0 });
      return;
    }

    const tick = () => {
      const elapsed = Date.now() - turnStartedAt;
      setDisplay({
        w: turn === "w" ? Math.max(0, clock.w - elapsed) : clock.w,
        b: turn === "b" ? Math.max(0, clock.b - elapsed) : clock.b,
      });
    };

    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, [clock, turn, turnStartedAt]);

  return display;
}
