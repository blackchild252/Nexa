"use strict";
// Server-to-server identity lookup for AAMI Central. It never creates accounts or grants roles.
const crypto = require("node:crypto");

const ENDPOINT_PATH = "/central/v1/identity/resolve";
const EXPECTED = Object.freeze({ v: 1, type: "identity.resolve", issuer: "aami-central", audience: "nexa-main-identity" });
const RESPONSE = Object.freeze({ v: 1, type: "identity.resolve_result", issuer: "nexa-main", audience: "aami-central" });
const ENVELOPE_KEYS = new Set(["v", "type", "issuer", "audience", "at", "eventId", "correlationId", "data"]);
const DATA_KEYS = new Set(["email"]);

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
function normalizedEmail(value) { return typeof value === "string" ? value.trim().toLowerCase() : ""; }
function configuredKeys(env) {
  const raw = String(env.AAMI_CENTRAL_IDENTITY_KEYS || "").trim();
  if (!raw) return Object.create(null);
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") return Object.create(null);
    const result = Object.create(null);
    for (const [keyId, secret] of Object.entries(parsed)) {
      if (/^[A-Za-z0-9_-]{1,40}$/.test(keyId) && typeof secret === "string" && secret.length >= 32) result[keyId] = secret;
    }
    return result;
  } catch { return Object.create(null); }
}
function json(res, status, body) { return res.status(status).json(body); }

function createCentralIdentityResolve({ db, env = process.env, now = () => Date.now() } = {}) {
  if (!db || typeof db.prepare !== "function") throw new TypeError("A database adapter is required.");
  const keys = configuredKeys(env);
  function handle(req, res) {
    try {
      const body = req?.body;
      if (!body || Array.isArray(body) || typeof body !== "object") return json(res, 400, { error: "Identity request is not valid." });
      const { keyId, signature, ...envelope } = body;
      if (!text(keyId, 40) || !/^[A-Za-z0-9_-]{1,40}$/.test(keyId) || !text(signature, 64)) return json(res, 401, { error: "Identity request not accepted." });
      const secret = keys[keyId];
      if (!secret || !safeHexEqual(signature, signEnvelope(secret, envelope))) return json(res, 401, { error: "Identity request not accepted." });
      if (Object.keys(envelope).some((key) => !ENVELOPE_KEYS.has(key)) || Object.keys(envelope).length !== ENVELOPE_KEYS.size ||
          envelope.v !== EXPECTED.v || envelope.type !== EXPECTED.type || envelope.issuer !== EXPECTED.issuer || envelope.audience !== EXPECTED.audience) {
        return json(res, 403, { error: "Identity request scope was rejected." });
      }
      if (!Number.isSafeInteger(envelope.at) || Math.abs(now() - envelope.at) > 5 * 60 * 1000 ||
          !text(envelope.eventId, 160) || !/^[A-Za-z0-9._:-]{1,160}$/.test(envelope.eventId) ||
          !(envelope.correlationId === null || text(envelope.correlationId, 160))) {
        return json(res, 400, { error: "Identity request is not valid." });
      }
      const data = envelope.data;
      if (!data || Array.isArray(data) || typeof data !== "object" || Object.keys(data).length !== 1 || Object.keys(data).some((key) => !DATA_KEYS.has(key))) {
        return json(res, 400, { error: "Identity request is not valid." });
      }
      const email = normalizedEmail(data.email);
      if (!/^[^\s@]{1,64}@[A-Za-z0-9.-]{1,190}\.[A-Za-z]{2,63}$/.test(email) || email !== data.email) {
        return json(res, 400, { error: "Identity request is not valid." });
      }

      // Return the same signed shape for missing, unverified, suspended and closed identities.
      const user = db.prepare("SELECT id, email, username, accountStatus, emailVerifiedAt FROM users WHERE email = ? COLLATE NOCASE").get(email);
      const found = !!user && user.accountStatus === "active" && typeof user.emailVerifiedAt === "string" && user.emailVerifiedAt.length > 0;
      const dataOut = found
        ? { found: true, userId: user.id, username: typeof user.username === "string" ? user.username : null, emailVerified: true }
        : { found: false, userId: null, username: null, emailVerified: false };
      const result = { ...RESPONSE, at: now(), eventId: envelope.eventId, correlationId: envelope.correlationId, data: dataOut };
      return json(res, 200, { ...result, keyId, signature: signEnvelope(secret, result) });
    } catch {
      // Do not leak database errors, paths, account identifiers, or signed request contents.
      return json(res, 503, { error: "Identity lookup is temporarily unavailable." });
    }
  }
  return { handle };
}

function registerCentralIdentityResolve({ app, db, env = process.env, now } = {}) {
  const service = createCentralIdentityResolve({ db, env, now });
  app.post(ENDPOINT_PATH, service.handle);
  return service;
}

module.exports = { ENDPOINT_PATH, EXPECTED, RESPONSE, canonicalJson, signEnvelope, createCentralIdentityResolve, registerCentralIdentityResolve };
