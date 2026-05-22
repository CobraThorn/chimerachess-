/**
 * Starts CHIMERA data API + Vite dev server together.
 */
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const npmCmd = process.platform === "win32" ? "npm.cmd" : "npm";

function run(name, args) {
  const child = spawn(npmCmd, args, {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });
  return child;
}

console.log("Starting CHIMERA data API (8787) + Vite (5173)…\n");
run("server", ["run", "server"]);
setTimeout(() => run("vite", ["run", "dev"]), 800);

process.on("SIGINT", () => process.exit(0));
