import { copyFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules", "stockfish", "bin");
const destDir = join(root, "public", "stockfish");

const files = [
  "stockfish-18-lite-single.js",
  "stockfish-18-lite-single.wasm",
];

mkdirSync(destDir, { recursive: true });

for (const file of files) {
  const src = join(srcDir, file);
  const dest = join(destDir, file);
  if (!existsSync(src)) {
    console.warn(`[stockfish] missing ${src} — run npm install stockfish`);
    if (process.env.RENDER || process.env.SKIP_STOCKFISH_COPY) {
      console.warn("[stockfish] skipping (deploy API-only)");
      process.exit(0);
    }
    process.exit(1);
  }
  copyFileSync(src, dest);
  console.log(`[stockfish] copied ${file} → public/stockfish/`);
}

// Worker loads "stockfish.wasm" beside the script URL
const wasmSrc = join(srcDir, "stockfish-18-lite-single.wasm");
copyFileSync(wasmSrc, join(destDir, "stockfish.wasm"));
console.log("[stockfish] copied stockfish.wasm (lite-single)");
