import {
  CHIMERA_API_PREFIX,
  normalizeChimeraEndpoint,
} from "../src/api/client.ts";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const cases: [string, string][] = [
  ["/login", "/login"],
  ["login", "/login"],
  ["/api/chimera/login", "/login"],
  ["/api/chimera/api/chimera/register", "/register"],
  ["/register/", "/register"],
];

for (const [input, expected] of cases) {
  assert(
    normalizeChimeraEndpoint(input) === expected,
    `normalize(${input}) expected ${expected}`
  );
}

function buildUrl(base: string, endpoint: string): string {
  let host = base.trim().replace(/\/+$/, "");
  if (host.endsWith(CHIMERA_API_PREFIX)) {
    host = host.slice(0, -CHIMERA_API_PREFIX.length).replace(/\/+$/, "");
  }
  const path = `${CHIMERA_API_PREFIX}${normalizeChimeraEndpoint(endpoint)}`;
  return host ? `${host}${path}` : path;
}

assert(
  buildUrl("", "/register") === `${CHIMERA_API_PREFIX}/register`,
  "same-origin register"
);
assert(
  buildUrl("https://example.onrender.com/api/chimera", "/register") ===
    "https://example.onrender.com/api/chimera/register",
  "no double /api/chimera when env includes prefix"
);
assert(
  buildUrl("https://example.onrender.com", "/api/chimera/login") ===
    "https://example.onrender.com/api/chimera/login",
  "full path endpoint deduped"
);

console.log("api client URL tests passed");
