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
const BACKUPS_DIR = path.join(DATA_DIR, "backups");

async function ensureDirs() {
  await fs.mkdir(ACCOUNTS_DIR, { recursive: true });
  await fs.mkdir(EVENTS_DIR, { recursive: true });
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
}

const WIPE_GENERATION_FILE = path.join(__dirname, "wipe-generation.json");

async function readRequiredWipeGeneration() {
  try {
    const raw = await fs.readFile(WIPE_GENERATION_FILE, "utf8");
    const cfg = JSON.parse(raw);
    const n = Number(cfg?.generation);
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

async function wipeAllUserData() {
  await ensureDirs();
  let removed = 0;
  for (const dir of [ACCOUNTS_DIR, EVENTS_DIR, BACKUPS_DIR]) {
    const names = await fs.readdir(dir).catch(() => []);
    for (const name of names) {
      if (name.startsWith(".")) continue;
      await fs.unlink(path.join(dir, name)).catch(() => {});
      removed++;
    }
  }
  return { removed };
}

/** Wipes server data once per wipe-generation.json bump (see server/wipe-generation.json). */
async function maybeGenerationWipe() {
  const generation = await readRequiredWipeGeneration();
  if (!generation) return { wiped: false, generation: 0 };

  const marker = path.join(DATA_DIR, `.chimera-storage-generation-${generation}`);
  try {
    await fs.access(marker);
    return { wiped: false, generation };
  } catch {
    /* not wiped for this generation yet */
  }

  const result = await wipeAllUserData();
  await fs.writeFile(
    marker,
    JSON.stringify({ wipedAt: Date.now(), generation, ...result }, null, 2)
  );
  console.log(
    `[CHIMERA] Generation-${generation} server wipe: ${result.removed} file(s) removed`
  );
  return { wiped: true, generation, ...result };
}

function adminSecretOk(req) {
  const expected = process.env.CHIMERA_ADMIN_SECRET?.trim();
  if (!expected) return false;
  const header = req.headers["x-chimera-admin-secret"];
  return typeof header === "string" && header === expected;
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

function normalizeEmail(email) {
  return String(email ?? "")
    .trim()
    .toLowerCase();
}

/** Find saved account JSON by email (for login on new devices). */
async function findAccountByEmail(email) {
  const norm = normalizeEmail(email);
  if (!norm || !norm.includes("@")) return null;

  const files = await fs.readdir(ACCOUNTS_DIR).catch(() => []);
  for (const name of files) {
    if (!name.endsWith(".json")) continue;
    try {
      const data = JSON.parse(
        await fs.readFile(path.join(ACCOUNTS_DIR, name), "utf8")
      );
      if (normalizeEmail(data.email) === norm) {
        return data;
      }
    } catch {
      /* skip corrupt file */
    }
  }
  return null;
}

function publicAccountPayload(record) {
  if (!record) return null;
  return {
    id: record.id,
    email: record.email,
    phone: record.phone ?? null,
    displayName: record.displayName ?? "Player",
    createdAt: record.createdAt ?? record.firstSeenAt ?? Date.now(),
    lastLoginAt: record.lastLoginAt ?? Date.now(),
    consents: record.consents ?? {
      analytics: true,
      marketing: false,
      cognitiveResearch: false,
    },
    chimeraSetupComplete: record.chimeraSetupComplete === true,
  };
}

async function loadUserBackup(accountId) {
  if (!accountId) return null;
  const file = path.join(BACKUPS_DIR, `${accountId}.json`);
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function saveUserBackup(accountId, save) {
  if (!accountId || !save) {
    throw new Error("accountId and save required");
  }
  const file = path.join(BACKUPS_DIR, `${accountId}.json`);
  await fs.writeFile(
    file,
    JSON.stringify({ savedAt: Date.now(), ...save }, null, 2)
  );
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(res, 204, {});
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  try {
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "")) {
      send(res, 200, {
        ok: true,
        service: "chimera-data-api",
        message: "CHIMERA API is running. Use /api/chimera/health or deploy the app on Netlify.",
        health: "/api/chimera/health",
        websocket: "/api/chimera/ws",
      });
      return;
    }

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

    if (req.method === "POST" && url.pathname === "/api/chimera/login") {
      await ensureDirs();
      const body = await readBody(req);
      const email = normalizeEmail(body.email);
      if (!email) {
        send(res, 400, { ok: false, error: "email required" });
        return;
      }
      const found = await findAccountByEmail(email);
      if (!found) {
        send(res, 404, { ok: false, error: "Account not found" });
        return;
      }
      const save = await loadUserBackup(found.id);
      send(res, 200, {
        ok: true,
        account: publicAccountPayload(found),
        save,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/chimera/backup") {
      await ensureDirs();
      const accountId = url.searchParams.get("accountId");
      if (!accountId) {
        send(res, 400, { ok: false, error: "accountId required" });
        return;
      }
      const save = await loadUserBackup(accountId);
      send(res, 200, { ok: true, save });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chimera/backup") {
      await ensureDirs();
      const body = await readBody(req);
      const accountId = body.accountId;
      const save = body.save;
      if (!accountId || !save) {
        send(res, 400, { ok: false, error: "accountId and save required" });
        return;
      }
      await saveUserBackup(accountId, save);
      if (body.account) {
        await saveAccount({
          ...body.account,
          chimeraSetupComplete: true,
        });
      } else {
        const existing = await findAccountByEmail(body.email ?? "");
        if (existing) {
          await saveAccount({
            ...existing,
            chimeraSetupComplete: true,
          });
        }
      }
      send(res, 200, { ok: true, savedAt: Date.now() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chimera/admin/wipe-all") {
      if (!adminSecretOk(req)) {
        send(res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      const result = await wipeAllUserData();
      send(res, 200, { ok: true, ...result, wipedAt: Date.now() });
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
await maybeGenerationWipe();
attachOnlinePlay(server);
server.listen(PORT, () => {
  console.log(`CHIMERA data API → http://localhost:${PORT}`);
  console.log(`  Health: GET /api/chimera/health`);
  console.log(`  Login:  POST /api/chimera/login`);
  console.log(`  Sync:   POST /api/chimera/sync`);
  console.log(`  Data:   ${DATA_DIR}`);
});
