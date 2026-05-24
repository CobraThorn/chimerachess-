/**
 * Wipe all CHIMERA server-side user data (accounts, events, backups).
 * Usage: node scripts/wipe-chimera-data.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR =
  process.env.CHIMERA_DATA_DIR?.trim() ||
  path.join(__dirname, "..", "server", "data");

const DIRS = ["accounts", "events", "backups"];

async function wipeDir(dir) {
  let removed = 0;
  const names = await fs.readdir(dir).catch(() => []);
  for (const name of names) {
    if (name.startsWith(".")) continue;
    await fs.unlink(path.join(dir, name)).catch(() => {});
    removed++;
  }
  return removed;
}

async function main() {
  let total = 0;
  for (const sub of DIRS) {
    const dir = path.join(DATA_DIR, sub);
    await fs.mkdir(dir, { recursive: true });
    total += await wipeDir(dir);
  }
  const marker = path.join(DATA_DIR, ".chimera-storage-generation-3");
  await fs.writeFile(
    marker,
    JSON.stringify({ wipedAt: Date.now(), via: "wipe-chimera-data.mjs" }, null, 2)
  );
  console.log(`Wiped ${total} file(s) under ${DATA_DIR}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
