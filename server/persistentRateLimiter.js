"use strict";

const crypto = require("crypto");

function normalizePersistentKey(key) {
  const raw = String(key ?? "unknown").trim() || "unknown";
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function validateOptions({ windowMs, max, maxKeys = 10000 } = {}) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error("windowMs must be a positive number");
  if (!Number.isInteger(max) || max < 1) throw new Error("max must be an integer >= 1");
  if (!Number.isInteger(maxKeys) || maxKeys < 1) throw new Error("maxKeys must be an integer >= 1");
}

function createPersistentRateLimiter({ db, windowMs, max, keyFn, message, maxKeys = 10000, now = Date.now, scope = "default" } = {}) {
  validateOptions({ windowMs, max, maxKeys });
  if (!db || typeof db.prepare !== "function" || typeof db.transaction !== "function") throw new Error("A database handle is required");
  const scopeKey = String(scope || "default").slice(0, 80);
  const select = db.prepare("SELECT keyHash, windowStart, count, expiresAt FROM rate_limit_buckets WHERE scope = ? AND keyHash = ?");
  const insert = db.prepare("INSERT INTO rate_limit_buckets(scope,keyHash,windowStart,count,expiresAt,updatedAt) VALUES(?,?,?,?,?,?)");
  const update = db.prepare("UPDATE rate_limit_buckets SET windowStart = ?, count = ?, expiresAt = ?, updatedAt = ? WHERE scope = ? AND keyHash = ?");
  const cleanup = db.prepare("DELETE FROM rate_limit_buckets WHERE scope = ? AND expiresAt <= ?");
  const countKeys = db.prepare("SELECT COUNT(*) AS count FROM rate_limit_buckets WHERE scope = ?");
  const oldest = db.prepare("SELECT keyHash FROM rate_limit_buckets WHERE scope = ? ORDER BY updatedAt ASC LIMIT 1");
  const deleteKey = db.prepare("DELETE FROM rate_limit_buckets WHERE scope = ? AND keyHash = ?");
  const timer = setInterval(() => { try { cleanup.run(scopeKey, now()); } catch (_) {} }, Math.max(1000, Math.min(windowMs, 60_000)));
  timer.unref();

  const consume = db.transaction((key, t) => {
    cleanup.run(scopeKey, t);
    const keyHash = normalizePersistentKey(key);
    let row = select.get(scopeKey, keyHash);
    if (!row || Number(row.expiresAt) <= t) {
      if (!row) {
        let count = Number(countKeys.get(scopeKey)?.count || 0);
        while (count >= maxKeys) {
          const victim = oldest.get(scopeKey);
          if (!victim) break;
          deleteKey.run(scopeKey, victim.keyHash);
          count -= 1;
        }
      }
      const windowStart = t;
      const expiresAt = t + windowMs;
      insert.run(scopeKey, keyHash, windowStart, 1, expiresAt, t);
      return { count: 1, resetAt: expiresAt };
    }
    const count = Number(row.count || 0) + 1;
    update.run(Number(row.windowStart), count, Number(row.expiresAt), t, scopeKey, keyHash);
    return { count, resetAt: Number(row.expiresAt) };
  });

  const middleware = (req, res, next) => {
    let key;
    try { key = keyFn ? keyFn(req) : undefined; } catch (_) { key = undefined; }
    if (key === undefined || key === null || key === "") key = req?.ip || req?.socket?.remoteAddress || "unknown";
    const t = now();
    try {
      const result = consume(key, t);
      const resetSec = Math.max(0, Math.ceil((result.resetAt - t) / 1000));
      res.set("RateLimit-Limit", String(max));
      res.set("RateLimit-Remaining", String(Math.max(0, max - result.count)));
      res.set("RateLimit-Reset", String(resetSec));
      if (result.count > max) {
        res.set("Retry-After", String(resetSec));
        return res.status(429).json({ error: message || "Too many requests. Please wait a moment and try again." });
      }
      return next();
    } catch (_) {
      // Fail closed for abuse-sensitive persistent limiters: unavailable storage must not silently disable protection.
      return res.status(503).json({ error: "Request protection is temporarily unavailable. Please try again shortly." });
    }
  };
  middleware.stats = () => ({ scope: scopeKey, maxKeys });
  middleware.dispose = () => { clearInterval(timer); };
  return middleware;
}

module.exports = { createPersistentRateLimiter, normalizePersistentKey, validateOptions };
