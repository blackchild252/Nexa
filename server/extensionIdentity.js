"use strict";
const crypto = require("crypto");

const KEY_PREFIX = "nxa_ext_";
function generateClientId() { return `cli_${crypto.randomBytes(10).toString("hex")}`; }
function generateApiKey() {
  const raw = crypto.randomBytes(32).toString("base64url");
  return `${KEY_PREFIX}${raw}`;
}
function hashApiKey(key) { return crypto.createHash("sha256").update(String(key)).digest("hex"); }
function prefixApiKey(key) { return String(key).slice(0, 16); }
function verifyApiKey(key, expectedHash) {
  if (!key || !expectedHash) return false;
  const a = Buffer.from(hashApiKey(key), "hex");
  const b = Buffer.from(String(expectedHash), "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function identityRecord({ extensionId, userId, key, now = new Date().toISOString() }) {
  return {
    id: `eid_${crypto.randomBytes(10).toString("hex")}`,
    extensionId,
    userId,
    clientId: generateClientId(),
    keyHash: hashApiKey(key),
    keyPrefix: prefixApiKey(key),
    createdAt: now,
    lastUsedAt: null,
    revokedAt: null,
  };
}
const DEFAULT_RATE_LIMIT = Object.freeze({ windowMs: 60_000, maxRequests: 60 });
function createRateLimiter({ windowMs = DEFAULT_RATE_LIMIT.windowMs, maxRequests = DEFAULT_RATE_LIMIT.maxRequests } = {}) {
  const buckets = new Map();
  return {
    consume(key, now = Date.now()) {
      const id = String(key || "");
      const current = buckets.get(id);
      if (!current || now - current.startedAt >= windowMs) {
        buckets.set(id, { startedAt: now, count: 1 });
        return { allowed: true, remaining: Math.max(0, maxRequests - 1), retryAfterMs: 0 };
      }
      if (current.count >= maxRequests) {
        return { allowed: false, remaining: 0, retryAfterMs: Math.max(1, windowMs - (now - current.startedAt)) };
      }
      current.count += 1;
      return { allowed: true, remaining: Math.max(0, maxRequests - current.count), retryAfterMs: 0 };
    },
    clear() { buckets.clear(); },
  };
}

module.exports = { KEY_PREFIX, DEFAULT_RATE_LIMIT, generateClientId, generateApiKey, hashApiKey, prefixApiKey, verifyApiKey, identityRecord, createRateLimiter };
