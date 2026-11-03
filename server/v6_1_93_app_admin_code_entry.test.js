"use strict";
// NEXA app code-entry step for admin and Admin-staff sign-in (follow-up to the verified-session work).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");
const load = () => import("../src/adminCodeEntry.ts");

test("code input keeps digits only and at most six", async () => {
  const { normalizeAdminCode, isAdminCodeComplete } = await load();
  assert.equal(normalizeAdminCode(" 12a3-45 6789"), "123456");
  assert.equal(normalizeAdminCode(""), "");
  assert.equal(isAdminCodeComplete("123456"), true);
  assert.equal(isAdminCodeComplete("12345"), false);
  assert.equal(isAdminCodeComplete("12345a"), false);
});

test("login reply with a challenge becomes a pending code step; plain replies do not", async () => {
  const { readPendingAdminCode } = await load();
  const id = "x".repeat(43);
  const p = readPendingAdminCode({ mfaRequired: true, challengeId: id, expiresInSeconds: 300 }, 1000);
  assert.deepEqual(p, { challengeId: id, expiresAt: 1000 + 300000 });
  assert.equal(readPendingAdminCode({ token: "t", user: {} }, 1000), null);
  assert.equal(readPendingAdminCode({ mfaRequired: true, challengeId: "short" }, 1000), null);
  assert.equal(readPendingAdminCode({ mfaRequired: true }, 1000), null);
  assert.equal(readPendingAdminCode(null), null);
  // an absurd lifetime from the server is not trusted
  assert.equal(readPendingAdminCode({ mfaRequired: true, challengeId: id, expiresInSeconds: 999999 }, 0).expiresAt, 300000);
});

test("stored code step is dropped when expired or damaged", async () => {
  const { parseStoredAdminCode, isAdminCodeExpired } = await load();
  const id = "y".repeat(43);
  assert.equal(parseStoredAdminCode(JSON.stringify({ challengeId: id, expiresAt: 5000 }), 4000).challengeId, id);
  assert.equal(parseStoredAdminCode(JSON.stringify({ challengeId: id, expiresAt: 5000 }), 5000), null);
  assert.equal(parseStoredAdminCode("not json"), null);
  assert.equal(parseStoredAdminCode(JSON.stringify({ challengeId: 7 })), null);
  assert.equal(parseStoredAdminCode(null), null);
  assert.equal(isAdminCodeExpired(null), true);
});

test("wrong code can be retried; a dead challenge forces a new sign-in", async () => {
  const { adminCodeFailureKind } = await load();
  assert.equal(adminCodeFailureKind(401), "retry");
  assert.equal(adminCodeFailureKind(400), "restart");
  assert.equal(adminCodeFailureKind(409), "restart");
  assert.equal(adminCodeFailureKind(undefined), "restart");
});

test("api call posts the challenge and code to the verify route", () => {
  const api = read("src/api.ts");
  assert.match(api, /export async function verifyAdminLoginCode/);
  assert.match(api, /publicFetch\('\/api\/auth\/admin-mfa\/verify'/);
});

test("auth provider wires the code step: pending state, switch to the verified token, retire the ordinary session", () => {
  const a = read("src/auth.tsx");
  assert.match(a, /readPendingAdminCode\(data\)/);
  assert.match(a, /verifyAdminCode=useCallback/);
  assert.match(a, /verifyAdminLoginCode\(pending\.challengeId,code\)/);
  assert.match(a, /authedFetch\('\/api\/auth\/logout'/);
  // the verified token replaces the ordinary one only after the server accepted the code
  assert.ok(a.indexOf("verifyAdminLoginCode(pending.challengeId") < a.indexOf("writeStoredToken(String(data.token));\n    setNexaToken(String(data.token));\n    setUser(data.user);\n    setAdminCode(null)"));
  // sign-out and session loss clear the pending step
  const clear = a.slice(a.indexOf("const clearSession"), a.indexOf("const restore=useCallback"));
  assert.match(clear, /setAdminCode\(null\)/);
  assert.match(clear, /deletePendingStored\(\)/);
  assert.match(a, /adminCodePending/);
  assert.match(a, /<AdminCodePrompt\/>/);
});

test("prompt never shows or fills the code itself and offers inbox and sign-out", () => {
  const c = read("src/AdminCodePrompt.tsx");
  assert.match(c, /normalizeAdminCode/);
  assert.match(c, /router\.push\('\/zeeza\/inbox'/);
  assert.match(c, /signOut\(\)/);
  assert.doesNotMatch(c, /local-inbox/);
  assert.match(c, /oneTimeCode/);
});

test("server still hands the NEXA app a no-power session plus a challenge, and the Admin app a challenge only", () => {
  const i = read("server/index.js");
  assert.match(i, /adminVerificationRequired: true/);
  assert.match(i, /aami admin web/);
  assert.match(i, /app\.post\("\/api\/auth\/login"/);
});
