"use strict";

// AAMI Central activation, second factor, Main side.
//  1. The applicant (signed in to Main, with a pending Admin AAMI grant) asks for a code: it lands in their own Zeeza secure inbox.
//  2. They type that 6-digit code into the activation screen; Central asks Main (server to server) whether it is right.
// No code is ever returned by an API. Main answers Central with { verified } only.
const crypto = require("crypto");
const { canonicalJson, signEnvelope, ensureSchema: ensureInboxSchema } = require("./centralActivationCodeDelivery");
const { ensureSchema: ensureAdminAamiGrantSchema } = require("./adminAamiAccess");

const ENDPOINT_PATH = "/zeeza/v1/central/verify-factor";
const CHALLENGE_PATH = "/api/zeeza/central-activation/challenge";
const EXPECTED = Object.freeze({ v: 1, type: "factor.verify", issuer: "aami-central", audience: "nexa-main-zeeza" });
const DATA_KEYS = Object.freeze(["userId", "factor", "proof"]);
const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const COOLDOWN_MS = 60 * 1000;
const WINDOW_MS = 60 * 60 * 1000;
const MAX_ISSUES_PER_WINDOW = 5;
const EVENT_PREFIX = "central-activation-verify:";

const fail = (status, code, message) => Object.assign(new Error(message), { status, code });
const codeHash = (userId, code) => crypto.createHash("sha256").update(`central-activation:${userId}:${code}`).digest("hex");
const safeHexEqual = (a, b) => typeof a === "string" && typeof b === "string" && /^[a-f0-9]{64}$/.test(a) && /^[a-f0-9]{64}$/.test(b) && crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
const text = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;

// Its own key set, separate from activation-code delivery: one leaked key cannot do both jobs.
function configuredKeys(env) {
  const raw = String(env.NEXA_CENTRAL_ZEEZA_VERIFY_KEYS || "").trim();
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
  ensureInboxSchema(db);
  ensureAdminAamiGrantSchema(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS central_activation_challenges (
      userId TEXT PRIMARY KEY,
      applicationId TEXT NOT NULL,
      codeHash TEXT NOT NULL,
      attempts INTEGER NOT NULL DEFAULT 0,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      windowStart TEXT NOT NULL,
      issuedInWindow INTEGER NOT NULL DEFAULT 1
    );
  `);
}

function createCentralFactorVerify({ db, env = process.env, now = () => Date.now(), randomCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, "0"), genId = () => crypto.randomUUID() }) {
  ensureSchema(db);
  const keys = configuredKeys(env);
  const iso = (ms = now()) => new Date(ms).toISOString();

  // Only the person named in a pending Admin AAMI grant may ask for a code, and only for themselves.
  function issueChallenge(userId) {
    const grant = db.prepare("SELECT applicationId FROM admin_aami_privileged_access WHERE targetUserId = ? AND productId = 'admin-aami' AND status = 'pending_activation' ORDER BY updatedAt DESC LIMIT 1").get(userId);
    if (!grant) throw fail(403, "ACTIVATION_NOT_PENDING", "There is no pending activation for this account.");
    const t = now(); const prior = db.prepare("SELECT createdAt, windowStart, issuedInWindow FROM central_activation_challenges WHERE userId = ?").get(userId);
    let windowStart = iso(t), issued = 1;
    if (prior) {
      if (t - Date.parse(prior.createdAt) < COOLDOWN_MS) throw fail(429, "CODE_COOLDOWN", "Wait a minute before asking for another code.");
      if (t - Date.parse(prior.windowStart) < WINDOW_MS) {
        if (prior.issuedInWindow >= MAX_ISSUES_PER_WINDOW) throw fail(429, "CODE_LIMIT", "Too many codes requested. Try again later.");
        windowStart = prior.windowStart; issued = prior.issuedInWindow + 1;
      }
    }
    const code = randomCode(); const expiresAt = iso(t + CODE_TTL_MS);
    const message = `Your AAMI Central activation verification code is ${code}. It works once and expires in 5 minutes. Enter it in AAMI Admin. Nobody from NEXA will ever ask you for it.`;
    db.transaction(() => {
      db.prepare("DELETE FROM zeeza_central_secure_inbox WHERE userId = ? AND eventId LIKE ?").run(userId, `${EVENT_PREFIX}%`);   // an older code stops showing and stops working
      db.prepare("INSERT OR REPLACE INTO central_activation_challenges (userId,applicationId,codeHash,attempts,expiresAt,createdAt,windowStart,issuedInWindow) VALUES (?,?,?,0,?,?,?,?)")
        .run(userId, grant.applicationId, codeHash(userId, code), expiresAt, iso(t), windowStart, issued);
      db.prepare("INSERT INTO zeeza_central_secure_inbox (id,eventId,userId,applicationId,category,preview,message,expiresAt,createdAt) VALUES (?,?,?,?,'local','AAMI Central verification code',?,?,?)")
        .run(genId(), `${EVENT_PREFIX}${genId()}`, userId, grant.applicationId, message, expiresAt, iso(t));
    })();
    return { issued: true, expiresInSeconds: CODE_TTL_MS / 1000, delivery: "local_secure_inbox" };
  }

  // One live code per person, five wrong tries, single use. A wrong try is counted before anything else is decided.
  function verifyCode(userId, proof) {
    const row = db.prepare("SELECT codeHash, attempts, expiresAt FROM central_activation_challenges WHERE userId = ?").get(userId);
    if (!row || row.attempts >= MAX_ATTEMPTS || Date.parse(row.expiresAt) <= now()) return false;
    if (!/^\d{6}$/.test(proof)) { db.prepare("UPDATE central_activation_challenges SET attempts = attempts + 1 WHERE userId = ?").run(userId); return false; }
    if (!safeHexEqual(codeHash(userId, proof), row.codeHash)) { db.prepare("UPDATE central_activation_challenges SET attempts = attempts + 1 WHERE userId = ?").run(userId); return false; }
    const gone = db.transaction(() => {
      const r = db.prepare("DELETE FROM central_activation_challenges WHERE userId = ? AND codeHash = ? AND attempts < ?").run(userId, row.codeHash, MAX_ATTEMPTS).changes;
      db.prepare("DELETE FROM zeeza_central_secure_inbox WHERE userId = ? AND eventId LIKE ?").run(userId, `${EVENT_PREFIX}%`);
      return r;
    })();
    return gone === 1;
  }

  const no = (res) => res.status(200).json({ verified: false });
  function handle(req, res) {
    try {
      const body = req?.body;
      if (!body || Array.isArray(body) || typeof body !== "object") return no(res);
      const { keyId, signature, ...envelope } = body;
      const secret = text(keyId, 40) ? keys[keyId] : null;
      if (!secret || !text(signature, 64) || !safeHexEqual(signature, signEnvelope(secret, envelope))) return no(res);
      if (envelope.v !== EXPECTED.v || envelope.type !== EXPECTED.type || envelope.issuer !== EXPECTED.issuer || envelope.audience !== EXPECTED.audience) return no(res);
      if (!Number.isFinite(envelope.at) || Math.abs(now() - envelope.at) > 5 * 60 * 1000) return no(res);
      const data = envelope.data;
      if (!data || Array.isArray(data) || typeof data !== "object" || Object.keys(data).length !== DATA_KEYS.length || Object.keys(data).some((k) => !DATA_KEYS.includes(k))) return no(res);
      if (!text(data.userId, 160) || data.factor !== "zeeza_2fa" || !text(data.proof, 100)) return no(res);
      const user = db.prepare("SELECT id, email, username, accountStatus FROM users WHERE id = ?").get(data.userId);
      if (!user || (user.accountStatus && user.accountStatus !== "active")) return no(res);
      return res.status(200).json({ verified: verifyCode(user.id, data.proof) });
    } catch {
      return res.status(500).json({ error: "Factor verification temporarily unavailable." }); // nothing from the request is logged or returned
    }
  }
  return { handle, issueChallenge, verifyCode };
}

function registerCentralFactorVerify({ app, auth, db, env = process.env, now, randomCode, genId, rateLimit } = {}) {
  const service = createCentralFactorVerify({ db, env, now, randomCode, genId });
  app.post(ENDPOINT_PATH, service.handle);
  const limiter = typeof rateLimit === "function" ? [rateLimit({ windowMs: 60_000, max: 5, keyFn: (req) => req.user?.id || req.ip, message: "Too many code requests. Please wait a moment." })] : [];
  app.post(CHALLENGE_PATH, auth.authMiddleware, ...limiter, (req, res) => {
    try { return res.set("Cache-Control", "no-store").status(200).json(service.issueChallenge(req.user.id)); }
    catch (e) {
      if (e && e.status && e.code) return res.status(e.status).json({ error: e.message, code: e.code });
      return res.status(503).json({ error: "Verification code is temporarily unavailable.", code: "CODE_UNAVAILABLE" });
    }
  });
  return service;
}

module.exports = { ENDPOINT_PATH, CHALLENGE_PATH, canonicalJson, signEnvelope, configuredKeys, ensureSchema, createCentralFactorVerify, registerCentralFactorVerify };
