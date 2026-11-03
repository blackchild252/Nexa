"use strict";

// Signed, target-side Central role/access-state receiver. It never creates users or writes
// the global Main admin_users table; grants remain explicitly company/product scoped.
const crypto = require("node:crypto");

const ENDPOINT_PATH = "/central/v1/privileged-access/events";
const EXPECTED = Object.freeze({ v: 1, issuer: "aami-central", audience: "nexa-main-privileged-access", companyId: "nexa", productId: "nexa-main" });
const TYPES = Object.freeze({
  // Approval is not activation. A signed grant stays pending until Central confirms
  // that the target product accepted the one-time activation flow.
  "role.granted": "pending_activation",
  "role.activated": "active",
  "role.revoked": "revoked",
  "role.suspended": "suspended",
  "role.restored": "active",
});
const ROLES = new Set(["administrative_director", "general_manager", "group_director"]);
const ENVELOPE_KEYS = new Set(["v", "type", "issuer", "audience", "companyId", "productId", "at", "eventId", "correlationId", "seq", "data"]);
const DATA_KEYS = new Set(["applicationId", "targetUserId", "role", "reason"]);

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function signEnvelope(secret, envelope) { return crypto.createHmac("sha256", secret).update(canonicalJson(envelope)).digest("hex"); }
function safeHexEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  const aa = Buffer.from(a, "hex"), bb = Buffer.from(b, "hex");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function text(value, max) { return typeof value === "string" && value.length > 0 && value.trim() === value && value.length <= max; }
function configuredKeys(env) {
  try {
    const parsed = JSON.parse(String(env.AAMI_CENTRAL_ROLE_GRANT_KEYS || "{}"));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return Object.create(null);
    const out = Object.create(null);
    for (const [id, secret] of Object.entries(parsed)) if (/^[A-Za-z0-9_-]{1,40}$/.test(id) && typeof secret === "string" && secret.length >= 32) out[id] = secret;
    return out;
  } catch { return Object.create(null); }
}
function json(res, status, body) { return res.status(status).json(body); }

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS central_privileged_access (
      applicationId TEXT PRIMARY KEY,
      targetUserId TEXT NOT NULL,
      companyId TEXT NOT NULL CHECK(companyId = 'nexa'),
      productId TEXT NOT NULL CHECK(productId = 'nexa-main'),
      role TEXT NOT NULL CHECK(role IN ('administrative_director','general_manager','group_director')),
      status TEXT NOT NULL CHECK(status IN ('pending_activation','active','revoked','suspended')),
      activationConfirmed INTEGER NOT NULL DEFAULT 0 CHECK(activationConfirmed IN (0,1)),
      seq INTEGER NOT NULL CHECK(seq > 0),
      lastEventId TEXT NOT NULL,
      reason TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_central_privileged_access_user ON central_privileged_access(targetUserId,status);
    CREATE TABLE IF NOT EXISTS central_privileged_access_events (
      eventId TEXT PRIMARY KEY,
      applicationId TEXT NOT NULL,
      seq INTEGER NOT NULL,
      eventType TEXT NOT NULL,
      fingerprint TEXT NOT NULL,
      receivedAt TEXT NOT NULL
    );
  `);
  // Existing installs need the activation flag even though their older status CHECK
  // constraint cannot be widened in-place by SQLite. New installs have the full CHECK;
  // existing installs are rebuilt below only when their SQL lacks pending_activation.
  const columns = db.prepare("PRAGMA table_info(central_privileged_access)").all();
  if (!columns.some((column) => column.name === "activationConfirmed")) {
    db.exec("ALTER TABLE central_privileged_access ADD COLUMN activationConfirmed INTEGER NOT NULL DEFAULT 0 CHECK(activationConfirmed IN (0,1))");
  }
  const tableSql = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='central_privileged_access'").get()?.sql || "";
  if (!tableSql.includes("pending_activation")) {
    db.exec(`
      CREATE TABLE central_privileged_access_v2 (
        applicationId TEXT PRIMARY KEY, targetUserId TEXT NOT NULL,
        companyId TEXT NOT NULL CHECK(companyId = 'nexa'), productId TEXT NOT NULL CHECK(productId = 'nexa-main'),
        role TEXT NOT NULL CHECK(role IN ('administrative_director','general_manager','group_director')),
        status TEXT NOT NULL CHECK(status IN ('pending_activation','active','revoked','suspended')),
        activationConfirmed INTEGER NOT NULL DEFAULT 0 CHECK(activationConfirmed IN (0,1)),
        seq INTEGER NOT NULL CHECK(seq > 0), lastEventId TEXT NOT NULL, reason TEXT NOT NULL, updatedAt TEXT NOT NULL
      );
      INSERT INTO central_privileged_access_v2(applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt)
        SELECT applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt FROM central_privileged_access;
      DROP TABLE central_privileged_access;
      ALTER TABLE central_privileged_access_v2 RENAME TO central_privileged_access;
      CREATE INDEX IF NOT EXISTS idx_central_privileged_access_user ON central_privileged_access(targetUserId,status);
    `);
  }
}

function createCentralPrivilegedAccess({ db, env = process.env, now = () => Date.now() } = {}) {
  if (!db || typeof db.prepare !== "function" || typeof db.exec !== "function") throw new TypeError("A database adapter is required.");
  ensureSchema(db);
  const keys = configuredKeys(env);

  function handle(req, res) {
    try {
      const body = req?.body;
      if (!body || Array.isArray(body) || typeof body !== "object") return json(res, 400, { accepted: false, reason: "bad_request" });
      const { keyId, signature, ...envelope } = body;
      if (!text(keyId, 40) || !/^[A-Za-z0-9_-]{1,40}$/.test(keyId) || !text(signature, 64)) return json(res, 401, { accepted: false, reason: "bad_signature" });
      const secret = keys[keyId];
      if (!secret || !safeHexEqual(signature, signEnvelope(secret, envelope))) return json(res, 401, { accepted: false, reason: "bad_signature" });
      if (Object.keys(envelope).length !== ENVELOPE_KEYS.size || Object.keys(envelope).some((key) => !ENVELOPE_KEYS.has(key)) ||
          envelope.v !== EXPECTED.v || envelope.issuer !== EXPECTED.issuer || envelope.audience !== EXPECTED.audience ||
          envelope.companyId !== EXPECTED.companyId || envelope.productId !== EXPECTED.productId || !Object.hasOwn(TYPES, envelope.type)) {
        return json(res, 403, { accepted: false, reason: "wrong_scope" });
      }
      if (!Number.isSafeInteger(envelope.at) || Math.abs(now() - envelope.at) > 5 * 60 * 1000 ||
          !text(envelope.eventId, 160) || !/^[A-Za-z0-9._:-]{1,160}$/.test(envelope.eventId) ||
          !(envelope.correlationId === null || text(envelope.correlationId, 160)) || !Number.isSafeInteger(envelope.seq) || envelope.seq < 1) {
        return json(res, 400, { accepted: false, reason: "bad_request" });
      }
      const data = envelope.data;
      if (!data || Array.isArray(data) || typeof data !== "object" || Object.keys(data).length !== DATA_KEYS.size || Object.keys(data).some((key) => !DATA_KEYS.has(key)) ||
          !text(data.applicationId, 160) || !/^[A-Za-z0-9._:-]{1,160}$/.test(data.applicationId) ||
          !text(data.targetUserId, 128) || !/^[A-Za-z0-9_.:-]{1,128}$/.test(data.targetUserId) || !ROLES.has(data.role) ||
          !text(data.reason, 500) || data.reason.length < 5) return json(res, 400, { accepted: false, reason: "bad_request" });

      const fingerprint = crypto.createHash("sha256").update(canonicalJson(envelope)).digest("hex");
      const replay = db.prepare("SELECT eventId,applicationId,seq,eventType,fingerprint FROM central_privileged_access_events WHERE eventId = ?").get(envelope.eventId);
      if (replay) {
        if (replay.applicationId === data.applicationId && replay.seq === envelope.seq && replay.eventType === envelope.type && replay.fingerprint === fingerprint) {
          return json(res, 200, { accepted: true, replayed: true, eventId: envelope.eventId });
        }
        return json(res, 409, { accepted: false, reason: "event_conflict" });
      }

      const user = db.prepare("SELECT id,accountStatus,emailVerifiedAt FROM users WHERE id = ?").get(data.targetUserId);
      if (!user || user.accountStatus !== "active" || typeof user.emailVerifiedAt !== "string" || !user.emailVerifiedAt) {
        return json(res, 409, { accepted: false, reason: "target_identity_unverified" });
      }
      const prior = db.prepare("SELECT * FROM central_privileged_access WHERE applicationId = ?").get(data.applicationId);
      if (prior && (prior.targetUserId !== data.targetUserId || prior.role !== data.role)) return json(res, 409, { accepted: false, reason: "target_conflict" });
      if (prior && envelope.seq <= prior.seq) return json(res, 409, { accepted: false, reason: "stale_sequence" });
      if (envelope.type === "role.revoked" && (!prior || !["pending_activation", "active"].includes(prior.status))) return json(res, 409, { accepted: false, reason: "grant_not_active" });
      if (envelope.type === "role.suspended" && (!prior || !["pending_activation", "active"].includes(prior.status))) return json(res, 409, { accepted: false, reason: "grant_not_active" });
      if (envelope.type === "role.activated" && (!prior || prior.status !== "pending_activation")) return json(res, 409, { accepted: false, reason: "activation_not_pending" });
      if (envelope.type === "role.restored" && (!prior || !["revoked", "suspended"].includes(prior.status))) return json(res, 409, { accepted: false, reason: "grant_not_restorable" });
      if (envelope.type === "role.granted" && prior) return json(res, 409, { accepted: false, reason: "grant_exists_use_restore" });

      const at = new Date(now()).toISOString();
      const nextStatus = envelope.type === "role.restored" && prior.activationConfirmed !== 1 ? "pending_activation" : TYPES[envelope.type];
      const activationConfirmed = envelope.type === "role.activated" ? 1 : prior?.activationConfirmed === 1 ? 1 : 0;
      db.transaction(() => {
        db.prepare(`INSERT INTO central_privileged_access_events(eventId,applicationId,seq,eventType,fingerprint,receivedAt) VALUES(?,?,?,?,?,?)`)
          .run(envelope.eventId, data.applicationId, envelope.seq, envelope.type, fingerprint, at);
        db.prepare(`INSERT INTO central_privileged_access(applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt)
          VALUES(?,?,'nexa','nexa-main',?,?,?,?,?,?,?)
          ON CONFLICT(applicationId) DO UPDATE SET status=excluded.status,activationConfirmed=excluded.activationConfirmed,seq=excluded.seq,lastEventId=excluded.lastEventId,reason=excluded.reason,updatedAt=excluded.updatedAt`)
          .run(data.applicationId, data.targetUserId, data.role, nextStatus, activationConfirmed, envelope.seq, envelope.eventId, data.reason, at);
        if (nextStatus !== "active") {
          // The Main session model has no privileged-role session binding; revoke all sessions
          // to ensure a previously authenticated session cannot outlive a Central offboarding event.
          db.prepare("UPDATE sessions SET revokedAt = ?, revocationReason = ? WHERE userId = ? AND revokedAt IS NULL")
            .run(at, `central_role_${nextStatus}`, data.targetUserId);
        }
      })();
      return json(res, 200, { accepted: true, replayed: false, eventId: envelope.eventId, status: nextStatus, companyId: "nexa", productId: "nexa-main" });
    } catch {
      return json(res, 503, { accepted: false, reason: "temporarily_unavailable" });
    }
  }
  return { handle, keysConfigured: Object.keys(keys).length > 0 };
}

// Reusable fail-closed guard for company/product routes that explicitly opt into
// Central-governed roles. It never falls back to Main's global admin_users table.
function createCentralRoleGuard({ db, companyId = "nexa", productId = "nexa-main", roles } = {}) {
  const allowedRoles = Array.isArray(roles) ? [...new Set(roles)] : [];
  const validScope = companyId === "nexa" && productId === "nexa-main";
  const validRoles = allowedRoles.length > 0 && allowedRoles.every((role) => ROLES.has(role));
  return function requireCentralRole(req, res, next) {
    if (!validScope || !validRoles || !db || typeof db.prepare !== "function") {
      return json(res, 503, { error: "Scoped access policy is unavailable." });
    }
    const userId = req?.user?.id;
    if (typeof userId !== "string" || !userId || userId.length > 128) {
      return json(res, 401, { error: "Authentication required." });
    }
    const placeholders = allowedRoles.map(() => "?").join(",");
    let grant;
    try {
      grant = db.prepare(`SELECT applicationId,companyId,productId,role FROM central_privileged_access
        WHERE targetUserId = ? AND companyId = ? AND productId = ? AND status = 'active'
          AND activationConfirmed = 1 AND role IN (${placeholders})
        ORDER BY updatedAt DESC, applicationId ASC LIMIT 1`)
        .get(userId, companyId, productId, ...allowedRoles);
    } catch {
      return json(res, 503, { error: "Scoped access policy is unavailable." });
    }
    if (!grant) return json(res, 403, { error: "Approved company-scoped role required." });
    req.centralPrivilegedAccess = { applicationId: grant.applicationId, companyId: grant.companyId, productId: grant.productId, role: grant.role };
    return next();
  };
}

function registerCentralPrivilegedAccess({ app, db, env = process.env, now } = {}) {
  const service = createCentralPrivilegedAccess({ db, env, now });
  app.post(ENDPOINT_PATH, service.handle);
  return service;
}

module.exports = { ENDPOINT_PATH, EXPECTED, TYPES, canonicalJson, signEnvelope, configuredKeys, ensureSchema, createCentralPrivilegedAccess, createCentralRoleGuard, registerCentralPrivilegedAccess };
