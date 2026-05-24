import { createStockfishEngine, STOCKFISH_VERSION } from "./stockfish";
import {
  createTorchEngine,
  probeTorchAvailable,
  TORCH_SCRIPT_URL,
  TORCH_VERSION,
} from "./torch";
import type { AnalysisEngineId, ChessEngine, EngineDescriptor } from "./types";

export const STOCKFISH_DESCRIPTOR: EngineDescriptor = {
  id: "stockfish",
  label: "Stockfish",
  version: String(STOCKFISH_VERSION),
  scriptUrl: "/stockfish/stockfish-18-lite-single.js",
};

export const TORCH_DESCRIPTOR: EngineDescriptor = {
  id: "torch",
  label: "Torch",
  version: String(TORCH_VERSION),
  scriptUrl: TORCH_SCRIPT_URL,
};

export function createAnalysisEngine(id: AnalysisEngineId): ChessEngine {
  if (id === "torch") return createTorchEngine();
  return createStockfishEngine();
}

export async function listAvailableEngines(): Promise<EngineDescriptor[]> {
  const list: EngineDescriptor[] = [STOCKFISH_DESCRIPTOR];
  if (await probeTorchAvailable()) {
    list.push(TORCH_DESCRIPTOR);
  }
  return list;
}
