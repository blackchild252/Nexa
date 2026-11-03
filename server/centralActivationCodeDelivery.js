"use strict";

const crypto = require("crypto");

const ENDPOINT_PATH = "/zeeza/v1/central/activation-code";
const EXPECTED = Object.freeze({ v: 1, type: "activation.code_delivery", issuer: "aami-central", audience: "nexa-main-zeeza" });
const DATA_KEYS = Object.freeze(["applicationId", "applicantId", "username", "email", "product", "role", "code", "expiresAt", "channel"]);
const DATA_KEY_SET = new Set(DATA_KEYS);
const MESSAGE_PREFIX = "Your AAMI Central activation code is ";
const MESSAGE_SUFFIX = ". It works once and expires in 60 minutes. Enter it in AAMI Admin. Nobody from NEXA will ever ask you for it.";

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function safeHexEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  const aa = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function signEnvelope(secret, envelope) {
  return crypto.createHmac("sha256", secret).update(canonicalJson(envelope)).digest("hex");
}

function configuredKeys(env) {
  const raw = String(env.NEXA_CENTRAL_ZEEZA_KEYS || "").trim();
  if (!raw) return Object.create(null);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return Object.create(null);
    const result = Object.create(null);
    for (const [keyId, secret] of Object.entries(parsed)) {
      if (/^[A-Za-z0-9_-]{1,40}$/.test(keyId) && typeof secret === "string" && secret.length >= 16) result[keyId] = secret;
    }
    return result;
  } catch {
    return Object.create(null);
  }
}

function text(value, max = 200) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}
function normalized(value) { return String(value ?? "").trim().toLowerCase(); }
function expiryTimestamp(value) {
  // Central's canonical contract sends Unix epoch milliseconds. Accept ISO strings
  // as well for compatibility with already-issued test fixtures and older senders.
  if (typeof value === "number") return Number.isSafeInteger(value) ? value : NaN;
  if (typeof value !== "string" || value.trim().length === 0 || value.length > 64) return NaN;
  return Date.parse(value);
}
function response(res, body) { return res.status(200).json(body); }

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS zeeza_central_secure_inbox (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL,
      applicationId TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'local' CHECK (category = 'local'),
      preview TEXT NOT NULL DEFAULT 'AAMI Central activation code',
      message TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_zeeza_central_secure_inbox_user_expiry
      ON zeeza_central_secure_inbox(userId, expiresAt);
    CREATE TABLE IF NOT EXISTS zeeza_central_activation_events (
      eventId TEXT PRIMARY KEY,
      deliveredAt TEXT NOT NULL
    );
  `);
}

function createCentralActivationCodeDelivery({ db, env = process.env, now = () => Date.now(), genId = () => crypto.randomUUID(), scheduleCleanup = true }) {
  ensureSchema(db);
  const keys = configuredKeys(env);
  const deleteExpired = () => db.prepare("DELETE FROM zeeza_central_secure_inbox WHERE expiresAt <= ?").run(new Date(now()).toISOString());
  deleteExpired();
  let cleanupTimer = null;
  if (scheduleCleanup) {
    cleanupTimer = setInterval(() => { try { deleteExpired(); } catch { /* Never log inbox content or secrets. */ } }, 60_000);
    if (typeof cleanupTimer.unref === "function") cleanupTimer.unref();
  }

  function handle(req, res) {
    try {
      deleteExpired();
      const body = req?.body;
      if (!body || Array.isArray(body) || typeof body !== "object") return response(res, { delivered: false, reason: "bad_request" });
      const { keyId, signature, ...envelope } = body;
      if (!text(keyId, 40) || !/^[A-Za-z0-9_-]{1,40}$/.test(keyId) || !text(signature, 64)) return response(res, { delivered: false, reason: "bad_signature" });
      const secret = keys[keyId];
      if (!secret) return response(res, { delivered: false, reason: "bad_signature" });
      if (!safeHexEqual(signature, signEnvelope(secret, envelope))) return response(res, { delivered: false, reason: "bad_signature" });

      if (envelope.v !== EXPECTED.v || envelope.type !== EXPECTED.type || envelope.issuer !== EXPECTED.issuer || envelope.audience !== EXPECTED.audience) {
        return response(res, { delivered: false, reason: "wrong_scope" });
      }
      if (!Number.isFinite(envelope.at) || Math.abs(now() - envelope.at) > 5 * 60 * 1000) return response(res, { delivered: false, reason: "stale_event" });
      if (!text(envelope.eventId, 160) || !/^[A-Za-z0-9._:-]{1,160}$/.test(envelope.eventId)) return response(res, { delivered: false, reason: "bad_request" });
      if (envelope.correlationId !== null && !text(envelope.correlationId, 160)) return response(res, { delivered: false, reason: "bad_request" });
      const data = envelope.data;
      if (!data || Array.isArray(data) || typeof data !== "object" || Object.keys(data).some((key) => !DATA_KEY_SET.has(key)) || Object.keys(data).length !== DATA_KEYS.length) {
        return response(res, { delivered: false, reason: "bad_request" });
      }
      if (!text(data.applicationId, 160) || !text(data.applicantId, 160) || !text(data.username, 80) || !text(data.email, 254) ||
          !text(data.product, 100) || !text(data.role, 100) || !text(data.code, 256) || data.channel !== "zeeza_secure_inbox" ||
          data.username !== normalized(data.username) || data.email !== normalized(data.email) || !Number.isFinite(expiryTimestamp(data.expiresAt))) {
        return response(res, { delivered: false, reason: "bad_request" });
      }
      // Idempotency metadata outlives the expiring message, but never contains the activation code.
      const existing = db.prepare("SELECT eventId FROM zeeza_central_activation_events WHERE eventId = ?").get(envelope.eventId);
      if (existing) return response(res, { delivered: true, eventId: envelope.eventId });
      const expiryMs = expiryTimestamp(data.expiresAt);
      if (!Number.isFinite(expiryMs) || expiryMs <= now()) return response(res, { delivered: false, reason: "bad_request" });

      const user = db.prepare("SELECT id, email, username, accountStatus FROM users WHERE id = ?").get(data.applicantId);
      if (!user || (user.accountStatus && user.accountStatus !== "active") || normalized(user.username) !== data.username || normalized(user.email) !== data.email) {
        return response(res, { delivered: false, reason: "identity_mismatch" });
      }

      const createdAt = new Date(now()).toISOString();
      const message = `${MESSAGE_PREFIX}${data.code}${MESSAGE_SUFFIX}`;
      try {
        db.transaction(() => {
          const raced = db.prepare("SELECT eventId FROM zeeza_central_activation_events WHERE eventId = ?").get(envelope.eventId);
          if (raced) return;
          db.prepare("INSERT INTO zeeza_central_activation_events (eventId,deliveredAt) VALUES (?,?)").run(envelope.eventId, createdAt);
          db.prepare(`INSERT INTO zeeza_central_secure_inbox
            (id,eventId,userId,applicationId,category,preview,message,expiresAt,createdAt)
            VALUES (?,?,?,?,'local','AAMI Central activation code',?,?,?)`)
            .run(genId(), envelope.eventId, user.id, data.applicationId, message, new Date(expiryMs).toISOString(), createdAt);
        })();
      } catch (error) {
        // A concurrent duplicate is success; other persistence failures are temporary server failures.
        const raced = db.prepare("SELECT eventId FROM zeeza_central_activation_events WHERE eventId = ?").get(envelope.eventId);
        if (!raced) throw error;
      }
      return response(res, { delivered: true, eventId: envelope.eventId });
    } catch {
      // No error object, request body, activation code, or database value is logged or returned.
      return res.status(500).json({ error: "Activation-code delivery temporarily unavailable." });
    }
  }

  return { handle, deleteExpired, close() { if (cleanupTimer) clearInterval(cleanupTimer); } };
}

function registerCentralActivationCodeDelivery({ app, db, env = process.env, now, genId, scheduleCleanup } = {}) {
  const service = createCentralActivationCodeDelivery({ db, env, now, genId, scheduleCleanup });
  app.post(ENDPOINT_PATH, service.handle);
  return service;
}

module.exports = { ENDPOINT_PATH, canonicalJson, signEnvelope, configuredKeys, ensureSchema, createCentralActivationCodeDelivery, registerCentralActivationCodeDelivery };
