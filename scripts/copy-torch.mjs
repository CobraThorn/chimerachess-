import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "public", "torch");
const srcDir = process.env.TORCH_SRC || join(root, "third_party", "torch");
const sfDir = join(root, "node_modules", "stockfish", "bin");
const sfPublic = join(root, "public", "stockfish");

mkdirSync(destDir, { recursive: true });

function writeManifest(kind, label) {
  writeFileSync(
    join(destDir, "engine.json"),
    JSON.stringify({ kind, label, version: 4 }, null, 2)
  );
}

function deployLicensedTorch() {
  const files = readdirSync(srcDir).filter(
    (f) => f.endsWith(".js") || f.endsWith(".wasm") || f === "torch.wasm"
  );
  if (!files.length) return false;

  for (const file of files) {
    copyFileSync(join(srcDir, file), join(destDir, file));
    console.log(`[torch] copied ${file} → public/torch/`);
  }
  const wasm = files.find((f) => f.endsWith(".wasm"));
  if (wasm && wasm !== "torch.wasm") {
    copyFileSync(join(srcDir, wasm), join(destDir, "torch.wasm"));
    console.log("[torch] copied torch.wasm alias");
  }
  writeManifest("torch", "Torch 4");
  return true;
}

/** Second analysis engine (Stockfish WASM) so dual review works without manual setup. */
function deployDualEngineShim() {
  const jsSrc = join(sfDir, "stockfish-18-lite-single.js");
  const wasmSrc = join(sfDir, "stockfish-18-lite-single.wasm");
  if (!existsSync(jsSrc) || !existsSync(wasmSrc)) {
    if (existsSync(join(sfPublic, "stockfish-18-lite-single.js"))) {
      copyFileSync(
        join(sfPublic, "stockfish-18-lite-single.js"),
        join(destDir, "torch-4.js")
      );
      copyFileSync(join(sfPublic, "stockfish-18-lite-single.wasm"), join(destDir, "torch-4.wasm"));
      copyFileSync(join(sfPublic, "stockfish-18-lite-single.wasm"), join(destDir, "torch.wasm"));
      copyFileSync(join(sfPublic, "stockfish-18-lite-single.wasm"), join(destDir, "stockfish.wasm"));
    } else {
      console.warn("[torch] Stockfish assets missing — cannot deploy dual-engine shim.");
      return false;
    }
  } else {
    copyFileSync(jsSrc, join(destDir, "torch-4.js"));
    copyFileSync(wasmSrc, join(destDir, "torch-4.wasm"));
    copyFileSync(wasmSrc, join(destDir, "torch.wasm"));
    copyFileSync(wasmSrc, join(destDir, "stockfish.wasm"));
  }

  console.log("[torch] deployed dual-engine shim → public/torch/torch-4.js (no manual setup)");
  writeManifest(
    "shim",
    "CHIMERA dual engine (second Stockfish instance — replace with licensed Torch 4 when available)"
  );
  return true;
}

if (existsSync(srcDir) && deployLicensedTorch()) {
  process.exit(0);
}

deployDualEngineShim();
