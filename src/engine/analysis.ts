import type { EvalResult } from "./stockfish";
import type { StockfishEngine } from "./stockfish";

export interface LiveAnalysis {
  depth: number;
  /** Centipawns from White's perspective */
  cpWhite: number;
  isMate: boolean;
  mateIn?: number;
  pvUci: string[];
  bestMove: string;
}

export function cpForWhite(fen: string, stmCp: number): number {
  const stm = fen.split(" ")[1];
  return stm === "w" ? stmCp : -stmCp;
}

export function evalFromResult(fen: string, evalResult: EvalResult): {
  cpWhite: number;
  isMate: boolean;
  mateIn?: number;
} {
  if (evalResult.isMate && evalResult.mateIn !== undefined) {
    const cpWhite =
      evalResult.mateIn > 0
        ? 100000 - evalResult.mateIn
        : -100000 - evalResult.mateIn;
    return { cpWhite, isMate: true, mateIn: evalResult.mateIn };
  }
  return { cpWhite: cpForWhite(fen, evalResult.cp), isMate: false };
}

export function formatEvalLabel(
  cpWhite: number,
  isMate?: boolean,
  mateIn?: number
): string {
  if (isMate && mateIn !== undefined) {
    const moves = Math.ceil(Math.abs(mateIn) / 2);
    return mateIn > 0 ? `M${moves}` : `-M${moves}`;
  }
  const pawns = cpWhite / 100;
  if (Math.abs(pawns) < 0.05) return "0.0";
  return pawns > 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
}

/** 0 = Black winning, 50 = equal, 100 = White winning */
export function evalToBarPercent(cpWhite: number, isMate?: boolean, mateIn?: number): number {
  if (isMate && mateIn !== undefined) {
    return mateIn > 0 ? 98 : 2;
  }
  const clamped = Math.max(-1000, Math.min(1000, cpWhite));
  return 50 + (clamped / 1000) * 48;
}

function parseInfoLine(line: string, fen: string): LiveAnalysis | null {
  if (!line.startsWith("info ") || !line.includes(" depth ")) return null;
  const depthM = line.match(/\bdepth (\d+)/);
  if (!depthM) return null;

  let stmCp = 0;
  let isMate = false;
  let mateIn: number | undefined;

  const mateM = line.match(/score mate (-?\d+)/);
  if (mateM) {
    isMate = true;
    mateIn = parseInt(mateM[1], 10);
    stmCp = mateIn > 0 ? 100000 - mateIn : -100000 - mateIn;
  } else {
    const cpM = line.match(/score cp (-?\d+)/);
    if (cpM) stmCp = parseInt(cpM[1], 10);
    else return null;
  }

  const pvM = line.match(/\spv\s+(.+)$/);
  const pvUci = pvM ? pvM[1].trim().split(/\s+/) : [];
  const bestMove = pvUci[0] ?? "";

  return {
    depth: parseInt(depthM[1], 10),
    cpWhite: cpForWhite(fen, stmCp),
    isMate,
    mateIn,
    pvUci,
    bestMove,
  };
}

/**
 * Run Stockfish analysis with live depth updates. Call stopAnalysis before a new run.
 */
export function runLiveAnalysis(
  engine: StockfishEngine,
  fen: string,
  depth: number,
  onUpdate: (analysis: LiveAnalysis) => void
): { cancel: () => void } {
  let cancelled = false;

  engine.setAnalysisHook((line) => {
    if (cancelled) return;
    const parsed = parseInfoLine(line, fen);
    if (parsed) onUpdate(parsed);
  });

  engine.stop();
  engine.send(`position fen ${fen}`);
  engine.send(`go depth ${depth}`);

  return {
    cancel: () => {
      cancelled = true;
      engine.setAnalysisHook(null);
      engine.stop();
    },
  };
}

export function stopAnalysis(engine: StockfishEngine): void {
  engine.stop();
}

export interface FullAnalysisResult {
  primary: LiveAnalysis | null;
  lines: { move: string; cp: number }[];
}

/** One Stockfish run: live eval + top 3 moves (no overlapping `go` commands). */
export function runFullAnalysis(
  engine: StockfishEngine,
  fen: string,
  depth: number,
  onUpdate: (analysis: LiveAnalysis) => void
): { cancel: () => void; done: Promise<FullAnalysisResult> } {
  let cancelled = false;
  let primary: LiveAnalysis | null = null;
  const lineMap = new Map<number, { move: string; cp: number }>();

  let settle: ((r: FullAnalysisResult) => void) | null = null;

  const done = new Promise<FullAnalysisResult>((resolve) => {
    settle = resolve;
    engine.setAnalysisHook((line) => {
      if (cancelled) return;

      if (line.startsWith("bestmove")) {
        engine.setAnalysisHook(null);
        engine.send("setoption name MultiPV value 1");
        const lines = [...lineMap.entries()]
          .sort((a, b) => a[0] - b[0])
          .map(([, v]) => v);
        settle?.({ primary, lines });
        settle = null;
        return;
      }

      if (!line.startsWith("info ")) return;
      const parsed = parseInfoLine(line, fen);
      if (parsed) {
        if (!primary || parsed.depth >= primary.depth) {
          primary = parsed;
          onUpdate(parsed);
        }
      }

      const mpvM = line.match(/\bmultipv (\d+)/);
      const cpM = line.match(/score cp (-?\d+)/);
      const mateM = line.match(/score mate (-?\d+)/);
      const pvM = line.match(/\spv\s+(\S+)/);
      if (!mpvM || !pvM) return;

      const idx = parseInt(mpvM[1], 10);
      let stmCp = 0;
      if (mateM) {
        const mateIn = parseInt(mateM[1], 10);
        stmCp = mateIn > 0 ? 100000 - mateIn : -100000 - mateIn;
      } else if (cpM) {
        stmCp = parseInt(cpM[1], 10);
      } else return;

      lineMap.set(idx, {
        move: pvM[1],
        cp: cpForWhite(fen, stmCp),
      });
    });

    engine.stop();
    engine.send("setoption name MultiPV value 3");
    engine.send(`position fen ${fen}`);
    engine.send(`go depth ${depth}`);
  });

  return {
    cancel: () => {
      cancelled = true;
      engine.setAnalysisHook(null);
      engine.send("setoption name MultiPV value 1");
      engine.stop();
      settle?.({ primary: null, lines: [] });
      settle = null;
    },
    done,
  };
}
