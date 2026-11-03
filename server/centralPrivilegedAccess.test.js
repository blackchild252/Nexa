"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { ENDPOINT_PATH, EXPECTED, signEnvelope, createCentralPrivilegedAccess, createCentralRoleGuard, registerCentralPrivilegedAccess } = require("./centralPrivilegedAccess");

const NOW = 1_800_000_000_000;
const KEY_ID = "central-main-access-v1";
const SECRET = "test-central-main-privileged-access-secret-2026";
function setup() {
  const raw = new DatabaseSync(":memory:");
  const db = { exec: (sql) => raw.exec(sql), prepare: (sql) => raw.prepare(sql), transaction: (fn) => (...args) => { raw.exec("BEGIN"); try { const out = fn(...args); raw.exec("COMMIT"); return out; } catch (e) { raw.exec("ROLLBACK"); throw e; } } };
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY, accountStatus TEXT, emailVerifiedAt TEXT); CREATE TABLE sessions(userId TEXT,revokedAt TEXT,revocationReason TEXT);`);
  db.prepare("INSERT INTO users VALUES(?,?,?)").run("u_verified", "active", "2026-01-01T00:00:00.000Z");
  db.prepare("INSERT INTO users VALUES(?,?,?)").run("u_unverified", "active", null);
  db.prepare("INSERT INTO users VALUES(?,?,?)").run("u_suspended", "suspended", "2026-01-01T00:00:00.000Z");
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run("u_verified", null, null);
  const env = { AAMI_CENTRAL_ROLE_GRANT_KEYS: JSON.stringify({ [KEY_ID]: SECRET }) };
  return { db, raw, service: createCentralPrivilegedAccess({ db, env, now: () => NOW }) };
}
function envelope(overrides = {}) { return { ...EXPECTED, type: "role.granted", at: NOW, eventId: "event-1", correlationId: "corr-1", seq: 1, data: { applicationId: "APP-12345678", targetUserId: "u_verified", role: "administrative_director", reason: "Approved and activated" }, ...overrides }; }
function signed(value, { secret = SECRET, keyId = KEY_ID } = {}) { return { ...value, keyId, signature: signEnvelope(secret, value) }; }
function invoke(service, body) { const res = { statusCode: null, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } }; service.handle({ body }, res); return res; }

test("signed Central receiver registers POST only and keeps Main company/product scope fixed", () => {
  const s = setup(); const routes = [];
  registerCentralPrivilegedAccess({ app: { post: (...a) => routes.push(a) }, db: s.db, env: { AAMI_CENTRAL_ROLE_GRANT_KEYS: JSON.stringify({ [KEY_ID]: SECRET }) }, now: () => NOW });
  assert.equal(ENDPOINT_PATH, "/central/v1/privileged-access/events"); assert.equal(routes.length, 1); assert.equal(routes[0][0], ENDPOINT_PATH);
  assert.equal(s.service.keysConfigured, true);
});
test("missing keys, bad signature, stale timestamp, wrong product/company and extra fields fail closed", () => {
  const s = setup(); const noKeys = createCentralPrivilegedAccess({ db: s.db, env: {}, now: () => NOW });
  assert.equal(invoke(noKeys, signed(envelope())).statusCode, 401);
  const bad = signed(envelope()); bad.signature = "0".repeat(64); assert.equal(invoke(s.service, bad).statusCode, 401);
  assert.equal(invoke(s.service, signed(envelope({ productId: "lordgistics" }))).statusCode, 403);
  assert.equal(invoke(s.service, signed(envelope({ companyId: "admin-aami" }))).statusCode, 403);
  assert.equal(invoke(s.service, signed(envelope({ at: NOW - 300_001 }))).statusCode, 400);
  assert.equal(invoke(s.service, signed(envelope({ data: { ...envelope().data, injected: true } }))).statusCode, 400);
});
test("only existing active email-verified Main identities can receive a scoped grant", () => {
  const s = setup();
  assert.equal(invoke(s.service, signed(envelope({ data: { ...envelope().data, targetUserId: "u_unverified" } }))).body.reason, "target_identity_unverified");
  assert.equal(invoke(s.service, signed(envelope({ data: { ...envelope().data, targetUserId: "u_suspended" } }))).body.reason, "target_identity_unverified");
  const result = invoke(s.service, signed(envelope()));
  assert.equal(result.statusCode, 200); assert.equal(result.body.status, "pending_activation");
  assert.deepEqual({ ...s.db.prepare("SELECT targetUserId,companyId,productId,role,status,seq FROM central_privileged_access").get() }, { targetUserId: "u_verified", companyId: "nexa", productId: "nexa-main", role: "administrative_director", status: "pending_activation", seq: 1 });
  const activate = invoke(s.service, signed(envelope({ type: "role.activated", seq: 2, eventId: "event-activated", data: { ...envelope().data, reason: "Target activation confirmed" } })));
  assert.equal(activate.statusCode, 200); assert.equal(activate.body.status, "active");
  assert.equal(s.db.prepare("SELECT count(*) AS n FROM sqlite_master WHERE type='table' AND name='admin_users'").get().n, 0, "receiver must not create or touch Main's global admin_users table");
});
test("event retries are idempotent; conflicting reuse and stale sequence are refused", () => {
  const s = setup(); const first = signed(envelope());
  assert.equal(invoke(s.service, first).statusCode, 200);
  assert.equal(invoke(s.service, first).body.replayed, true);
  assert.equal(invoke(s.service, signed(envelope({ data: { ...envelope().data, reason: "Different approved reason" } }))).statusCode, 409);
  assert.equal(invoke(s.service, signed(envelope({ eventId: "event-2", seq: 1 }))).body.reason, "stale_sequence");
});
test("revocation and suspension require an active grant, advance sequence, and revoke live sessions", () => {
  const s = setup();
  assert.equal(invoke(s.service, signed(envelope({ type: "role.revoked", seq: 2, eventId: "event-before-grant" }))).body.reason, "grant_not_active");
  assert.equal(invoke(s.service, signed(envelope())).statusCode, 200);
  assert.equal(invoke(s.service, signed(envelope({ type: "role.activated", seq: 2, eventId: "event-activated", data: { ...envelope().data, reason: "Target activation confirmed" } }))).statusCode, 200);
  s.db.prepare("INSERT INTO sessions VALUES(?,?,?)").run("u_verified", null, null);
  const revoked = invoke(s.service, signed(envelope({ type: "role.revoked", seq: 3, eventId: "event-3", data: { ...envelope().data, reason: "Access revoked by Central" } })));
  assert.equal(revoked.statusCode, 200); assert.equal(revoked.body.status, "revoked");
  assert.equal(s.db.prepare("SELECT count(*) AS n FROM sessions WHERE userId='u_verified' AND revokedAt IS NULL").get().n, 0, "all active sessions are revoked");
  assert.equal(s.db.prepare("SELECT count(*) AS n FROM sessions WHERE userId='u_verified' AND revocationReason='central_role_revoked'").get().n, 1, "revocation event invalidates the currently active session");
  assert.equal(invoke(s.service, signed(envelope({ type: "role.granted", seq: 4, eventId: "event-4" }))).body.reason, "grant_exists_use_restore");
  assert.equal(invoke(s.service, signed(envelope({ type: "role.restored", seq: 4, eventId: "event-5", data: { ...envelope().data, reason: "Access restored after review" } }))).body.status, "active");
});
test("company-scoped guard denies pending, revoked, wrong-scope and unapproved roles", () => {
  const s = setup();
  const guard = createCentralRoleGuard({ db: s.db, roles: ["administrative_director"] });
  const run = (middleware, user = { id: "u_verified" }) => {
    const req = { user }; const res = { statusCode: null, body: null, status(n) { this.statusCode = n; return this; }, json(v) { this.body = v; return this; } };
    let called = false; middleware(req, res, () => { called = true; }); return { req, res, called };
  };
  assert.equal(run(guard).res.statusCode, 403, "pending grant must not authorize access");
  assert.equal(run(guard, null).res.statusCode, 401, "missing identity must be denied");
  assert.equal(run(createCentralRoleGuard({ db: s.db, companyId: "lordgistics", productId: "lordgistics", roles: ["administrative_director"] })).res.statusCode, 503, "Main guard cannot be retargeted to another product");
  assert.equal(invoke(s.service, signed(envelope())).body.status, "pending_activation");
  assert.equal(invoke(s.service, signed(envelope({ type: "role.activated", seq: 2, eventId: "event-activated", data: { ...envelope().data, reason: "Target activation confirmed" } }))).body.status, "active");
  const accepted = run(guard); assert.equal(accepted.called, true); assert.equal(accepted.req.centralPrivilegedAccess.role, "administrative_director");
  assert.equal(invoke(s.service, signed(envelope({ type: "role.suspended", seq: 3, eventId: "event-suspended", data: { ...envelope().data, reason: "Suspended after review" } }))).body.status, "suspended");
  assert.equal(run(guard).res.statusCode, 403, "suspension must immediately deny subsequent guarded requests");
});
test("Main server wires the receiver after JSON parsing and the module has no account-creation path", () => {
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  assert.ok(source.indexOf("app.use(express.json(") < source.indexOf("registerCentralPrivilegedAccess({ app, db, env: process.env });"));
  const moduleSource = fs.readFileSync(path.join(__dirname, "centralPrivilegedAccess.js"), "utf8");
  assert.match(source, /registerCentralPrivilegedAccess/); assert.doesNotMatch(moduleSource, /INSERT INTO users|INSERT INTO admin_users/);
});
