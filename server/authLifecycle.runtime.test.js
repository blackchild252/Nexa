"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const Module = require("node:module");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");

function makeDb() {
  const raw = new DatabaseSync(":memory:");
  raw.exec(`
    CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL, accountStatus TEXT NOT NULL DEFAULT 'active', passwordHash TEXT NOT NULL, emailVerifiedAt TEXT);
    CREATE TABLE auth_action_tokens (id TEXT PRIMARY KEY, userId TEXT NOT NULL, purpose TEXT NOT NULL, tokenHash TEXT NOT NULL UNIQUE, createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL, consumedAt TEXT, ipHash TEXT, userAgentHash TEXT);
    CREATE TABLE sessions (id INTEGER PRIMARY KEY, userId TEXT NOT NULL, revokedAt TEXT, revocationReason TEXT);
    CREATE TABLE platform_event_log (id TEXT PRIMARY KEY, requestId TEXT NOT NULL, userId TEXT, action TEXT NOT NULL, entityType TEXT NOT NULL, entityId TEXT, metadata TEXT, createdAt TEXT NOT NULL, severity TEXT);
    CREATE TABLE notification_events (id TEXT PRIMARY KEY, userId TEXT NOT NULL, title TEXT, body TEXT, type TEXT, data TEXT, createdAt TEXT, readAt TEXT, dedupeKey TEXT);
    CREATE TABLE auth_login_attempts (id TEXT PRIMARY KEY, emailHash TEXT NOT NULL, ipHash TEXT NOT NULL, userId TEXT, success INTEGER NOT NULL, createdAt TEXT NOT NULL, userAgentHash TEXT NOT NULL);
  `);
  raw.transaction = (fn) => (...args) => {
    raw.exec("BEGIN");
    try { const result = fn(...args); raw.exec("COMMIT"); return result; }
    catch (error) { raw.exec("ROLLBACK"); throw error; }
  };
  return raw;
}

const fakeBcrypt = {
  async hash(value, cost) { return `test-bcrypt$${cost}$${String(value)}`; },
  async compare(value, encoded) { return encoded === `test-bcrypt$12$${String(value)}`; },
};

const authLifecyclePath = path.join(__dirname, "authLifecycle.js");

test("authentication lifecycle runtime: delivery, token expiry/single-use, password changes, revocation and security events", async (t) => {
  const db = makeDb();
  db.prepare("INSERT INTO users(id,email,accountStatus,passwordHash,emailVerifiedAt) VALUES(?,?,?,?,?)")
    .run("u_test", "owner@example.test", "active", "test-bcrypt$12$OldPass123!", null);

  const originalLoad = Module._load;
  const originalFetch = global.fetch;
  const originalEnv = { NODE_ENV: process.env.NODE_ENV, AUTH_EMAIL_WEBHOOK_URL: process.env.AUTH_EMAIL_WEBHOOK_URL, AUTH_EMAIL_WEBHOOK_TOKEN: process.env.AUTH_EMAIL_WEBHOOK_TOKEN };
  const deliveries = [];
  process.env.NODE_ENV = "test";
  process.env.AUTH_EMAIL_WEBHOOK_URL = "https://mail.example.test/send";
  process.env.AUTH_EMAIL_WEBHOOK_TOKEN = "test-only-token";
  global.fetch = async (_url, options) => {
    deliveries.push(JSON.parse(options.body));
    return { ok: true, status: 202 };
  };
  Module._load = function(request, parent, isMain) {
    if (parent?.filename === authLifecyclePath && request === "./db") return db;
    if (parent?.filename === authLifecyclePath && request === "bcryptjs") return fakeBcrypt;
    return originalLoad.call(this, request, parent, isMain);
  };

  let lifecycle;
  try { lifecycle = require(authLifecyclePath); }
  finally { Module._load = originalLoad; }

  t.after(() => {
    global.fetch = originalFetch;
    for (const [key, value] of Object.entries(originalEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    db.close();
    delete require.cache[authLifecyclePath];
  });

  db.prepare("INSERT INTO users(id,email,accountStatus,passwordHash,emailVerifiedAt) VALUES(?,?,?,?,?)")
    .run("u_suspended", "suspended@example.test", "suspended", "test-bcrypt$12$OldPass123!", null);
  db.prepare("INSERT INTO users(id,email,accountStatus,passwordHash,emailVerifiedAt) VALUES(?,?,?,?,?)")
    .run("u_disabled", "disabled@example.test", "disabled", "test-bcrypt$12$OldPass123!", null);
  assert.throws(() => lifecycle.issueToken("u_suspended", "password_reset"), { message: "Account not found." });
  assert.throws(() => lifecycle.issueToken("u_disabled", "verify_email"), { message: "Account not found." });
  assert.deepEqual(await lifecycle.requestLink("suspended@example.test", "password_reset"), { accepted: true, delivered: false });
  assert.deepEqual(await lifecycle.requestLink("disabled@example.test", "verify_email"), { accepted: true, delivered: false });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM auth_action_tokens WHERE userId IN ('u_suspended','u_disabled')").get().n, 0);
  const activeVerification = lifecycle.issueToken("u_test", "verify_email");
  db.prepare("UPDATE users SET accountStatus='suspended' WHERE id=?").run("u_test");
  assert.throws(() => lifecycle.verifyEmail(activeVerification.token), { code: "ACCOUNT_UNAVAILABLE" });
  assert.equal(db.prepare("SELECT emailVerifiedAt FROM users WHERE id=?").get("u_test").emailVerifiedAt, null);
  db.prepare("UPDATE users SET accountStatus='active' WHERE id=?").run("u_test");

  const verification = await lifecycle.requestLink("OWNER@example.test", "verify_email", { ip: "192.0.2.10", userAgent: "test-agent" });
  assert.equal(verification.delivered, true);
  assert.equal(deliveries[0].purpose, "verify_email");
  const verifyToken = new URL(deliveries[0].url).searchParams.get("token");
  assert.ok(verifyToken && verifyToken.length >= 32);
  const verifyHash = crypto.createHash("sha256").update(verifyToken).digest("hex");
  const verifyRow = db.prepare("SELECT * FROM auth_action_tokens WHERE tokenHash=?").get(verifyHash);
  assert.ok(verifyRow);
  assert.notEqual(verifyRow.tokenHash, verifyToken, "raw token must never be stored");
  assert.equal(Date.parse(verifyRow.expiresAt) - Date.parse(verifyRow.createdAt), lifecycle.TOKEN_TTL_MS.verify_email);
  assert.deepEqual(lifecycle.verifyEmail(verifyToken), { ok: true, verified: true });
  assert.ok(db.prepare("SELECT emailVerifiedAt FROM users WHERE id=?").get("u_test").emailVerifiedAt);
  assert.throws(() => lifecycle.verifyEmail(verifyToken), { code: "AUTH_TOKEN_INVALID" });

  const recovery = await lifecycle.requestLink("owner@example.test", "password_reset", { ip: "192.0.2.10", userAgent: "test-agent" });
  assert.equal(recovery.delivered, true);
  const resetToken = new URL(deliveries[1].url).searchParams.get("token");
  const resetHash = crypto.createHash("sha256").update(resetToken).digest("hex");
  const resetRow = db.prepare("SELECT * FROM auth_action_tokens WHERE tokenHash=?").get(resetHash);
  assert.equal(Date.parse(resetRow.expiresAt) - Date.parse(resetRow.createdAt), lifecycle.TOKEN_TTL_MS.password_reset);
  db.prepare("INSERT INTO sessions(userId,revokedAt,revocationReason) VALUES(?,?,?)").run("u_test", null, null);
  const reset = await lifecycle.resetPassword(resetToken, "NewPass123!", { ip: "192.0.2.10", userAgent: "test-agent" });
  assert.equal(reset.sessionsRevoked, true);
  assert.equal(db.prepare("SELECT revokedAt FROM sessions WHERE userId=?").get("u_test").revokedAt !== null, true);
  assert.equal(db.prepare("SELECT revocationReason FROM sessions WHERE userId=?").get("u_test").revocationReason, "password_reset");
  assert.throws(() => lifecycle.verifyEmail(resetToken), { code: "AUTH_TOKEN_INVALID" });
  await assert.rejects(() => lifecycle.resetPassword(resetToken, "AnotherPass123!"), { code: "AUTH_TOKEN_INVALID" });

  const expired = lifecycle.issueToken("u_test", "password_reset");
  db.prepare("UPDATE auth_action_tokens SET expiresAt=? WHERE tokenHash=?").run("2000-01-01T00:00:00.000Z", crypto.createHash("sha256").update(expired.token).digest("hex"));
  await assert.rejects(() => lifecycle.resetPassword(expired.token, "ThirdPass123!"), { code: "AUTH_TOKEN_INVALID" });

  db.prepare("INSERT INTO sessions(userId,revokedAt,revocationReason) VALUES(?,?,?)").run("u_test", null, null);
  const changed = await lifecycle.changePassword("u_test", "NewPass123!", "DifferentPass123!", { ip: "192.0.2.10", userAgent: "test-agent" });
  assert.equal(changed.sessionsRevoked, true);
  assert.equal(changed.signedOut, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sessions WHERE userId=? AND revokedAt IS NULL").get("u_test").n, 0);
  await assert.rejects(() => lifecycle.changePassword("u_test", "DifferentPass123!", "DifferentPass123!"), { code: "PASSWORD_REUSE" });

  for (let i = 0; i < 5; i++) lifecycle.recordLoginAttempt({ email: "owner@example.test", userId: "u_test", success: false, ip: "192.0.2.11", userAgent: "bad-agent" });
  const events = lifecycle.listSecurityEvents("u_test", 100);
  assert.ok(events.some((event) => event.action === "suspicious_login"));
  assert.ok(events.every((event) => !/(email|ip|useragent|token|password|secret|credential)/i.test(JSON.stringify(event.metadata))));
  const securityNotification = db.prepare("SELECT data FROM notification_events WHERE userId=? AND json_extract(data, '$.action')=? ORDER BY createdAt DESC LIMIT 1").get("u_test", "suspicious_login");
  assert.ok(securityNotification && JSON.parse(securityNotification.data).action === "suspicious_login");
});
