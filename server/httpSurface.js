"use strict";
// V5.54.0 / B91 — HTTP surface hardening helpers (M714–M721).

// M715 — JSON 404 that never echoes the requested path or names the framework.
function notFoundHandler(req, res) {
  return res.status(404).json({ error: "The requested resource was not found.", code: "NOT_FOUND", requestId: req.requestId || null });
}
// M717
function parseTimeoutMs(value, fallback = 120000, min = 10000, max = 600000) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(max, Math.max(min, Math.floor(n)));
}
// M718 — keepAlive must outlive typical proxy idle timeouts (60–65 s); headersTimeout > keepAlive; requestTimeout >= headersTimeout.
function serverTimeouts(env = process.env) {
  const keepAliveTimeout = 65000;
  const headersTimeout = 66000;
  // requestTimeout can never sit below headersTimeout, so a small REQUEST_TIMEOUT_MS is raised to that floor.
  const requestTimeout = Math.max(parseTimeoutMs(env.REQUEST_TIMEOUT_MS), headersTimeout);
  return { keepAliveTimeout, headersTimeout, requestTimeout };
}
function applyServerTimeouts(server, env = process.env) {
  const t = serverTimeouts(env);
  server.keepAliveTimeout = t.keepAliveTimeout; server.headersTimeout = t.headersTimeout; server.requestTimeout = t.requestTimeout;
  return t;
}
// M714
function hardenApp(app) { app.disable("x-powered-by"); return app; }
// M721 — required response headers; used by the contract test against the middleware source.
const REQUIRED_HEADERS = ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy", "Content-Security-Policy", "Permissions-Policy", "Cache-Control", "Strict-Transport-Security"];

module.exports = { notFoundHandler, parseTimeoutMs, serverTimeouts, applyServerTimeouts, hardenApp, REQUIRED_HEADERS };
