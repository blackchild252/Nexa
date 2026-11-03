"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { ENDPOINT_PATH, SELF_ACCESS_PATH, EXPECTED, signEnvelope, createAdminAamiAccess, createAdminAamiRoleGuard, registerAdminAamiAccess, scopedNexaPermission } = require("./adminAamiAccess");
const NOW = 1_800_000_000_000;
const KEY_ID = "central-admin-aami-v1";
const SECRET = "test-central-admin-aami-role-grant-secret-2026";
function setup() {
  const raw = new DatabaseSync(":memory:");
  const db = { exec: (sql) => raw.exec(sql), prepare: (sql) => raw.prepare(sql), transaction: (fn) => (...args) => { raw.exec("BEGIN"); try { const out = fn(...args); raw.exec("COMMIT"); return out; } catch (e) { raw.exec("ROLLBACK"); throw e; } } };
  db.exec("CREATE TABLE users(id TEXT PRIMARY KEY, accountStatus TEXT, emailVerifiedAt TEXT); CREATE TABLE sessions(userId TEXT,revokedAt TEXT,revocationReason TEXT);");
  db.prepare("INSERT INTO users VALUES(?,?,?)").run("u_verified", "active", "2026-01-01T00:00:00.000Z");
  db.prepare("INSERT INTO users VALUES(?,?,?)").run("u_unverified", "active", null);
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run("u_verified", null, null);
  const env = { AAMI_CENTRAL_ADMIN_AAMI_ROLE_GRANT_KEYS: JSON.stringify({ [KEY_ID]: SECRET }) };
  return { db, raw, env, service: createAdminAamiAccess({ db, env, now: () => NOW }) };
}
function envelope(overrides = {}) { return { ...EXPECTED, type: "role.granted", companyId: "nexa", at: NOW, eventId: "evt-1", correlationId: "corr-1", seq: 1, data: { applicationId: "ADMIN-APP-123", targetUserId: "u_verified", role: "administrative_director", reason: "Approved for Admin AAMI" }, ...overrides }; }
function signed(value, { secret = SECRET, keyId = KEY_ID } = {}) { return { ...value, keyId, signature: signEnvelope(secret, value) }; }
function invoke(service, body) { const res = { statusCode: null, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } }; service.handle({ body }, res); return res; }
function runGuard(guard, user = { id: "u_verified" }) { const req = { user }; const res = { statusCode: null, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } }; let called = false; guard(req, res, () => { called = true; }); return { req, res, called }; }

test("Admin AAMI receiver registers a separate server-to-server endpoint and authenticated self-access endpoint", () => {
  const s = setup(); const routes = [];
  registerAdminAamiAccess({ app: { post: (...args) => routes.push(["post", ...args]), get: (...args) => routes.push(["get", ...args]), use: (...args) => routes.push(["use", ...args]) }, db: s.db, auth: { authMiddleware: (_req, _res, next) => next() }, env: s.env, now: () => NOW });
  assert.equal(ENDPOINT_PATH, "/central/v1/admin-aami/privileged-access/events");
  assert.equal(SELF_ACCESS_PATH, "/api/admin-aami/access");
  assert.equal(routes.length, 5); assert.equal(routes[0][0], "post");
  assert.deepEqual(routes.slice(1, 3).map(route => [route[0], route[1]]), [["use", "/api/admin-aami/nexa"], ["use", "/api/admin-aami/lordgistics"]]);
  assert.equal(routes[3][0], "use", "NEXA scoped-route bridge is registered after the company guards");
  assert.equal(routes[4][0], "get"); assert.equal(s.service.keysConfigured, true);
});
test("bad signatures, stale events, wrong portal/product scope, unsupported company and extra data fail closed", () => {
  const s = setup(); assert.equal(invoke(createAdminAamiAccess({ db: s.db, env: {}, now: () => NOW }), signed(envelope())).statusCode, 401);
  const bad = signed(envelope()); bad.signature = "0".repeat(64); assert.equal(invoke(s.service, bad).statusCode, 401);
  assert.equal(invoke(s.service, signed(envelope({ productId: "nexa-main" }))).body.reason, "wrong_scope");
  assert.equal(invoke(s.service, signed(envelope({ companyId: "aami-central" }))).body.reason, "wrong_scope");
  assert.equal(invoke(s.service, signed(envelope({ audience: "nexa-main-privileged-access" }))).body.reason, "wrong_scope");
  assert.equal(invoke(s.service, signed(envelope({ at: NOW - 300_001 }))).statusCode, 400);
  assert.equal(invoke(s.service, signed(envelope({ data: { ...envelope().data, unexpected: true } }))).statusCode, 400);
});
test("grant requires an existing active verified Main identity and remains pending until separate activation", () => {
  const s = setup();
  assert.equal(invoke(s.service, signed(envelope({ data: { ...envelope().data, targetUserId: "u_unverified" } }))).body.reason, "target_identity_unverified");
  assert.equal(invoke(s.service, signed(envelope())).body.status, "pending_activation");
  const row = s.db.prepare("SELECT targetUserId,companyId,productId,role,status,activationConfirmed FROM admin_aami_privileged_access").get();
  assert.deepEqual({ ...row }, { targetUserId: "u_verified", companyId: "nexa", productId: "admin-aami", role: "administrative_director", status: "pending_activation", activationConfirmed: 0 });
  assert.equal(invoke(s.service, signed(envelope({ type: "role.activated", seq: 2, eventId: "evt-2", data: { ...envelope().data, reason: "Activation confirmed" } }))).body.status, "active");
});
test("NEXA and LORDGISTICS grants remain isolated and event retries are idempotent", () => {
  const s = setup(); const first = signed(envelope()); assert.equal(invoke(s.service, first).statusCode, 200); assert.equal(invoke(s.service, first).body.replayed, true);
  assert.equal(invoke(s.service, signed(envelope({ eventId: "evt-conflict", seq: 1 }))).body.reason, "stale_sequence");
  const lord = signed(envelope({ companyId: "lordgistics", eventId: "evt-lord", data: { ...envelope().data, applicationId: "LORD-APP-123" } }));
  assert.equal(invoke(s.service, lord).body.companyId, "lordgistics");
  assert.equal(s.db.prepare("SELECT count(*) AS n FROM admin_aami_privileged_access WHERE productId='admin-aami'").get().n, 2);
});
test("revoke and suspend require an existing grant, invalidate sessions, and deny guarded access", () => {
  const s = setup(); const guard = createAdminAamiRoleGuard({ db: s.db, companyId: "nexa", roles: ["administrative_director"] });
  assert.equal(runGuard(guard).res.statusCode, 403); assert.equal(runGuard(guard, null).res.statusCode, 401);
  assert.equal(invoke(s.service, signed(envelope({ type: "role.revoked", seq: 2, eventId: "evt-no-grant" }))).body.reason, "grant_not_active");
  invoke(s.service, signed(envelope())); invoke(s.service, signed(envelope({ type: "role.activated", seq: 2, eventId: "evt-active", data: { ...envelope().data, reason: "Activation confirmed" } })));
  assert.equal(runGuard(guard).called, true);
  const revoked = invoke(s.service, signed(envelope({ type: "role.revoked", seq: 3, eventId: "evt-revoke", data: { ...envelope().data, reason: "Access revoked after review" } })));
  assert.equal(revoked.body.status, "revoked"); assert.equal(runGuard(guard).res.statusCode, 403);
  assert.equal(s.db.prepare("SELECT count(*) AS n FROM sessions WHERE userId='u_verified' AND revokedAt IS NULL").get().n, 0);
});

test("company workspace middleware denies cross-company grants and requires activation before any scoped route", () => {
  const s = setup();
  const nexa = createAdminAamiRoleGuard({ db: s.db, companyId: "nexa", roles: ["administrative_director"] });
  const lord = createAdminAamiRoleGuard({ db: s.db, companyId: "lordgistics", roles: ["administrative_director"] });
  const grantNexa = signed(envelope());
  assert.equal(invoke(s.service, grantNexa).body.status, "pending_activation");
  assert.equal(runGuard(nexa).res.statusCode, 403, "pending grant is not sufficient");
  invoke(s.service, signed(envelope({ type: "role.activated", seq: 2, eventId: "evt-nexa-active", data: { ...envelope().data, reason: "Activation confirmed" } })));
  assert.equal(runGuard(nexa).called, true);
  assert.equal(runGuard(lord).res.statusCode, 403, "NEXA grant cannot authorize LORDGISTICS");
  const lordEnvelope = envelope({ companyId: "lordgistics", eventId: "evt-lord-grant", data: { ...envelope().data, applicationId: "LORD-APP-123" } });
  invoke(s.service, signed(lordEnvelope));
  invoke(s.service, signed({ ...lordEnvelope, type: "role.activated", seq: 2, eventId: "evt-lord-active", data: { ...lordEnvelope.data, reason: "Activation confirmed" } }));
  assert.equal(runGuard(lord).called, true);
  assert.equal(runGuard(nexa).called, true, "separate active grant remains valid for NEXA");
});

test("guard cannot be retargeted to the Admin AAMI umbrella or another product, and requires allowlisted roles", () => {
  const s = setup();
  assert.equal(runGuard(createAdminAamiRoleGuard({ db: s.db, companyId: "admin-aami", roles: ["administrative_director"] })).res.statusCode, 503);
  assert.equal(runGuard(createAdminAamiRoleGuard({ db: s.db, companyId: "nexa", roles: ["super_admin"] })).res.statusCode, 503);
});
test("Main wires the separate Admin AAMI receiver after JSON parsing and never grants through global admin_users", () => {
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  assert.ok(source.indexOf("app.use(express.json(") < source.indexOf("registerAdminAamiAccess({ app, db, auth, env: process.env });"));
  assert.match(source, /registerAdminAamiAccess/);
  const moduleSource = fs.readFileSync(path.join(__dirname, "adminAamiAccess.js"), "utf8");
  assert.doesNotMatch(moduleSource, /INSERT INTO users|INSERT INTO admin_users/);
});


test("NEXA scoped route bridge allows only explicitly approved business handlers", () => {
  assert.equal(scopedNexaPermission("GET", "/api/admin/me"), "summary");
  assert.equal(scopedNexaPermission("GET", "/api/admin/vendors"), "vendors_read");
  assert.equal(scopedNexaPermission("POST", "/api/admin/vendors/v1/suspend"), "vendors_moderate");
  assert.equal(scopedNexaPermission("GET", "/api/admin/admins"), null, "owner/admin management is never bridged");
  assert.equal(scopedNexaPermission("DELETE", "/api/admin/users/u1"), null, "destructive user removal is never bridged");
  assert.equal(scopedNexaPermission("GET", "/api/admin/operations/diagnostics"), null, "platform operations are never bridged");
  // B538 read-only slice
  assert.equal(scopedNexaPermission("GET", "/api/admin/customer-care"), "staff_work");
  assert.equal(scopedNexaPermission("GET", "/api/admin/financial-operations/summary"), "payments");
  assert.equal(scopedNexaPermission("GET", "/api/admin/financial-operations/transactions/t1/timeline"), "payments");
  assert.equal(scopedNexaPermission("GET", "/api/admin/audit"), "audit");
  for (const [m, p] of [["POST", "/api/admin/financial-operations/reconcile"], ["POST", "/api/admin/financial-operations/exceptions/e1/assign"], ["POST", "/api/admin/financial-operations/exceptions/e1/review"], ["GET", "/api/admin/financial-operations/assignees"], ["POST", "/api/admin/customer-care/threads/t1/assign"], ["POST", "/api/admin/customer-care/threads/t1/escalate"], ["GET", "/api/admin/customer-care/threads/t1"], ["GET", "/api/admin/customer-care/my"], ["POST", "/api/admin/customer-care/threads/t1/messages"], ["GET", "/api/admin/security/audit"], ["POST", "/api/admin/audit"], ["DELETE", "/api/admin/audit"]])
    assert.equal(scopedNexaPermission(m, p), null, `${m} ${p} must stay unbridged`);
});

test("registered NEXA bridge rewrites only allowlisted requests after a live grant is verified", () => {
  const s = setup();
  invoke(s.service, signed(envelope()));
  invoke(s.service, signed(envelope({ type: "role.activated", seq: 2, eventId: "evt-bridge-active", data: { ...envelope().data, reason: "Activation confirmed" } })));
  const routes = [];
  registerAdminAamiAccess({ app: { post: (...a) => routes.push(["post", ...a]), get: (...a) => routes.push(["get", ...a]), use: (...a) => routes.push(["use", ...a]) }, db: s.db, auth: { authMiddleware: (_req, _res, next) => next() }, env: s.env, now: () => NOW });
  const guard = routes.find(r => r[0] === "use" && r[1] === "/api/admin-aami/nexa")[3];
  const bridge = routes.find(r => r[0] === "use" && typeof r[1] === "function")[1];
  const req = { user: { id: "u_verified" }, method: "GET", originalUrl: "/api/admin-aami/nexa/users?limit=10", url: "/api/admin-aami/nexa/users?limit=10" };
  const res = { statusCode: 200, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
  let passed = false; guard(req, res, () => { passed = true; });
  assert.equal(passed, true); assert.equal(req.adminAamiAccess.companyId, "nexa");
  bridge(req, res, () => { passed = true; });
  assert.equal(req.url, "/api/admin/users?limit=10");
  const forbidden = { ...req, originalUrl: "/api/admin-aami/nexa/admins", url: "/api/admin-aami/nexa/admins" };
  const denied = { statusCode: 200, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
  bridge(forbidden, denied, () => { throw new Error("disallowed route must not pass"); });
  assert.equal(denied.statusCode, 404);
});
