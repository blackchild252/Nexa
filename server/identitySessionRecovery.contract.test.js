"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = name => fs.readFileSync(path.join(__dirname, name), "utf8");

test("login and session creation require an explicitly active account", () => {
  const auth = read("auth.js");
  assert.match(auth, /u\.accountStatus === "active" && await bcrypt\.compare/);
  assert.match(auth, /if\(!account \|\| account\.accountStatus !== "active"\)/);
  assert.match(auth, /if\(!u \|\| u\.accountStatus !== "active"\) return false/);
  assert.match(auth, /row && row\.accountStatus !== "active"/);
  assert.match(auth, /row\.accountStatus === "closed"/);
});

test("session rotation rechecks current account state before issuing a new token", () => {
  const auth = read("auth.js");
  const rotation = auth.slice(auth.indexOf("function rotateSession"), auth.indexOf("module.exports"));
  assert.match(rotation, /SELECT accountStatus FROM users WHERE id=\?/);
  assert.match(rotation, /account\.accountStatus !== "active"/);
  assert.ok(rotation.indexOf('account.accountStatus !== "active"') < rotation.indexOf("const next="));
});

test("email and password action tokens are issued only for active accounts", () => {
  const lifecycle = read("authLifecycle.js");
  assert.match(lifecycle, /SELECT id,email FROM users WHERE id=\? AND accountStatus = 'active'/);
  assert.match(lifecycle, /SELECT id,email FROM users WHERE email=\? AND accountStatus = 'active'/);
  assert.match(lifecycle, /UPDATE users SET emailVerifiedAt=\? WHERE id=\? AND accountStatus = 'active'/);
  assert.match(lifecycle, /if \(!user \|\| user\.accountStatus !== "active"\)/);
});

test("local Zeeza 2FA contracts preserve account/session/purpose binding and single use", () => {
  const service = read("zeezaTwoFactorLocal.js");
  assert.match(service, /record\.accountId === accountId && record\.sessionId === sessionId && record\.purpose === purpose/);
  assert.match(service, /record\.consumedAt/);
  assert.match(service, /2FA_CHALLENGE_REPLAYED/);
  assert.match(service, /2FA_RATE_LIMITED/);
  assert.match(service, /2FA_RECOVERY_DENIED/);
});
