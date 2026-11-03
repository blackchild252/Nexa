"use strict";

const crypto = require("node:crypto");

const MILESTONES = Object.freeze([
  [825, "transactional-outbox-boundary"],
  [826, "optimistic-concurrency-version"],
  [827, "state-transition-allowlist"],
  [828, "ledger-hash-chain"],
  [829, "balance-reconciliation-delta"],
  [830, "inventory-reservation-boundary"],
  [831, "order-terminal-state-protection"],
  [832, "payment-amount-currency-binding"],
  [833, "webhook-freshness-window"],
  [834, "webhook-signature-normalization"],
  [835, "provider-idempotency-binding"],
  [836, "session-token-rotation"],
  [837, "session-reuse-detection"],
  [838, "single-use-reset-token"],
  [839, "oauth-state-binding"],
  [840, "ai-tool-allowlist"],
  [841, "ai-action-parameter-schema"],
  [842, "ai-output-secret-redaction"],
  [843, "ai-provider-circuit-breaker"],
  [844, "upload-content-type-boundary"],
  [845, "upload-pixel-bomb-boundary"],
  [846, "identity-aware-rate-limit-key"],
  [847, "request-correlation-boundary"],
  [848, "liveness-readiness-separation"],
  [849, "major-system-controls-certification"],
]);

function bounded(value, max = 200) {
  const s = String(value ?? "").trim();
  return s && s.length <= max ? s : null;
}

function outboxEnvelope({ eventType, aggregateType, aggregateId, payload = {}, occurredAt = new Date().toISOString() } = {}) {
  const type = bounded(eventType, 100);
  const aggregate = bounded(aggregateType, 80);
  const id = bounded(aggregateId, 160);
  if (!type || !aggregate || !id || !payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, reason: "invalid_envelope" };
  return { ok: true, eventId: `evt_${crypto.randomBytes(12).toString("hex")}`, eventType: type, aggregateType: aggregate, aggregateId: id, payload, occurredAt: new Date(occurredAt).toISOString() };
}

function concurrencyGuard({ expectedVersion, actualVersion } = {}) {
  const expected = Number(expectedVersion), actual = Number(actualVersion);
  return { ok: Number.isSafeInteger(expected) && Number.isSafeInteger(actual) && expected === actual, expectedVersion: expected, actualVersion: actual };
}

function stateTransitionGuard(current, next, transitions = {}) {
  const from = String(current || "");
  const to = String(next || "");
  const allowed = Array.isArray(transitions[from]) ? transitions[from].map(String) : [];
  return { ok: Boolean(from && to && allowed.includes(to)), current: from, next: to, allowed };
}

function ledgerHash(previousHash, entry) {
  const previous = String(previousHash || "GENESIS");
  const canonical = JSON.stringify({ previousHash: previous, entry });
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function verifyLedgerChain(rows = []) {
  let previous = "GENESIS";
  const violations = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    const expected = ledgerHash(previous, row?.entry ?? row?.payload ?? row?.data ?? null);
    if (String(row?.hash || "") !== expected) violations.push(row?.id || "unknown");
    previous = String(row?.hash || "");
  }
  return { ok: violations.length === 0, checked: Array.isArray(rows) ? rows.length : 0, violations };
}

function reconciliationDelta(expected, actual, tolerance = 0) {
  const e = Number(expected), a = Number(actual), t = Math.max(0, Number(tolerance) || 0);
  const delta = a - e;
  return { ok: Number.isFinite(e) && Number.isFinite(a) && Math.abs(delta) <= t, expected: e, actual: a, delta, tolerance: t };
}

function reservationGuard(stock, requested, reserved = 0) {
  const s = Number(stock), q = Number(requested), r = Number(reserved);
  return { ok: Number.isSafeInteger(s) && Number.isSafeInteger(q) && Number.isSafeInteger(r) && s >= 0 && q > 0 && r >= 0 && r + q <= s, available: s - r };
}

function terminalStateGuard(status, terminal = ["cancelled", "completed", "refunded", "rejected"]) {
  const value = String(status || "");
  return { ok: !terminal.map(String).includes(value), terminal: terminal.map(String).includes(value), status: value };
}

function paymentBinding(result, expected = {}) {
  if (!result || !expected) return { ok: false, reason: "missing" };
  const currencyOk = String(result.currency || "").toUpperCase() === String(expected.currency || "").toUpperCase();
  const amountOk = Number(result.amountMinor) === Number(expected.amountMinor);
  const referenceOk = !expected.reference || String(result.reference || "") === String(expected.reference);
  return { ok: currencyOk && amountOk && referenceOk, currencyOk, amountOk, referenceOk };
}

function webhookFreshness(timestamp, now = Date.now(), maxAgeMs = 5 * 60 * 1000) {
  const t = new Date(timestamp).getTime();
  const n = new Date(now).getTime();
  const age = n - t;
  const max = Math.max(30 * 1000, Number(maxAgeMs) || 5 * 60 * 1000);
  return { ok: Number.isFinite(t) && Number.isFinite(n) && age >= 0 && age <= max, ageMs: age, maxAgeMs: max };
}

function normalizeSignature(signature) {
  const s = String(signature || "").trim().toLowerCase();
  return /^[a-f0-9]{32,256}$/.test(s) ? s : null;
}

function providerIdempotency(provider, reference, operation) {
  const p = bounded(provider, 80), r = bounded(reference, 200), o = bounded(operation, 80);
  if (!p || !r || !o) return null;
  return crypto.createHash("sha256").update(`${p}|${o}|${r}`).digest("hex");
}

function tokenRotation(previousTokenHash, nextTokenHash) {
  return Boolean(previousTokenHash && nextTokenHash && String(previousTokenHash) !== String(nextTokenHash));
}

function sessionReuseDecision({ tokenHash, revokedTokenHash, presentedAfterRevoke = false } = {}) {
  return { reused: Boolean(tokenHash && revokedTokenHash && String(tokenHash) === String(revokedTokenHash) && presentedAfterRevoke), action: presentedAfterRevoke ? "reject" : "allow" };
}

function singleUseTokenDecision({ consumedAt = null, expiresAt, now = new Date() } = {}) {
  const expired = !expiresAt || new Date(expiresAt).getTime() <= new Date(now).getTime();
  return { usable: !consumedAt && !expired, expired, consumed: Boolean(consumedAt) };
}

function oauthStateBinding(expected, presented) {
  return Boolean(expected && presented && crypto.timingSafeEqual(Buffer.from(String(expected)), Buffer.from(String(presented))));
}

function aiToolAllowed(tool, allowlist = []) {
  return Array.isArray(allowlist) && allowlist.map(String).includes(String(tool || ""));
}

function validateAiActionParameters(type, payload, schemas = {}) {
  const schema = schemas?.[type];
  if (!schema || !payload || typeof payload !== "object" || Array.isArray(payload)) return { ok: false, reason: "schema_missing" };
  const allowed = new Set(Array.isArray(schema.allowed) ? schema.allowed.map(String) : []);
  const required = Array.isArray(schema.required) ? schema.required.map(String) : [];
  const keys = Object.keys(payload);
  if (keys.some(k => !allowed.has(k)) || required.some(k => payload[k] == null || payload[k] === "")) return { ok: false, reason: "invalid_parameters" };
  return { ok: true };
}

function redactAiOutput(text) {
  let value = String(text || "");
  value = value.replace(/(sk-[A-Za-z0-9_-]{12,})/g, "[REDACTED_KEY]");
  value = value.replace(/(Bearer\s+)[A-Za-z0-9._-]{12,}/gi, "$1[REDACTED_TOKEN]");
  value = value.replace(/(password|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/gi, "$1=[REDACTED]");
  return value;
}

function circuitBreaker(state = {}, { failureThreshold = 5, resetMs = 60 * 1000 } = {}) {
  const failures = Math.max(0, Number(state.failures) || 0);
  const openedAt = state.openedAt ? new Date(state.openedAt).getTime() : null;
  const now = Date.now();
  const open = failures >= failureThreshold && (!openedAt || now - openedAt < resetMs);
  return { open, failures, failureThreshold, resetMs };
}

function uploadTypeGuard({ mime, allowed = ["image/jpeg", "image/png", "image/webp"], bytes = 0, maxBytes = 12 * 1024 * 1024 } = {}) {
  const type = String(mime || "").toLowerCase();
  return { ok: allowed.map(String).includes(type) && Number(bytes) > 0 && Number(bytes) <= maxBytes, mime: type, maxBytes };
}

function pixelBombGuard({ width, height, maxPixels = 25_000_000 } = {}) {
  const w = Number(width), h = Number(height), pixels = w * h;
  return { ok: Number.isSafeInteger(w) && Number.isSafeInteger(h) && w > 0 && h > 0 && pixels <= maxPixels, pixels, maxPixels };
}

function rateLimitIdentity({ userId, ip, route } = {}) {
  const identity = userId ? `user:${userId}` : `ip:${String(ip || "unknown")}`;
  const r = bounded(route, 160) || "unknown";
  return `${identity}|${r}`;
}

function requestCorrelation(input) {
  const value = bounded(input, 100);
  return value || `req_${crypto.randomBytes(12).toString("hex")}`;
}

function serviceHealth({ dependency, critical = false } = {}) {
  const ok = dependency === true;
  return { liveness: true, readiness: ok, critical: Boolean(critical) };
}

function certification(results = []) {
  const list = Array.isArray(results) ? results : [];
  return { total: list.length, passed: list.filter(Boolean).length, ok: list.length === 25 && list.every(Boolean) };
}

module.exports = {
  MILESTONES,
  outboxEnvelope,
  concurrencyGuard,
  stateTransitionGuard,
  ledgerHash,
  verifyLedgerChain,
  reconciliationDelta,
  reservationGuard,
  terminalStateGuard,
  paymentBinding,
  webhookFreshness,
  normalizeSignature,
  providerIdempotency,
  tokenRotation,
  sessionReuseDecision,
  singleUseTokenDecision,
  oauthStateBinding,
  aiToolAllowed,
  validateAiActionParameters,
  redactAiOutput,
  circuitBreaker,
  uploadTypeGuard,
  pixelBombGuard,
  rateLimitIdentity,
  requestCorrelation,
  serviceHealth,
  certification,
};
