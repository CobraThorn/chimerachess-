import crypto from "node:crypto";

const KEY_LEN = 32;
const SCRYPT_OPTS = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export function validatePassword(password) {
  const p = String(password ?? "");
  if (p.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (p.length > 128) {
    return { ok: false, error: "Password is too long." };
  }
  return { ok: true, password: p };
}

/** @param {string} password */
export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_OPTS);
  return `scrypt:${salt.toString("base64")}:${hash.toString("base64")}`;
}

/**
 * @param {string} password
 * @param {string | undefined} stored
 */
export function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string" || !stored.startsWith("scrypt:")) {
    return false;
  }
  const parts = stored.split(":");
  if (parts.length !== 3) return false;
  const salt = Buffer.from(parts[1], "base64");
  const expected = Buffer.from(parts[2], "base64");
  if (salt.length < 8 || expected.length !== KEY_LEN) return false;
  const actual = crypto.scryptSync(password, salt, KEY_LEN, SCRYPT_OPTS);
  return crypto.timingSafeEqual(actual, expected);
}
