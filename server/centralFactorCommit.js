"use strict";

// AAMI Central activation, second factor commit, Main side.
// After an Administrative Director activates, Central tells Main (server to server) which second factor was enrolled.
// Main records it for that user only when an ACTIVE, activation-confirmed Admin AAMI grant for the same application, user and company already exists.
// Central never sends a proof or a code here. Answers are always HTTP 200 with fixed reason codes (Central treats any other status as a transport failure).
const crypto = require("crypto");
const { canonicalJson, signEnvelope } = require("./centralActivationCodeDelivery");
const { ensureSchema: ensureAdminAamiGrantSchema, COMPANIES } = require("./adminAamiAccess");

const ENDPOINT_PATH = "/zeeza/v1/central/commit-factor";
const EXPECTED = Object.freeze({ v: 1, type: "factor.commit", issuer: "aami-central", audience: "nexa-main-zeeza" });
const ENVELOPE_KEYS = Object.freeze(["v", "type", "eventId", "issuer", "audience", "at", "correlationId", "data"]);
const DATA_KEYS = Object.freeze(["applicationId", "targetUserId", "companyId", "factor"]);
const FACTORS = Object.freeze(["zeeza_2fa", "email_2fa"]);
const ID_160 = /^[A-Za-z0-9._:-]{1,160}$/;
const ID_128 = /^[A-Za-z0-9_.:-]{1,128}$/;

const safeHexEqual = (a, b) => typeof a === "string" && typeof b === "string" && /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) && crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
const text = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;

// Its own key set, separate from the verify keys and the role-grant keys: one leaked key cannot do two jobs.
function configuredKeys(env) {
  const raw = String(env.NEXA_CENTRAL_ZEEZA_COMMIT_KEYS || "").trim();
  const result = Object.create(null);
  if (!raw) return result;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return result;
    for (const [keyId, secret] of Object.entries(parsed)) if (/^[A-Za-z0-9_-]{1,40}$/.test(keyId) && typeof secret === "string" && secret.length >= 16) result[keyId] = secret;
  } catch { /* fail closed */ }
  return result;
}

function ensureSchema(db) {
  ensureAdminAamiGrantSchema(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS central_second_factor_commits (
      applicationId TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      companyId TEXT NOT NULL,
      factor TEXT NOT NULL CHECK(factor IN ('zeeza_2fa','email_2fa')),
      eventId TEXT NOT NULL UNIQUE,
      fingerprint TEXT NOT NULL,
      committedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_central_second_factor_commits_user ON central_second_factor_commits(userId);
  `);
}

function createCentralFactorCommit({ db, env = process.env, now = () => Date.now() }) {
  if (!db || typeof db.prepare !== "function" || typeof db.exec !== "function") throw new TypeError("A database adapter is required.");
  ensureSchema(db);
  const keys = configuredKeys(env);
  const no = (res, reason) => res.status(200).json({ committed: false, reason });

  function handle(req, res) {
    try {
      const body = req?.body;
      if (!body || Array.isArray(body) || typeof body !== "object") return no(res, "bad_request");
      const { keyId, signature, ...envelope } = body;
      const secret = text(keyId, 40) ? keys[keyId] : null;
      if (!secret || !text(signature, 64) || !safeHexEqual(signature, signEnvelope(secret, envelope))) return no(res, "bad_signature");
      if (Object.keys(envelope).length !== ENVELOPE_KEYS.length || Object.keys(envelope).some((k) => !ENVELOPE_KEYS.includes(k))) return no(res, "bad_request");
      if (envelope.v !== EXPECTED.v || envelope.type !== EXPECTED.type || envelope.issuer !== EXPECTED.issuer || envelope.audience !== EXPECTED.audience) return no(res, "wrong_scope");
      if (!Number.isFinite(envelope.at) || Math.abs(now() - envelope.at) > 5 * 60 * 1000) return no(res, "stale_event");
      if (!text(envelope.eventId, 160) || !ID_160.test(envelope.eventId) || !(envelope.correlationId === null || text(envelope.correlationId, 160))) return no(res, "bad_request");
      const data = envelope.data;
      if (!data || Array.isArray(data) || typeof data !== "object" || Object.keys(data).length !== DATA_KEYS.length || Object.keys(data).some((k) => !DATA_KEYS.includes(k))) return no(res, "bad_request");
      if (!text(data.applicationId, 160) || !ID_160.test(data.applicationId) || !text(data.targetUserId, 128) || !ID_128.test(data.targetUserId) || !COMPANIES.has(data.companyId) || !FACTORS.includes(data.factor)) return no(res, "bad_request");

      const fingerprint = crypto.createHash("sha256").update(canonicalJson({ type: envelope.type, eventId: envelope.eventId, data })).digest("hex");
      const prior = db.prepare("SELECT userId, companyId, factor, eventId, fingerprint FROM central_second_factor_commits WHERE applicationId = ?").get(data.applicationId);
      if (prior) {
        if (prior.eventId === envelope.eventId && prior.fingerprint === fingerprint) return res.status(200).json({ committed: true, replayed: true, eventId: envelope.eventId });
        return no(res, prior.userId !== data.targetUserId || prior.companyId !== data.companyId ? "target_conflict" : "factor_conflict");
      }
      const taken = db.prepare("SELECT applicationId FROM central_second_factor_commits WHERE eventId = ?").get(envelope.eventId);
      if (taken) return no(res, "event_conflict");

      const user = db.prepare("SELECT id, accountStatus FROM users WHERE id = ?").get(data.targetUserId);
      if (!user || (user.accountStatus && user.accountStatus !== "active")) return no(res, "target_identity_unverified");
      // The grant must already be active and confirmed (Central sends role.activated first), for exactly this application, user and company.
      const grant = db.prepare("SELECT applicationId FROM admin_aami_privileged_access WHERE applicationId = ? AND targetUserId = ? AND companyId = ? AND productId = 'admin-aami' AND status = 'active' AND activationConfirmed = 1").get(data.applicationId, data.targetUserId, data.companyId);
      if (!grant) return no(res, "activation_not_confirmed");

      db.prepare("INSERT INTO central_second_factor_commits (applicationId,userId,companyId,factor,eventId,fingerprint,committedAt) VALUES (?,?,?,?,?,?,?)")
        .run(data.applicationId, data.targetUserId, data.companyId, data.factor, envelope.eventId, fingerprint, new Date(now()).toISOString());
      return res.status(200).json({ committed: true, replayed: false, eventId: envelope.eventId });
    } catch {
      return res.status(500).json({ error: "Factor commit temporarily unavailable." }); // nothing from the request is logged or returned
    }
  }

  // Read side for later sign-in work: the committed factor for a user in one company, or null.
  function committedFactor(userId, companyId) {
    if (typeof userId !== "string" || !ID_128.test(userId) || !COMPANIES.has(companyId)) return null;
    const row = db.prepare("SELECT factor FROM central_second_factor_commits WHERE userId = ? AND companyId = ? ORDER BY committedAt DESC LIMIT 1").get(userId, companyId);
    return row ? row.factor : null;
  }
  return { handle, committedFactor, keysConfigured: Object.keys(keys).length > 0 };
}

function registerCentralFactorCommit({ app, db, env = process.env, now } = {}) {
  const service = createCentralFactorCommit({ db, env, now });
  app.post(ENDPOINT_PATH, service.handle);
  return service;
}

module.exports = { ENDPOINT_PATH, EXPECTED, FACTORS, configuredKeys, ensureSchema, createCentralFactorCommit, registerCentralFactorCommit };
