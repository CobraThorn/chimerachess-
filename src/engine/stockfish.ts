/**
 * Stockfish 18 (lite single-threaded) via Web Worker + UCI.
 * Assets: /stockfish/stockfish-18-lite-single.js (+ .wasm)
 */

import { createUciWorkerEngine } from "./uciWorkerEngine";
import type { ChessEngine } from "./types";

export type StockfishEngine = ChessEngine;
export type StockfishCallback = (line: string) => void;

const ENGINE_URL = "/stockfish/stockfish-18-lite-single.js";

export function createStockfishEngine(): StockfishEngine {
  return createUciWorkerEngine(ENGINE_URL);
}

/** Best move from FEN (depth in plies, default 12). */
export function getBestMove(
  engine: StockfishEngine,
  fen: string,
  depth = 12
): Promise<string> {
  const search = new Promise<string>((resolve) => {
    engine.stop();
    engine.send(`position fen ${fen}`);
    engine.send(`go depth ${depth}`, (out) => {
      const line = out.split("\n").find((l) => l.startsWith("bestmove"));
      const move = line?.split(" ")[1] ?? "";
      resolve(move === "(none)" ? "" : move);
    });
  });
  return withSearchHardTimeout(search, engine).catch(() => "");
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

    engine.stop();
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
  const cmds: string[] = [];
  if (opts.limitStrength && opts.elo !== undefined) {
    cmds.push("setoption name UCI_LimitStrength value true");
    cmds.push(`setoption name UCI_Elo value ${opts.elo}`);
  }
  if (opts.skillLevel !== undefined) {
    cmds.push(`setoption name Skill Level value ${opts.skillLevel}`);
  }
  if (!cmds.length) return Promise.resolve();

  return new Promise((resolve) => {
    const run = (i: number) => {
      if (i >= cmds.length) {
        engine.send("isready", () => resolve());
        return;
      }
      engine.send(cmds[i]!, () => run(i + 1));
    };
    engine.stop();
    run(0);
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

const SEARCH_HARD_TIMEOUT_MS = 45_000;

function withSearchHardTimeout<T>(
  promise: Promise<T>,
  engine: StockfishEngine,
  ms = SEARCH_HARD_TIMEOUT_MS
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      engine.stop();
      reject(new Error("Engine search timed out — try closing review and starting again."));
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export function getEvaluation(
  engine: StockfishEngine,
  fen: string,
  depth = 10
): Promise<EvalResult> {
  const search = new Promise<EvalResult>((resolve) => {
    engine.stop();
    engine.send(`position fen ${fen}`);
    engine.send(`go depth ${depth}`, (out) => {
      resolve(parseEvalFromOutput(out));
    });
  });
  return withSearchHardTimeout(search, engine);
}

function runSearch(
  engine: StockfishEngine,
  fen: string,
  depth: number,
  multiPv: number
): Promise<{ eval: EvalResult; topMoves: { move: string; cp: number }[] }> {
  return new Promise((resolve, reject) => {
    engine.stop();

    const finishSearch = (out: string) => {
      try {
        resolve({
          eval: parseEvalFromOutput(out),
          topMoves: parseTopMovesFromOutput(out, fen, multiPv),
        });
      } catch (err) {
        reject(err);
      }
    };

    const resetMultiPv = (out: string) => {
      if (multiPv <= 1) {
        finishSearch(out);
        return;
      }
      engine.send("setoption name MultiPV value 1", () => {
        engine.send("isready", () => finishSearch(out));
      });
    };

    const startGo = () => {
      engine.send(`position fen ${fen}`);
      engine.send(`go depth ${depth}`, resetMultiPv);
    };

    if (multiPv > 1) {
      engine.send(`setoption name MultiPV value ${multiPv}`, () => {
        engine.send("isready", startGo);
      });
    } else {
      startGo();
    }
  });
}

/** One search: root eval + top N lines (scores from White's perspective). */
export function searchPosition(
  engine: StockfishEngine,
  fen: string,
  depth: number,
  multiPv: number
): Promise<{ eval: EvalResult; topMoves: { move: string; cp: number }[] }> {
  return withSearchHardTimeout(runSearch(engine, fen, depth, multiPv), engine);
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

