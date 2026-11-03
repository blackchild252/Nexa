"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync: Database } = require("node:sqlite");
const governance = require("./extensionGovernance");
const security = require("./accountSecurity");
const ops = require("./operationsConsole");
const domains = require("./domainRegistry");
const jobs = require("./jobQueue");

test("extension governance classifies scopes and gates high risk", () => {
  assert.equal(governance.classifyScopes(["profile.read"]), "low");
  assert.equal(governance.governanceDecision({ requestedScopes: ["chat.read"] }).allowed, false);
  assert.equal(governance.governanceDecision({ requestedScopes: ["chat.read"], developerVerified: true }).allowed, true);
  assert.equal(governance.manifestDigest({ b: 2, a: 1 }), governance.manifestDigest({ a: 1, b: 2 }));
});

test("account security recovery tokens expire and privacy normalizes", () => {
  const r = security.createRecoveryToken("u1", 1000);
  assert.equal(security.verifyRecoveryToken(r, r.token, 1000), true);
  assert.equal(security.verifyRecoveryToken(r, "bad", 1000), false);
  assert.equal(security.verifyRecoveryToken(r, r.token, 1000 + security.RECOVERY_TTL_MS), false);
  assert.deepEqual(security.normalizePrivacy({ visibility: "private", discoverable: false }), { visibility: "private", discoverable: false, allowFriendRequests: true, allowInboxRequests: true });
});

test("operations console aggregates only existing tables", () => {
  const db = new Database(":memory:");
  db.exec("CREATE TABLE users(id TEXT); CREATE TABLE mall_orders(id TEXT); CREATE TABLE extensions(id TEXT); CREATE TABLE platform_event_log(id TEXT);");
  db.exec("INSERT INTO users VALUES('u1'),('u2'); INSERT INTO mall_orders VALUES('o1'); INSERT INTO extensions VALUES('e1');");
  assert.deepEqual(ops.summary(db), { users: 2, marketplace: { orders: 1, disputes: 0 }, yaayz: { tickets: 0, pendingOrders: 0 }, kitchen: { orders: 0, pendingOrders: 0 }, trustSafety: { openReports: 0, urgentReports: 0, openAppeals: 0 }, extensions: { registered: 1 }, merchant: { vendors: 0, marketplaceItems: 0, yaayzOrders: 0, kitchenOrders: 0 }, audit: { events: 0, recent: { windowMinutes: 60, info: 0, warning: 0, error: 0, critical: 0 } } });
  db.close();
});

test("domain registry preserves NEXA module boundaries", () => {
  assert.equal(domains.getDomain("intelligence").owner, "Dami / AI");
  assert.equal(domains.getDomain("social").owner, "Zeeza");
  assert.ok(domains.listDomains().length >= 8);
});

test("durable job queue supports claim, completion and retry", () => {
  const raw = new Database(":memory:");
  const db = {
    exec: sql => raw.exec(sql),
    prepare: sql => raw.prepare(sql),
    transaction: fn => () => { raw.exec("BEGIN IMMEDIATE"); try { const out = fn(); raw.exec("COMMIT"); return out; } catch (error) { raw.exec("ROLLBACK"); throw error; } },
  };
  jobs.ensureSchema(db);
  const created = jobs.enqueue(db, { queue: "payments", type: "reconcile", payload: { id: "p1" }, maxAttempts: 2 });
  const claimed = jobs.claim(db, { queue: "payments", workerId: "worker-1" });
  assert.equal(claimed.id, created.id);
  assert.equal(jobs.fail(db, created.id, "temporary"), true);
  const retry = db.prepare("SELECT status,attempts FROM platform_jobs WHERE id=?").get(created.id);
  assert.equal(retry.status, "queued");
  assert.equal(retry.attempts, 1);
  const claimed2 = jobs.claim(db, { queue: "payments", workerId: "worker-2", now: new Date(Date.now() + 100000).toISOString() });
  assert.equal(claimed2.id, created.id);
  assert.equal(jobs.complete(db, created.id), true);
  assert.equal(db.prepare("SELECT status FROM platform_jobs WHERE id=?").get(created.id).status, "completed");
  raw.close();
});
