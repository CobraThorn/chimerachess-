/** Shared UCI worker interface (Stockfish, Torch 4, …). */
export type EngineCallback = (line: string) => void;

export interface ChessEngine {
  send: (cmd: string, onComplete?: (output: string) => void) => void;
  onLine: (cb: EngineCallback) => void;
  setAnalysisHook: (cb: EngineCallback | null) => void;
  invalidateAnalysisHook: () => void;
  stop: () => void;
  quit: () => void;
  readonly ready: boolean;
  readonly loadFailed: boolean;
}

export type AnalysisEngineId = "stockfish" | "torch";

export interface EngineDescriptor {
  id: AnalysisEngineId;
  label: string;
  version: string;
  /** Public path to the worker script */
  scriptUrl: string;
}
