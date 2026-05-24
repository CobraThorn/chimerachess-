import { copyFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const destDir = join(root, "public", "torch");

const srcDir =
  process.env.TORCH_SRC ||
  join(root, "third_party", "torch");

mkdirSync(destDir, { recursive: true });

if (!existsSync(srcDir)) {
  console.warn(
    "[torch] no Torch assets — place torch-4.js + torch-4.wasm in third_party/torch/ (see docs/TORCH.md). Analysis uses Stockfish only."
  );
  process.exit(0);
}

const files = readdirSync(srcDir).filter(
  (f) =>
    f.endsWith(".js") ||
    f.endsWith(".wasm") ||
    f === "torch.wasm"
);

if (!files.length) {
  console.warn("[torch] third_party/torch is empty — skipping copy.");
  process.exit(0);
}

for (const file of files) {
  copyFileSync(join(srcDir, file), join(destDir, file));
  console.log(`[torch] copied ${file} → public/torch/`);
}

const wasm = files.find((f) => f.endsWith(".wasm"));
if (wasm && wasm !== "torch.wasm") {
  copyFileSync(join(srcDir, wasm), join(destDir, "torch.wasm"));
  console.log("[torch] copied torch.wasm alias");
}
