"use strict";
// V5.54.0 / B91 — bounded fixed-window rate limiter (M700–M711).
// Behaviour-compatible with the previous inline limiter (same options, same 429 body and Retry-After),
// plus: bounded memory, key normalisation, failure-safe keys, RateLimit-* headers, stats, dispose.

const MAPPED_V4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

// M700 — the same client must map to the same key however the socket reports its address.
function normalizeKey(key) {
  let k = String(key);
  const m = MAPPED_V4.exec(k);
  if (m) return m[1];
  if (/^[0-9a-f:]+%[\w.-]+$/i.test(k)) k = k.slice(0, k.indexOf("%")); // strip IPv6 zone id
  return k;
}
// M701 — a limiter must never key on "nothing": that would put every caller in one shared bucket or crash.
function clientKey(req) {
  const ip = req && (req.ip || (req.socket && req.socket.remoteAddress));
  return ip ? normalizeKey(ip) : "unknown";
}

function createRateLimiter({ windowMs, max, keyFn, message, maxKeys = 10000, now = Date.now } = {}) {
  if (!Number.isFinite(windowMs) || windowMs <= 0) throw new Error("windowMs must be a positive number");
  if (!Number.isInteger(max) || max < 1) throw new Error("max must be an integer >= 1");
  const hits = new Map();
  let evicted = 0, blocked = 0;

  // M707
  const sweep = () => { const t = now(); let n = 0; for (const [k, v] of hits) if (v.resetAt <= t) { hits.delete(k); n += 1; } return n; };
  const timer = setInterval(sweep, windowMs); timer.unref();

  const middleware = (req, res, next) => {
    let key;
    try { key = keyFn ? keyFn(req) : undefined; } catch (_) { key = undefined; } // M705
    key = key === undefined || key === null || key === "" ? clientKey(req) : normalizeKey(key);
    const t = now();
    let h = hits.get(key);
    if (!h || h.resetAt <= t) {
      if (!h && hits.size >= maxKeys) { // M706 / M708 — bounded store: expired first, then oldest-first
        sweep();
        while (hits.size >= maxKeys) { hits.delete(hits.keys().next().value); evicted += 1; }
      }
      h = { count: 0, resetAt: t + windowMs };
      hits.set(key, h);
    }
    h.count += 1;
    const resetSec = Math.max(0, Math.ceil((h.resetAt - t) / 1000));
    res.set("RateLimit-Limit", String(max)); // M704
    res.set("RateLimit-Remaining", String(Math.max(0, max - h.count)));
    res.set("RateLimit-Reset", String(resetSec));
    if (h.count > max) { // M702 / M703
      blocked += 1;
      res.set("Retry-After", String(resetSec));
      return res.status(429).json({ error: message || "Too many requests. Please wait a moment and try again." });
    }
    return next();
  };
  middleware.stats = () => ({ keys: hits.size, maxKeys, evicted, blocked }); // M709 — counts only, never keys
  middleware.sweep = sweep;
  middleware.reset = () => { hits.clear(); evicted = 0; blocked = 0; }; // M710
  middleware.dispose = () => { clearInterval(timer); hits.clear(); };
  return middleware; // M711 — every limiter owns its own store
}

module.exports = { createRateLimiter, normalizeKey, clientKey };
