import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

/** @param {string} dataDir */
export function sessionsDir(dataDir) {
  return path.join(dataDir, "sessions");
}

/** @param {string} dataDir */
export async function ensureSessionsDir(dataDir) {
  await fs.mkdir(sessionsDir(dataDir), { recursive: true });
}

/**
 * @param {string} dataDir
 * @param {string} accountId
 */
export async function createSession(dataDir, accountId) {
  await ensureSessionsDir(dataDir);
  const token = crypto.randomBytes(32).toString("base64url");
  const record = {
    accountId,
    createdAt: Date.now(),
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  await fs.writeFile(
    path.join(sessionsDir(dataDir), `${token}.json`),
    JSON.stringify(record)
  );
  return token;
}

/**
 * @param {string} dataDir
 * @param {import('node:http').IncomingMessage} req
 */
export async function sessionFromRequest(dataDir, req) {
  const header = req.headers["x-chimera-session"];
  const token =
    typeof header === "string" && header.trim()
      ? header.trim()
      : null;
  if (!token || !/^[a-zA-Z0-9_-]{32,128}$/.test(token)) {
    return null;
  }
  try {
    const raw = await fs.readFile(
      path.join(sessionsDir(dataDir), `${token}.json`),
      "utf8"
    );
    const record = JSON.parse(raw);
    if (!record?.accountId || Date.now() > record.expiresAt) {
      await fs.unlink(path.join(sessionsDir(dataDir), `${token}.json`)).catch(
        () => {}
      );
      return null;
    }
    return { token, accountId: record.accountId };
  } catch {
    return null;
  }
}

/**
 * @param {string} dataDir
 * @param {import('node:http').IncomingMessage} req
 */
export async function requireSession(dataDir, req) {
  const session = await sessionFromRequest(dataDir, req);
  if (!session) {
    const err = new Error("Unauthorized");
    err.status = 401;
    throw err;
  }
  return session;
}

/**
 * @param {string} dataDir
 * @param {string} accountId
 * @param {import('node:http').IncomingMessage} req
 */
export async function requireSessionForAccount(dataDir, accountId, req) {
  const session = await requireSession(dataDir, req);
  if (session.accountId !== accountId) {
    const err = new Error("Forbidden");
    err.status = 403;
    throw err;
  }
  return session;
}
