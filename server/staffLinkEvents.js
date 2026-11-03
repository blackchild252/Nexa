// Staff-link events (M7785). Main tells Admin and Central, in a small signed message, that a staff
// link changed. The message is minimized: it names the link, the NEXA account id, the boss, the
// unit and the new status. It never carries permissions, passwords, codes, tokens or 2FA material.
// A receiver refuses anything unsigned, signed with an unknown key, stale, from the future,
// addressed to someone else, carrying extra fields, or already seen. Same HMAC style as the Admin
// and Central bridges (canonical JSON, sha256, constant-time compare).
"use strict";
const crypto = require("crypto");

const EVENT_VERSION = 1;
const TARGETS = Object.freeze(["admin", "central"]);
const EVENT_TYPES = Object.freeze(["link_approved", "link_rejected", "link_suspended", "link_resumed", "link_removed", "boss_held", "boss_restored", "boss_removed"]);
const MAX_AGE_MS = 5 * 60 * 1000;      // older than this is stale
const MAX_FUTURE_MS = 60 * 1000;       // clock skew allowed into the future
const SUBJECT_KEYS = Object.freeze(["bossId", "bossTier", "linkId", "nexaUserId", "status", "unit"]);
const ENVELOPE_KEYS = Object.freeze(["eventId", "issuedAt", "subject", "target", "type", "v"]);
const FORBIDDEN_KEY = /pass(word)?|secret|token|code|otp|2fa|totp|credential|permission/i;

const SEEN_SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS staff_link_events_seen (
  eventId TEXT PRIMARY KEY,
  keyId TEXT NOT NULL,
  seenAt TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_staff_link_events_seen_at ON staff_link_events_seen (seenAt);
`;

class StaffEventError extends Error {
  constructor(code) { super("Event refused."); this.code = code; this.status = 400; }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") return `{${Object.keys(value).sort().map((k) => `${JSON.stringify(k)}:${canonicalJson(value[k])}`).join(",")}}`;
  return JSON.stringify(value);
}
function sign(secret, envelope) { return crypto.createHmac("sha256", secret).update(canonicalJson(envelope)).digest("hex"); }
function safeHexEqual(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || !/^[a-f0-9]{64}$/.test(a) || !/^[a-f0-9]{64}$/.test(b)) return false;
  const aa = Buffer.from(a, "hex"), bb = Buffer.from(b, "hex");
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
const isText = (v, max) => typeof v === "string" && v.length > 0 && v.length <= max;
const sameKeys = (obj, keys) => { const k = Object.keys(obj).sort(); return k.length === keys.length && k.every((x, i) => x === keys[i]); };

// keys: { <keyId>: <secret> }. Secrets come from the environment, never from source or logs.
function usableKeys(keys) {
  const out = {};
  for (const [id, secret] of Object.entries(keys || {})) {
    if (/^[A-Za-z0-9_-]{1,40}$/.test(id) && typeof secret === "string" && secret.length >= 32) out[id] = secret;
  }
  return out;
}

// ---- sending side -------------------------------------------------------------------------
function createEventSigner({ keys, activeKeyId, now = () => Date.now() } = {}) {
  const ks = usableKeys(keys);
  if (!activeKeyId || !ks[activeKeyId]) throw new Error("A signing key of at least 32 characters is required.");
  // link: a row from staff_links (only the minimized fields below are copied out of it).
  function buildEvent(link, type, target) {
    if (!EVENT_TYPES.includes(type)) throw new StaffEventError("bad_type");
    if (!TARGETS.includes(target)) throw new StaffEventError("bad_target");
    if (!link || !isText(link.id, 100) || !isText(link.nexaUserId, 100) || !isText(link.bossId, 100)) throw new StaffEventError("bad_subject");
    const envelope = {
      v: EVENT_VERSION,
      eventId: crypto.randomUUID(),
      type,
      target,
      issuedAt: new Date(now()).toISOString(),
      subject: { linkId: link.id, nexaUserId: link.nexaUserId, bossTier: link.bossTier, bossId: link.bossId, unit: link.unit, status: link.status }
    };
    return { ...envelope, keyId: activeKeyId, signature: sign(ks[activeKeyId], envelope) };
  }
  return { buildEvent };
}

// ---- receiving side (used by Main's tests and as the contract Admin/Central must meet) -------
function createEventVerifier(db, { keys, now = () => Date.now() } = {}) {
  const ks = usableKeys(keys);
  db.exec(SEEN_SCHEMA_SQL);
  const insSeen = db.prepare("INSERT INTO staff_link_events_seen (eventId,keyId,seenAt) VALUES (?,?,?)");
  const purge = db.prepare("DELETE FROM staff_link_events_seen WHERE seenAt < ?");

  // Returns the minimized event on success. Every failure throws the same StaffEventError shape;
  // the code is for tests and logs, a caller should answer the outside world with one generic refusal.
  function verifyEvent(wire, { expectTarget } = {}) {
    if (!wire || typeof wire !== "object" || Array.isArray(wire)) throw new StaffEventError("unsigned");
    const { keyId, signature, ...envelope } = wire;
    if (!isText(keyId, 40) || !isText(signature, 64)) throw new StaffEventError("unsigned");
    const secret = Object.prototype.hasOwnProperty.call(ks, keyId) ? ks[keyId] : null;
    if (!secret) throw new StaffEventError("unknown_key");
    if (!safeHexEqual(signature, sign(secret, envelope))) throw new StaffEventError("bad_signature");
    // Signature is good from here; now the shape, so a signed-but-sloppy sender cannot leak extra data.
    if (!sameKeys(envelope, ENVELOPE_KEYS) || envelope.v !== EVENT_VERSION) throw new StaffEventError("bad_shape");
    if (!envelope.subject || typeof envelope.subject !== "object" || !sameKeys(envelope.subject, SUBJECT_KEYS)) throw new StaffEventError("bad_shape");
    for (const k of [...Object.keys(envelope), ...Object.keys(envelope.subject)]) if (FORBIDDEN_KEY.test(k)) throw new StaffEventError("bad_shape");
    if (!EVENT_TYPES.includes(envelope.type)) throw new StaffEventError("bad_type");
    if (!TARGETS.includes(envelope.target) || (expectTarget && envelope.target !== expectTarget)) throw new StaffEventError("wrong_target");
    if (!isText(envelope.eventId, 80)) throw new StaffEventError("bad_shape");
    const issued = Date.parse(envelope.issuedAt);
    if (!Number.isFinite(issued)) throw new StaffEventError("bad_shape");
    const t = now();
    if (t - issued > MAX_AGE_MS) throw new StaffEventError("stale");
    if (issued - t > MAX_FUTURE_MS) throw new StaffEventError("from_future");
    // Replay check last, and only for an event that is otherwise fully valid, so junk cannot fill the table.
    try { insSeen.run(envelope.eventId, keyId, new Date(t).toISOString()); }
    catch (e) { if (/UNIQUE|constraint/i.test(String(e && e.message))) throw new StaffEventError("replayed"); throw e; }
    purge.run(new Date(t - 2 * MAX_AGE_MS).toISOString());
    return envelope;
  }
  return { verifyEvent };
}

module.exports = { EVENT_VERSION, TARGETS, EVENT_TYPES, MAX_AGE_MS, MAX_FUTURE_MS, SUBJECT_KEYS, ENVELOPE_KEYS, SEEN_SCHEMA_SQL, StaffEventError, canonicalJson, createEventSigner, createEventVerifier };
