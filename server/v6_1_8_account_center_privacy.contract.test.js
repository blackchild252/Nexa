"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const server = read("server/index.js");
const profile = read("src/app/(tabs)/profile.tsx");
const portability = read("server/accountPortability.js");
const privacy = read("server/accountSecurity.js");
const prefs = read("server/notificationPreferences.js");

test("Account Center legal history is authenticated, owner-scoped, bounded, and no-store", () => {
  assert.match(server, /app\.get\("\/api\/legal\/readiness", auth\.authMiddleware/);
  assert.match(server, /WHERE userId=\? ORDER BY acceptedAt DESC LIMIT 20/);
  assert.match(server, /acceptanceHistory/);
  assert.match(server, /Cache-Control", "no-store"/);
});
test("Account Center renders consent history without rewriting required legal acceptance", () => {
  assert.match(profile, /Consent history/);
  assert.match(profile, /withdrawal does not rewrite historical acceptance records/);
  assert.match(server, /app\.post\("\/api\/account\/legal-acceptance", auth\.authMiddleware/);
});
test("Privacy controls reject unknown keys and normalize supported values", () => {
  assert.match(privacy, /function validatePrivacyPatch/);
  assert.match(privacy, /Unknown privacy setting/);
  assert.match(privacy, /function normalizePrivacy/);
});
test("Notification preference changes remain persisted and user-scoped", () => {
  assert.match(server, /app\.get\("\/api\/notifications\/preferences", auth\.authMiddleware/);
  assert.match(server, /app\.patch\("\/api\/notifications\/preferences", auth\.authMiddleware/);
  assert.match(prefs, /function update/);
});
test("Account export is bounded, integrity-protected, and does not export credentials", () => {
  assert.match(portability, /MAX_EXPORT_BYTES/);
  assert.match(portability, /attachBundleIntegrity/);
  assert.match(portability, /exportSafeAccount/);
  assert.doesNotMatch(portability, /SELECT \* FROM users/);
});
test("Account closure requires explicit confirmation and password verification", () => {
  assert.match(server, /app\.delete\("\/api\/account", auth\.authMiddleware/);
  assert.match(server, /req\.body\?\.confirmed !== true/);
  assert.match(server, /auth\.verifyPassword\(req\.user\.id, req\.body\?\.password\)/);
});
test("Profile exposes security history, session revocation, identity verification and location permission controls", () => {
  for (const marker of ["Recent security activity", "Sign out other sessions", "Identity verification", "requestLocationPermission", "Advertising privacy choices", "Close NEXA account"]) assert.ok(profile.includes(marker), marker);
});
test("Account export/import authorization remains owner-bound and closed accounts fail closed", () => {
  assert.match(server, /app\.get\("\/api\/account\/export", auth\.authMiddleware/);
  assert.match(server, /app\.post\("\/api\/account\/import\/validate", auth\.authMiddleware/);
  assert.match(portability, /Closed accounts cannot import data/);
  assert.match(portability, /existing\.userId\) !== String\(userId\)/);
});
