/**
 * Stockfish 18 (lite single-threaded) via Web Worker + UCI.
 * Assets: /stockfish/stockfish-18-lite-single.js (+ .wasm)
 */

export type StockfishCallback = (line: string) => void;

export interface StockfishEngine {
  send: (cmd: string, onComplete?: (output: string) => void) => void;
  onLine: (cb: StockfishCallback) => void;
  /** Single hook for live analysis info lines (replaced each run). */
  setAnalysisHook: (cb: StockfishCallback | null) => void;
  stop: () => void;
  quit: () => void;
  readonly ready: boolean;
}

const ENGINE_URL = "/stockfish/stockfish-18-lite-single.js";

interface PendingCommand {
  cmd: string;
  lines: string[];
  onComplete?: (output: string) => void;
  done: boolean;
}

function firstWord(line: string): string {
  const i = line.indexOf(" ");
  return i === -1 ? line : line.slice(0, i);
}

function isCommandDone(cmd: string, line: string): boolean {
  const w = firstWord(line);
  if (w === "uciok") return cmd === "uci";
  if (w === "readyok") return cmd === "isready";
  if (w.startsWith("bestmove")) return cmd.startsWith("go");
  if (line.startsWith("Unknown command")) return true;
  return false;
}

export function createStockfishEngine(): StockfishEngine {
  const worker = new Worker(ENGINE_URL);
  const queue: PendingCommand[] = [];
  let lineListeners: StockfishCallback[] = [];
  let analysisHook: StockfishCallback | null = null;
  let ready = false;

  const dispatchLine = (line: string) => {
    analysisHook?.(line);
    for (const fn of lineListeners) fn(line);

    if (!queue.length) return;
    const head = queue[0];
    if (line.startsWith("No such option") || line.startsWith("Stockfish")) return;

    head.lines.push(line);
    if (isCommandDone(head.cmd, line)) {
      head.done = true;
      queue.shift();
      if (head.onComplete) head.onComplete(head.lines.join("\n"));
    }
  };

  worker.onmessage = (e: MessageEvent<string>) => {
    const data = typeof e.data === "string" ? e.data : String(e.data);
    if (data.includes("\n")) {
      data.split("\n").forEach((l) => l && dispatchLine(l));
    } else if (data) {
      dispatchLine(data);
    }
  };

  const sendRaw = (cmd: string) => worker.postMessage(cmd);

  const engine: StockfishEngine = {
    get ready() {
      return ready;
    },

    send(cmd: string, onComplete?: (output: string) => void) {
      const trimmed = cmd.trim();
      const noReply =
        trimmed === "ucinewgame" ||
        trimmed === "stop" ||
        trimmed === "ponderhit" ||
        trimmed.startsWith("position") ||
        trimmed.startsWith("setoption");

      if (!noReply) {
        queue.push({ cmd: trimmed, lines: [], onComplete, done: false });
      }

      sendRaw(trimmed);
      if (noReply && onComplete) setTimeout(() => onComplete(""), 0);
    },

    onLine(cb) {
      lineListeners.push(cb);
    },

    setAnalysisHook(cb) {
      analysisHook = cb;
    },

    stop() {
      sendRaw("stop");
    },

    quit() {
      sendRaw("quit");
      worker.terminate();
      lineListeners = [];
      analysisHook = null;
      queue.length = 0;
    },
  };

  engine.send("uci", () => {
    engine.send("isready", () => {
      ready = true;
    });
  });

  return engine;
}

/** Best move from FEN (depth in plies, default 12). */
export function getBestMove(
  engine: StockfishEngine,
  fen: string,
  depth = 12
): Promise<string> {
  return new Promise((resolve) => {
    engine.send(`position fen ${fen}`);
    engine.send(`go depth ${depth}`, (out) => {
      const line = out.split("\n").find((l) => l.startsWith("bestmove"));
      const move = line?.split(" ")[1] ?? "";
      resolve(move === "(none)" ? "" : move);
    });
  });
}

/** Fast reply for live play — caps think time (ms) with a hard timeout so the queue cannot hang. */
export function getBestMoveTimed(
  engine: StockfishEngine,
  fen: string,
  movetimeMs = 220,
  hardTimeoutMs?: number
): Promise<string> {
  const movetime = Math.max(80, Math.round(movetimeMs));
  const hardMs = hardTimeoutMs ?? movetime + 10_000;

  return new Promise((resolve) => {
    let settled = false;
    const finish = (move: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(hardTimer);
      resolve(move);
    };

    const hardTimer = setTimeout(() => {
      engine.stop();
      finish("");
    }, hardMs);

    engine.send(`position fen ${fen}`);
    engine.send(`go movetime ${movetime}`, (out) => {
      const line = out.split("\n").find((l) => l.startsWith("bestmove"));
      const move = line?.split(" ")[1] ?? "";
      finish(move === "(none)" ? "" : move);
    });
  });
}

export const STOCKFISH_VERSION = 18;

export interface EvalResult {
  /** Centipawns from side-to-move perspective; mate scores as ±100000 - plies */
  cp: number;
  isMate: boolean;
  mateIn?: number;
}

function parseEvalFromOutput(output: string): EvalResult {
  const lines = output.split("\n").filter((l) => l.includes("score"));
  const last = lines[lines.length - 1] ?? "";
  const mate = last.match(/score mate (-?\d+)/);
  if (mate) {
    const plies = parseInt(mate[1], 10);
    const cp = plies > 0 ? 100000 - plies : -100000 - plies;
    return { cp, isMate: true, mateIn: plies };
  }
  const cpMatch = last.match(/score cp (-?\d+)/);
  const cp = cpMatch ? parseInt(cpMatch[1], 10) : 0;
  return { cp, isMate: false };
}

export function configureEngine(
  engine: StockfishEngine,
  opts: { skillLevel?: number; elo?: number; limitStrength?: boolean }
): Promise<void> {
  return new Promise((resolve) => {
    const cmds: string[] = [];
    if (opts.limitStrength && opts.elo !== undefined) {
      cmds.push("setoption name UCI_LimitStrength value true");
      cmds.push(`setoption name UCI_Elo value ${opts.elo}`);
    }
    if (opts.skillLevel !== undefined) {
      cmds.push(`setoption name Skill Level value ${opts.skillLevel}`);
    }
    let i = 0;
    const next = () => {
      if (i >= cmds.length) {
        resolve();
        return;
      }
      engine.send(cmds[i++]);
      setTimeout(next, 40);
    };
    next();
  });
}

function cpForWhite(fen: string, stmCp: number): number {
  const stm = fen.split(" ")[1];
  return stm === "w" ? stmCp : -stmCp;
}

function parseTopMovesFromOutput(
  output: string,
  fen: string,
  multiPv: number
): { move: string; cp: number }[] {
  const results: { move: string; cp: number }[] = [];
  const lines = output.split("\n");
  for (let pv = 1; pv <= multiPv; pv++) {
    const info = [...lines]
      .reverse()
      .find((l) => l.includes(`multipv ${pv}`) && l.includes(" pv "));
    if (!info) continue;
    const cpM = info.match(/score cp (-?\d+)/);
    const mateM = info.match(/score mate (-?\d+)/);
    const pvM = info.match(/\spv\s+(\S+)/);
    if (!pvM) continue;
    let stmCp = 0;
    if (mateM) {
      const mateIn = parseInt(mateM[1], 10);
      stmCp = mateIn > 0 ? 100000 - mateIn : -100000 - mateIn;
    } else if (cpM) {
      stmCp = parseInt(cpM[1], 10);
    }
    results.push({
      move: pvM[1],
      cp: cpForWhite(fen, stmCp),
    });
  }
  return results;
}

export function getEvaluation(
  engine: StockfishEngine,
  fen: string,
  depth = 10
): Promise<EvalResult> {
  return new Promise((resolve) => {
    engine.send(`position fen ${fen}`);
    engine.send(`go depth ${depth}`, (out) => {
      resolve(parseEvalFromOutput(out));
    });
  });
}

/** One search: root eval + top N lines (scores from White's perspective). */
export function searchPosition(
  engine: StockfishEngine,
  fen: string,
  depth: number,
  multiPv: number
): Promise<{ eval: EvalResult; topMoves: { move: string; cp: number }[] }> {
  return new Promise((resolve) => {
    engine.send(`setoption name MultiPV value ${multiPv}`);
    engine.send(`position fen ${fen}`);
    engine.send(`go depth ${depth}`, (out) => {
      engine.send(`setoption name MultiPV value 1`);
      resolve({
        eval: parseEvalFromOutput(out),
        topMoves: parseTopMovesFromOutput(out, fen, multiPv),
      });
    });
  });
}

/** MultiPV: top N moves with scores (centipawns from White's perspective). */
export function getTopMoves(
  engine: StockfishEngine,
  fen: string,
  depth: number,
  multiPv: number
): Promise<{ move: string; cp: number }[]> {
  return searchPosition(engine, fen, depth, multiPv).then((r) => r.topMoves);
}

