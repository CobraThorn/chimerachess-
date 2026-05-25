/**
 * CHIMERA data collection API (local dev / self-hosted).
 * Stores accounts and telemetry under server/data/
 */
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { attachOnlinePlay, getOnlineStats } from "./online.mjs";
import { forwardOpenAiChat, sanitizeChatBody } from "./openai.mjs";
import {
  createSession,
  ensureSessionsDir,
  requireSession,
  requireSessionForAccount,
} from "./session.mjs";
import {
  hashPassword,
  validatePassword,
  verifyPassword,
} from "./password.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
/** Railway/Render set PORT; local dev uses CHIMERA_API_PORT or 8787 */
const PORT =
  Number(process.env.PORT) ||
  Number(process.env.CHIMERA_API_PORT) ||
  8787;
const DATA_DIR =
  process.env.CHIMERA_DATA_DIR?.trim() ||
  path.join(__dirname, "data");
const DEV_CORS_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function parseCorsAllowlist() {
  const raw = process.env.CHIMERA_CORS_ORIGIN?.trim();
  if (!raw) {
    return process.env.NODE_ENV === "production" ? [] : DEV_CORS_ORIGINS;
  }
  if (raw === "*") return ["*"];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

const CORS_ALLOWLIST = parseCorsAllowlist();
const ACCOUNTS_DIR = path.join(DATA_DIR, "accounts");
const EVENTS_DIR = path.join(DATA_DIR, "events");
const BACKUPS_DIR = path.join(DATA_DIR, "backups");

async function ensureDirs() {
  await fs.mkdir(ACCOUNTS_DIR, { recursive: true });
  await fs.mkdir(EVENTS_DIR, { recursive: true });
  await fs.mkdir(BACKUPS_DIR, { recursive: true });
  await ensureSessionsDir(DATA_DIR);
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
  const sessions = path.join(DATA_DIR, "sessions");
  for (const dir of [ACCOUNTS_DIR, EVENTS_DIR, BACKUPS_DIR, sessions]) {
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

const MAX_BODY_BYTES = 2 * 1024 * 1024;

function sanitizeStorageId(id, label = "id") {
  if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{8,128}$/.test(id)) {
    throw new Error(`Invalid ${label}`);
  }
  return id;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) {
      throw new Error("Request body too large");
    }
    chunks.push(chunk);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    const err = new Error("Invalid JSON body");
    err.status = 400;
    throw err;
  }
}

function resolveCorsOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || typeof origin !== "string") return null;
  if (CORS_ALLOWLIST.includes("*")) return "*";
  if (CORS_ALLOWLIST.includes(origin)) return origin;
  return null;
}

function send(req, res, status, data) {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Chimera-Session",
  };
  const cors = resolveCorsOrigin(req);
  if (cors) headers["Access-Control-Allow-Origin"] = cors;
  res.writeHead(status, headers);
  res.end(JSON.stringify(data));
}

async function saveAccount(account) {
  if (!account?.id || !account?.email) {
    throw new Error("account.id and account.email required");
  }
  sanitizeStorageId(account.id, "account.id");
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
  sanitizeStorageId(accountId, "accountId");
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
  sanitizeStorageId(accountId, "accountId");
  const file = path.join(BACKUPS_DIR, `${accountId}.json`);
  await fs.writeFile(
    file,
    JSON.stringify({ savedAt: Date.now(), ...save }, null, 2)
  );
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    send(req, res, 204, {});
    return;
  }

  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);
  const pathname = url.pathname.replace(/\/+$/, "") || "/";

  try {
    if (req.method === "GET" && (pathname === "/" || pathname === "")) {
      send(req, res, 200, {
        ok: true,
        service: "chimera-data-api",
        message: "CHIMERA API is running. Use /api/chimera/health or deploy the app on Netlify.",
        health: "/api/chimera/health",
        websocket: "/api/chimera/ws",
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/chimera/health") {
      await ensureDirs();
      const stats = await getStats();
      send(req, res, 200, {
        ok: true,
        service: "chimera-data-api",
        stats,
        online: getOnlineStats(),
        features: {
          openai: !!process.env.CHIMERA_OPENAI_API_KEY?.trim(),
          sessions: true,
        },
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/chimera/register") {
      await ensureDirs();
      const body = await readBody(req);
      const account = body.account;
      if (!account?.id || !account?.email) {
        send(req, res, 400, { ok: false, error: "account.id and account.email required" });
        return;
      }
      const pw = validatePassword(body.password);
      if (!pw.ok) {
        send(req, res, 400, { ok: false, error: pw.error });
        return;
      }
      sanitizeStorageId(account.id, "account.id");
      const email = normalizeEmail(account.email);
      if (!email) {
        send(req, res, 400, { ok: false, error: "valid email required" });
        return;
      }
      const existing = await findAccountByEmail(email);
      if (existing && existing.id !== account.id) {
        send(req, res, 409, { ok: false, error: "Email already registered" });
        return;
      }
      if (
        existing?.passwordHash &&
        !verifyPassword(pw.password, existing.passwordHash)
      ) {
        send(req, res, 401, {
          ok: false,
          error: "Wrong password for this email. Sign in instead.",
        });
        return;
      }
      const passwordHash = hashPassword(pw.password);
      const saved = await saveAccount({
        ...existing,
        ...account,
        email,
        passwordHash,
        lastLoginAt: Date.now(),
      });
      const sessionToken = await createSession(DATA_DIR, saved.id);
      send(req, res, 200, {
        ok: true,
        account: publicAccountPayload(saved),
        sessionToken,
      });
      return;
    }

    if (req.method === "POST" && pathname === "/api/chimera/login") {
      await ensureDirs();
      const body = await readBody(req);
      const email = normalizeEmail(body.email);
      if (!email) {
        send(req, res, 400, { ok: false, error: "email required" });
        return;
      }
      const pw = validatePassword(body.password);
      if (!pw.ok) {
        send(req, res, 400, { ok: false, error: pw.error });
        return;
      }
      const found = await findAccountByEmail(email);
      if (!found) {
        send(req, res, 404, { ok: false, error: "Account not found" });
        return;
      }
      if (!found.passwordHash) {
        send(req, res, 403, {
          ok: false,
          error:
            "This account needs a password. Use Register with this email to set one.",
        });
        return;
      }
      if (!verifyPassword(pw.password, found.passwordHash)) {
        send(req, res, 401, { ok: false, error: "Invalid email or password." });
        return;
      }
      const save = await loadUserBackup(found.id);
      await saveAccount({ ...found, lastLoginAt: Date.now() });
      const sessionToken = await createSession(DATA_DIR, found.id);
      send(req, res, 200, {
        ok: true,
        account: publicAccountPayload(found),
        save,
        sessionToken,
      });
      return;
    }

    if (req.method === "GET" && pathname === "/api/chimera/backup") {
      await ensureDirs();
      const accountId = url.searchParams.get("accountId");
      if (!accountId) {
        send(req, res, 400, { ok: false, error: "accountId required" });
        return;
      }
      await requireSessionForAccount(DATA_DIR, accountId, req);
      const save = await loadUserBackup(accountId);
      send(req, res, 200, { ok: true, save });
      return;
    }

    if (req.method === "POST" && pathname === "/api/chimera/backup") {
      await ensureDirs();
      const body = await readBody(req);
      const accountId = body.accountId;
      const save = body.save;
      if (!accountId || !save) {
        send(req, res, 400, { ok: false, error: "accountId and save required" });
        return;
      }
      await requireSessionForAccount(DATA_DIR, accountId, req);
      await saveUserBackup(accountId, save);
      if (body.account?.id === accountId) {
        await saveAccount({
          ...body.account,
          chimeraSetupComplete: true,
        });
      }
      send(req, res, 200, { ok: true, savedAt: Date.now() });
      return;
    }

    if (req.method === "POST" && pathname === "/api/chimera/openai/chat") {
      await requireSession(DATA_DIR, req);
      const body = await readBody(req);
      const payload = sanitizeChatBody(body);
      const { status, data } = await forwardOpenAiChat(payload);
      send(req, res, status >= 400 ? status : 200, data);
      return;
    }

    if (req.method === "POST" && pathname === "/api/chimera/admin/wipe-all") {
      if (!adminSecretOk(req)) {
        send(req, res, 403, { ok: false, error: "Forbidden" });
        return;
      }
      const result = await wipeAllUserData();
      send(req, res, 200, { ok: true, ...result, wipedAt: Date.now() });
      return;
    }

    if (req.method === "POST" && pathname === "/api/chimera/sync") {
      await ensureDirs();
      const session = await requireSession(DATA_DIR, req);
      const body = await readBody(req);
      const account = body.account ?? null;
      const events = body.events ?? [];

      if (account?.id && account.id !== session.accountId) {
        send(req, res, 403, { ok: false, error: "Forbidden" });
        return;
      }

      let savedAccount = null;
      if (account) {
        savedAccount = await saveAccount(account);
      }

      const userId = account?.id ?? session.accountId;
      sanitizeStorageId(userId, "userId");
      const eventResult = await appendEvents(userId, events);

      send(req, res, 200, {
        ok: true,
        accountId: savedAccount?.id ?? userId,
        eventsReceived: events.length,
        eventsAppended: eventResult.appended,
        syncedAt: Date.now(),
      });
      return;
    }

    send(req, res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    console.error(err);
    const status =
      err && typeof err === "object" && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    send(req, res, status, {
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
