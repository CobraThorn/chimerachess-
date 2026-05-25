import type { ChessEngine, EngineCallback } from "./types";

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

/** UCI chess engine backed by a Web Worker script (Stockfish / Torch 4). */
export function createUciWorkerEngine(scriptUrl: string): ChessEngine {
  const worker = new Worker(scriptUrl);
  const queue: PendingCommand[] = [];
  let lineListeners: EngineCallback[] = [];
  let analysisHook: EngineCallback | null = null;
  let hookGeneration = 0;
  let ready = false;
  let loadFailed = false;

  const flushQueue = () => {
    while (queue.length) {
      const head = queue.shift()!;
      if (head.onComplete) head.onComplete(head.lines.join("\n"));
    }
  };

  const dispatchLine = (line: string) => {
    analysisHook?.(line);
    for (const fn of lineListeners) fn(line);

    if (!queue.length) return;
    const head = queue[0];
    if (line.startsWith("No such option") || line.startsWith("Stockfish")) return;

    head.lines.push(line);
    if (isCommandDone(head.cmd, line)) {
      queue.shift();
      if (head.onComplete) head.onComplete(head.lines.join("\n"));
    }
  };

  worker.onerror = () => {
    loadFailed = true;
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
  let sendChain: Promise<void> = Promise.resolve();

  const engine: ChessEngine = {
    get ready() {
      return ready;
    },

    get loadFailed() {
      return loadFailed;
    },

    send(cmd: string, onComplete?: (output: string) => void) {
      const trimmed = cmd.trim();
      const noReply =
        trimmed === "ucinewgame" ||
        trimmed === "stop" ||
        trimmed === "ponderhit" ||
        trimmed.startsWith("position") ||
        trimmed.startsWith("setoption");

      const run = (): Promise<void> => {
        if (!noReply) {
          return new Promise((resolve) => {
            queue.push({
              cmd: trimmed,
              lines: [],
              onComplete: (out) => {
                onComplete?.(out);
                resolve();
              },
              done: false,
            });
            sendRaw(trimmed);
          });
        }
        sendRaw(trimmed);
        if (onComplete) setTimeout(() => onComplete(""), 0);
        return Promise.resolve();
      };

      sendChain = sendChain.then(run).catch(() => run());
    },

    onLine(cb) {
      lineListeners.push(cb);
    },

    setAnalysisHook(cb) {
      const gen = ++hookGeneration;
      if (!cb) {
        analysisHook = null;
        return;
      }
      analysisHook = (line) => {
        if (gen !== hookGeneration) return;
        cb(line);
      };
    },

    invalidateAnalysisHook() {
      hookGeneration += 1;
      analysisHook = null;
    },

    stop() {
      sendRaw("stop");
    },

    quit() {
      sendRaw("quit");
      worker.terminate();
      lineListeners = [];
      hookGeneration += 1;
      analysisHook = null;
      flushQueue();
    },
  };

  engine.send("uci", () => {
    engine.send("isready", () => {
      ready = true;
    });
  });

  return engine;
}
