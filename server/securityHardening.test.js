"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

test("session tokens are stored hashed, never raw", () => {
  const auth = read("auth.js");
  assert.match(auth, /function hashToken/);
  assert.match(auth, /run\([^\n]*hashToken\(token\)/);
  assert.match(auth, /WHERE s\.token=\?"\)\.get\(hashToken\(token\)\)/);
  assert.doesNotMatch(auth, /\.run\(token,userId/);
});

test("login has both per-IP and per-account rate limits", () => {
  const idx = read("index.js");
  assert.match(idx, /app\.post\("\/api\/auth\/login", authLimiter, loginEmailLimiter/);
});

test("production sends HSTS and API responses default to a locked-down CSP", () => {
  const idx = read("index.js");
  assert.match(idx, /Strict-Transport-Security/);
  assert.match(idx, /default-src 'none'; frame-ancestors 'none'/);
});
