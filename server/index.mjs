/**
 * CHIMERA data collection API (local dev / self-hosted).
 * Stores accounts and telemetry under server/data/
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachOnlinePlay, getOnlineStats } from "./online.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Railway/Render set PORT; local dev uses CHIMERA_API_PORT or 8787 */
const PORT =
  Number(process.env.PORT) ||
  Number(process.env.CHIMERA_API_PORT) ||
  8787;
const DATA_DIR =
  process.env.CHIMERA_DATA_DIR?.trim() ||
  path.join(__dirname, "data");
const CORS_ORIGIN = process.env.CHIMERA_CORS_ORIGIN?.trim() || "*";
const ACCOUNTS_DIR = path.join(DATA_DIR, "accounts");
const EVENTS_DIR = path.join(DATA_DIR, "events");

async function ensureDirs() {
  await fs.mkdir(ACCOUNTS_DIR, { recursive: true });
  await fs.mkdir(EVENTS_DIR, { recursive: true });
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  return JSON.parse(text);
}

function send(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": CORS_ORIGIN,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

async function saveAccount(account) {
  if (!account?.id || !account?.email) {
    throw new Error("account.id and account.email required");
  }
  const file = path.join(ACCOUNTS_DIR, `${account.id}.json`);
  let existing = null;
  try {
    existing = JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    /* new */
  }
  const merged = {
    ...existing,
    ...account,
    updatedAt: Date.now(),
    firstSeenAt: existing?.firstSeenAt ?? account.createdAt ?? Date.now(),
  };
  await fs.writeFile(file, JSON.stringify(merged, null, 2));
  return merged;
}

async function appendEvents(userId, events) {
  if (!userId || !Array.isArray(events) || events.length === 0) {
    return { appended: 0 };
  }
  const file = path.join(EVENTS_DIR, `${userId}.jsonl`);
  let existingIds = new Set();
  try {
    const lines = (await fs.readFile(file, "utf8")).trim().split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        existingIds.add(JSON.parse(line).id);
      } catch {
        /* skip */
      }
    }
  } catch {
    /* new file */
  }
  const fresh = events.filter((e) => e?.id && !existingIds.has(e.id));
  if (fresh.length === 0) return { appended: 0 };
  const payload = fresh.map((e) => JSON.stringify(e)).join("\n") + "\n";
  await fs.appendFile(file, payload);
  return { appended: fresh.length };
}

async function getStats() {
  const accounts = await fs.readdir(ACCOUNTS_DIR).catch(() => []);
  const eventFiles = await fs.readdir(EVENTS_DIR).catch(() => []);
  return {
    accounts: accounts.filter((f) => f.endsWith(".json")).length,
    eventStreams: eventFiles.filter((f) => f.endsWith(".jsonl")).length,
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/chimera/health") {
      await ensureDirs();
      const stats = await getStats();
      send(res, 200, {
        ok: true,
        service: "chimera-data-api",
        stats,
        online: getOnlineStats(),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chimera/sync") {
      await ensureDirs();
      const body = await readBody(req);
      const account = body.account ?? null;
      const events = body.events ?? [];

      let savedAccount = null;
      if (account) {
        savedAccount = await saveAccount(account);
      }

      const userId = account?.id ?? body.userId;
      const eventResult = userId
        ? await appendEvents(userId, events)
        : { appended: 0 };

      send(res, 200, {
        ok: true,
        accountId: savedAccount?.id ?? userId ?? null,
        eventsReceived: events.length,
        eventsAppended: eventResult.appended,
        syncedAt: Date.now(),
      });
      return;
    }

    send(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    console.error(err);
    send(res, 500, {
      ok: false,
      error: err instanceof Error ? err.message : "Server error",
    });
  }
});

await ensureDirs();
attachOnlinePlay(server);
server.listen(PORT, () => {
  console.log(`CHIMERA data API → http://localhost:${PORT}`);
  console.log(`  Health: GET /api/chimera/health`);
  console.log(`  Sync:   POST /api/chimera/sync`);
  console.log(`  Data:   ${DATA_DIR}`);
});
