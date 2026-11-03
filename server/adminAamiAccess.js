"use strict";

// Admin AAMI is an umbrella portal, not a company. Grants are therefore bound to
// one of the explicitly supported companies while remaining scoped to product admin-aami.
const crypto = require("node:crypto");

const ENDPOINT_PATH = "/central/v1/admin-aami/privileged-access/events";
const SELF_ACCESS_PATH = "/api/admin-aami/access";
const EXPECTED = Object.freeze({ v: 1, issuer: "aami-central", audience: "admin-aami-privileged-access", productId: "admin-aami" });
const COMPANIES = new Set(["nexa", "lordgistics"]);
const ROLES = new Set(["administrative_director", "general_manager", "group_director"]);
const TYPES = Object.freeze({ "role.granted": "pending_activation", "role.activated": "active", "role.revoked": "revoked", "role.suspended": "suspended", "role.restored": "active" });
const ENVELOPE_KEYS = new Set(["v", "type", "issuer", "audience", "companyId", "productId", "at", "eventId", "correlationId", "seq", "data"]);
const DATA_KEYS = new Set(["applicationId", "targetUserId", "role", "reason"]);
// Only the NEXA Main API is proxied here. LORDGISTICS remains on its own
// authenticated backend and is never rewritten into NEXA handlers.
const NEXA_SCOPED_ROUTE_ALLOWLIST = Object.freeze([
  [/^GET \/api\/admin\/me$/, "summary"],
  [/^GET \/api\/admin\/summary$/, "summary"],
  [/^GET \/api\/admin\/users$/, "users_read"],
  [/^POST \/api\/admin\/users\/[A-Za-z0-9_.:-]{1,128}\/(?:suspend|unsuspend)$/, "users_suspend"],
  [/^GET \/api\/admin\/vendors$/, "vendors_read"],
  [/^POST \/api\/admin\/vendors\/[A-Za-z0-9_.:-]{1,128}\/(?:suspend|unsuspend)$/, "vendors_moderate"],
  [/^GET \/api\/admin\/verification$/, "verification"],
  [/^POST \/api\/admin\/verification\/[A-Za-z0-9_.:-]{1,128}\/decision$/, "verification"],
  [/^GET \/api\/admin\/identity-verification(?:\/policy|\/readiness|\/)?$/, "verification"],
  [/^GET \/api\/admin\/identity-verification\/[A-Za-z0-9_.:-]{1,128}\/audit$/, "verification"],
  [/^GET \/api\/admin\/marketplace\/(?:operations|exceptions)$/, "mall"],
  [/^GET \/api\/admin\/(?:moderation\/reports|violations)$/, "violations"],
  [/^POST \/api\/admin\/moderation\/reports\/[A-Za-z0-9_.:-]{1,128}\/action$/, "violations"],
  [/^POST \/api\/admin\/violations\/[A-Za-z0-9_.:-]{1,128}\/resolve$/, "violations"],
  [/^GET \/api\/admin\/mall\/products$/, "vendors_moderate"],
  [/^POST \/api\/admin\/mall\/products\/[A-Za-z0-9_.:-]{1,128}\/(?:takedown|restore)$/, "vendors_moderate"],
  [/^GET \/api\/admin\/yaayz\/(?:tickets|adverts)$/, "vendors_moderate"],
  [/^POST \/api\/admin\/yaayz\/(?:tickets\/[A-Za-z0-9_.:-]{1,128}\/(?:takedown|restore)|adverts\/[A-Za-z0-9_.:-]{1,128}\/decision)$/, "vendors_moderate"],
  // Owner-approved read-only slice (B538): Administrative Director only (the permission set in adminAccess.js). No writes, no thread/message content.
  [/^GET \/api\/admin\/customer-care$/, "staff_work"],
  [/^GET \/api\/admin\/financial-operations\/(?:summary|exceptions|transactions)$/, "payments"],
  [/^GET \/api\/admin\/financial-operations\/transactions\/[A-Za-z0-9_.:-]{1,128}\/timeline$/, "payments"],
  [/^GET \/api\/admin\/audit$/, "audit"],
]);
// V6.2.6 (+V6.2.8): NEXA routes that live outside /api/admin/ (Mall moderation, Lifestyle reports). The Admin client sends them as
// /api/admin-aami/nexa/x/<path after /api/>; each entry names the REAL path it may reach and the permission it needs.
// Everything not listed here fails closed. The permission is re-checked by the route itself (adminAccess.allowRoute).
const ID = "[A-Za-z0-9_.:-]{1,128}";
const NEXA_SCOPED_EXTERNAL_ALLOWLIST = Object.freeze([
  [/^GET \/api\/mall\/admin\/status$/, "mall"],
  [/^GET \/api\/mall\/admin\/vendor-subscriptions\/launch-offer$/, "mall"],
  [/^GET \/api\/mall\/admin\/reviews$/, "mall"],
  [new RegExp(`^PATCH \\/api\\/mall\\/admin\\/reviews\\/${ID}\\/moderation$`), "mall_reviews_write"],
  [/^GET \/api\/mall\/admin\/review-reports$/, "mall"],
  [new RegExp(`^PATCH \\/api\\/mall\\/admin\\/review-reports\\/${ID}\\/status$`), "mall_reviews_write"],
  [/^GET \/api\/mall\/admin\/disputes$/, "mall_disputes"],
  [new RegExp(`^POST \\/api\\/mall\\/admin\\/disputes\\/${ID}\\/resolve$`), "mall_disputes"],
  [/^GET \/api\/lifestyle\/(?:reports|comment-reports)$/, "violations"],
  [new RegExp(`^DELETE \\/api\\/lifestyle\\/reports\\/${ID}\\/post$`), "social_reports_write"],
  [new RegExp(`^POST \\/api\\/lifestyle\\/(?:reports|comment-reports)\\/${ID}\\/dismiss$`), "social_reports_write"],
  [new RegExp(`^DELETE \\/api\\/lifestyle\\/comment-reports\\/${ID}\\/comment$`), "social_reports_write"],
  // V6.2.8: Administrative Director only (owner-authorized 2026-10-14). The route re-checks the same permission with adminAccess.allowRoute.
  [/^GET \/api\/fitness\/admin\/gyms$/, "fitness_gyms"],
  [new RegExp(`^POST \\/api\\/fitness\\/admin\\/gyms\\/${ID}\\/review$`), "fitness_gyms_write"],
  [/^GET \/api\/leisure\/admin\/operations$/, "leisure_ops"],
  [/^GET \/api\/leisure\/kitchen\/hub\/admin\/(?:applications|audit)$/, "kitchen_hub"],
  [new RegExp(`^POST \\/api\\/leisure\\/kitchen\\/hub\\/admin\\/shops\\/${ID}\\/decision$`), "kitchen_hub_decide"],
  [/^GET \/api\/business\/youtube\/config$/, "creator_content"],
]);
function scopedNexaExternalPermission(method, path) {
  const match = NEXA_SCOPED_EXTERNAL_ALLOWLIST.find(([pattern]) => pattern.test(`${String(method || "GET").toUpperCase()} ${path}`));
  return match?.[1] || null;
}
function scopedNexaPermission(method, path) {
  const match = NEXA_SCOPED_ROUTE_ALLOWLIST.find(([pattern]) => pattern.test(`${String(method || "GET").toUpperCase()} ${path}`));
  return match?.[1] || null;
}

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
    const parsed = JSON.parse(String(env.AAMI_CENTRAL_ADMIN_AAMI_ROLE_GRANT_KEYS || "{}"));
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return Object.create(null);
    const out = Object.create(null);
    for (const [id, secret] of Object.entries(parsed)) if (/^[A-Za-z0-9_-]{1,40}$/.test(id) && typeof secret === "string" && secret.length >= 32) out[id] = secret;
    return out;
  } catch { return Object.create(null); }
}
function json(res, status, body) { return res.status(status).json(body); }
function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_aami_privileged_access (
      applicationId TEXT PRIMARY KEY,
      targetUserId TEXT NOT NULL,
      companyId TEXT NOT NULL CHECK(companyId IN ('nexa','lordgistics')),
      productId TEXT NOT NULL CHECK(productId = 'admin-aami'),
      role TEXT NOT NULL CHECK(role IN ('administrative_director','general_manager','group_director')),
      status TEXT NOT NULL CHECK(status IN ('pending_activation','active','revoked','suspended')),
      activationConfirmed INTEGER NOT NULL DEFAULT 0 CHECK(activationConfirmed IN (0,1)),
      seq INTEGER NOT NULL CHECK(seq > 0), lastEventId TEXT NOT NULL, reason TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_aami_access_user ON admin_aami_privileged_access(targetUserId,companyId,status);
    CREATE TABLE IF NOT EXISTS admin_aami_privileged_access_events (
      eventId TEXT PRIMARY KEY, applicationId TEXT NOT NULL, seq INTEGER NOT NULL,
      eventType TEXT NOT NULL, fingerprint TEXT NOT NULL, receivedAt TEXT NOT NULL
    );
  `);
}
function createAdminAamiAccess({ db, env = process.env, now = () => Date.now() } = {}) {
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
          !COMPANIES.has(envelope.companyId) || envelope.productId !== EXPECTED.productId || !Object.hasOwn(TYPES, envelope.type)) {
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
      const replay = db.prepare("SELECT eventId,applicationId,seq,eventType,fingerprint FROM admin_aami_privileged_access_events WHERE eventId = ?").get(envelope.eventId);
      if (replay) {
        if (replay.applicationId === data.applicationId && replay.seq === envelope.seq && replay.eventType === envelope.type && replay.fingerprint === fingerprint) return json(res, 200, { accepted: true, replayed: true, eventId: envelope.eventId });
        return json(res, 409, { accepted: false, reason: "event_conflict" });
      }
      const user = db.prepare("SELECT id,accountStatus,emailVerifiedAt FROM users WHERE id = ?").get(data.targetUserId);
      if (!user || user.accountStatus !== "active" || typeof user.emailVerifiedAt !== "string" || !user.emailVerifiedAt) return json(res, 409, { accepted: false, reason: "target_identity_unverified" });
      const prior = db.prepare("SELECT * FROM admin_aami_privileged_access WHERE applicationId = ?").get(data.applicationId);
      if (prior && (prior.targetUserId !== data.targetUserId || prior.role !== data.role || prior.companyId !== envelope.companyId)) return json(res, 409, { accepted: false, reason: "target_conflict" });
      if (prior && envelope.seq <= prior.seq) return json(res, 409, { accepted: false, reason: "stale_sequence" });
      if (["role.revoked", "role.suspended"].includes(envelope.type) && (!prior || !["pending_activation", "active"].includes(prior.status))) return json(res, 409, { accepted: false, reason: "grant_not_active" });
      if (envelope.type === "role.activated" && (!prior || prior.status !== "pending_activation")) return json(res, 409, { accepted: false, reason: "activation_not_pending" });
      if (envelope.type === "role.restored" && (!prior || !["revoked", "suspended"].includes(prior.status))) return json(res, 409, { accepted: false, reason: "grant_not_restorable" });
      if (envelope.type === "role.granted" && prior) return json(res, 409, { accepted: false, reason: "grant_exists_use_restore" });

      const at = new Date(now()).toISOString();
      const nextStatus = envelope.type === "role.restored" && prior.activationConfirmed !== 1 ? "pending_activation" : TYPES[envelope.type];
      const activationConfirmed = envelope.type === "role.activated" ? 1 : prior?.activationConfirmed === 1 ? 1 : 0;
      db.transaction(() => {
        db.prepare("INSERT INTO admin_aami_privileged_access_events(eventId,applicationId,seq,eventType,fingerprint,receivedAt) VALUES(?,?,?,?,?,?)").run(envelope.eventId, data.applicationId, envelope.seq, envelope.type, fingerprint, at);
        db.prepare(`INSERT INTO admin_aami_privileged_access(applicationId,targetUserId,companyId,productId,role,status,activationConfirmed,seq,lastEventId,reason,updatedAt)
          VALUES(?,?,?,'admin-aami',?,?,?,?,?,?,?) ON CONFLICT(applicationId) DO UPDATE SET status=excluded.status,activationConfirmed=excluded.activationConfirmed,seq=excluded.seq,lastEventId=excluded.lastEventId,reason=excluded.reason,updatedAt=excluded.updatedAt`)
          .run(data.applicationId, data.targetUserId, envelope.companyId, data.role, nextStatus, activationConfirmed, envelope.seq, envelope.eventId, data.reason, at);
        if (["revoked", "suspended"].includes(nextStatus)) db.prepare("UPDATE sessions SET revokedAt = ?, revocationReason = ? WHERE userId = ? AND revokedAt IS NULL").run(at, `admin_aami_role_${nextStatus}`, data.targetUserId);
      })();
      return json(res, 200, { accepted: true, replayed: false, eventId: envelope.eventId, status: nextStatus, companyId: envelope.companyId, productId: "admin-aami" });
    } catch { return json(res, 503, { accepted: false, reason: "temporarily_unavailable" }); }
  }
  return { handle, keysConfigured: Object.keys(keys).length > 0 };
}
function createAdminAamiRoleGuard({ db, companyId, roles } = {}) {
  const allowedRoles = Array.isArray(roles) ? [...new Set(roles)] : [];
  const validPolicy = COMPANIES.has(companyId) && allowedRoles.length > 0 && allowedRoles.every((role) => ROLES.has(role));
  return function requireAdminAamiRole(req, res, next) {
    if (!validPolicy || !db || typeof db.prepare !== "function") return json(res, 503, { error: "Scoped Admin AAMI policy is unavailable." });
    const userId = req?.user?.id;
    if (typeof userId !== "string" || !userId || userId.length > 128) return json(res, 401, { error: "Authentication required." });
    try {
      const placeholders = allowedRoles.map(() => "?").join(",");
      const grant = db.prepare(`SELECT applicationId,companyId,productId,role FROM admin_aami_privileged_access WHERE targetUserId=? AND companyId=? AND productId='admin-aami' AND status='active' AND activationConfirmed=1 AND role IN (${placeholders}) ORDER BY updatedAt DESC,applicationId ASC LIMIT 1`).get(userId, companyId, ...allowedRoles);
      if (!grant) return json(res, 403, { error: "Active company-scoped Administrative Director access required." });
      req.adminAamiAccess = { applicationId: grant.applicationId, companyId: grant.companyId, productId: grant.productId, role: grant.role };
      return next();
    } catch { return json(res, 503, { error: "Scoped Admin AAMI policy is unavailable." }); }
  };
}
function registerAdminAamiAccess({ app, db, auth, env = process.env, now } = {}) {
  const service = createAdminAamiAccess({ db, env, now });
  app.post(ENDPOINT_PATH, service.handle);
  if (auth?.authMiddleware && typeof app.use === "function") {
    // All company business routes must live under these explicit namespaces. Install
    // fail-closed guards before business routers are registered; a selected company
    // tile or client-supplied company id is never accepted as authorization.
    const roles = ["administrative_director", "general_manager", "group_director"];
    app.use("/api/admin-aami/nexa", auth.authMiddleware, createAdminAamiRoleGuard({ db, companyId: "nexa", roles }));
    app.use("/api/admin-aami/lordgistics", auth.authMiddleware, createAdminAamiRoleGuard({ db, companyId: "lordgistics", roles }));
    // Bridge only an explicit allowlist of NEXA business routes to existing NEXA
    // handlers. The guard has already attached the verified grant before this
    // rewrite runs. Unknown routes and all LORDGISTICS routes fail closed.
    app.use((req, res, next) => {
      const raw = String(req.originalUrl || req.url || "");
      const parsed = new URL(raw, "http://nexa-main.local");
      const prefix = "/api/admin-aami/nexa";
      if (!parsed.pathname.startsWith(`${prefix}/`) && parsed.pathname !== prefix) return next();
      const suffix = parsed.pathname.slice(prefix.length) || "/";
      if (!req.adminAamiAccess || req.adminAamiAccess.companyId !== "nexa" || req.adminAamiAccess.productId !== "admin-aami") return json(res, 403, { error: "Active NEXA company-scoped access required." });
      if (suffix.startsWith("/x/")) {
        const externalPath = `/api/${suffix.slice(3)}`;
        if (/%2f|%5c|\.\./i.test(externalPath) || !scopedNexaExternalPermission(req.method, externalPath)) return json(res, 404, { error: "This NEXA route is not enabled for Admin AAMI." });
        req.url = `${externalPath}${parsed.search}`;
        return next();
      }
      const targetPath = `/api/admin${suffix}`;
      if (!scopedNexaPermission(req.method, targetPath)) return json(res, 404, { error: "This NEXA route is not enabled for Admin AAMI." });
      req.url = `${targetPath}${parsed.search}`;
      return next();
    });
  }
  if (auth?.authMiddleware) app.get(SELF_ACCESS_PATH, auth.authMiddleware, (req, res) => {
    try {
      const grants = db.prepare("SELECT companyId,role,status,activationConfirmed,updatedAt FROM admin_aami_privileged_access WHERE targetUserId=? AND productId='admin-aami' ORDER BY companyId,role").all(req.user.id).map((grant) => ({ companyId: grant.companyId, role: grant.role, status: grant.status, activationConfirmed: grant.activationConfirmed === 1, updatedAt: grant.updatedAt }));
      return res.json({ productId: "admin-aami", userId: req.user.id, name: req.user.name || req.user.username || null, grants });
    } catch { return json(res, 503, { error: "Admin AAMI access status is unavailable." }); }
  });
  return service;
}
module.exports = { ENDPOINT_PATH, SELF_ACCESS_PATH, EXPECTED, COMPANIES, ROLES, TYPES, NEXA_SCOPED_ROUTE_ALLOWLIST, NEXA_SCOPED_EXTERNAL_ALLOWLIST, scopedNexaPermission, scopedNexaExternalPermission, canonicalJson, signEnvelope, configuredKeys, ensureSchema, createAdminAamiAccess, createAdminAamiRoleGuard, registerAdminAamiAccess };
