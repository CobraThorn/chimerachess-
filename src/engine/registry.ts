import { createStockfishEngine, STOCKFISH_VERSION } from "./stockfish";
import type { AnalysisEngineId, ChessEngine, EngineDescriptor } from "./types";

export const STOCKFISH_DESCRIPTOR: EngineDescriptor = {
  id: "stockfish",
  label: "Stockfish",
  version: String(STOCKFISH_VERSION),
  scriptUrl: "/stockfish/stockfish-18-lite-single.js",
};

export function createAnalysisEngine(_id: AnalysisEngineId): ChessEngine {
  return createStockfishEngine();
}

export async function listAvailableEngines(): Promise<EngineDescriptor[]> {
  return [STOCKFISH_DESCRIPTOR];
}
