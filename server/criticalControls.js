"use strict";

const crypto = require("node:crypto");

const MILESTONES = Object.freeze([
  [800, "persistent-database-runtime-contract"],
  [801, "sqlite-foreign-key-enforcement"],
  [802, "sqlite-busy-timeout"],
  [803, "schema-contract-fingerprint"],
  [804, "database-integrity-readiness"],
  [805, "bounded-idempotency-key"],
  [806, "idempotency-replay-window"],
  [807, "safe-json-size-bound"],
  [808, "critical-audit-envelope"],
  [809, "ownership-assertion"],
  [810, "open-account-assertion"],
  [811, "session-security-state"],
  [812, "admin-step-up-freshness"],
  [813, "vendor-role-revalidation"],
  [814, "wallet-balance-invariant"],
  [815, "wallet-ledger-invariant"],
  [816, "order-amount-invariant"],
  [817, "refund-cap-invariant"],
  [818, "webhook-replay-decision"],
  [819, "notification-dedupe-contract"],
  [820, "job-queue-health"],
  [821, "backup-health-gate"],
  [822, "maintenance-lease"],
  [823, "incident-summary-redaction"],
  [824, "cumulative-major-controls-certification"],
]);

const MAX_IDEMPOTENCY_KEY = 160;
const DEFAULT_REPLAY_WINDOW_MS = 24 * 60 * 60 * 1000;
const MAX_JSON_BYTES = 128 * 1024;

function boundedIdempotencyKey(value) {
  const key = String(value || "").trim();
  if (!key || key.length > MAX_IDEMPOTENCY_KEY || !/^[A-Za-z0-9._:-]+$/.test(key)) return null;
  return key;
}

function idempotencyReplayWindow(createdAt, now = new Date(), windowMs = DEFAULT_REPLAY_WINDOW_MS) {
  const created = new Date(createdAt).getTime();
  const current = new Date(now).getTime();
  const max = Math.max(60 * 1000, Number(windowMs) || DEFAULT_REPLAY_WINDOW_MS);
  if (!Number.isFinite(created) || !Number.isFinite(current)) return { valid: false, ageMs: null };
  const ageMs = current - created;
  return { valid: ageMs >= 0 && ageMs <= max, ageMs, windowMs: max };
}

function safeJsonBytes(value, maxBytes = MAX_JSON_BYTES) {
  const encoded = JSON.stringify(value === undefined ? null : value);
  const bytes = Buffer.byteLength(encoded, "utf8");
  return { ok: bytes <= Math.max(1024, Number(maxBytes) || MAX_JSON_BYTES), bytes, maxBytes: Math.max(1024, Number(maxBytes) || MAX_JSON_BYTES) };
}

function criticalAuditEnvelope({ action, actorId = null, entityType = null, entityId = null, requestId = null, metadata = {} } = {}) {
  const normalizedAction = String(action || "").trim();
  if (!normalizedAction || normalizedAction.length > 100) throw new Error("Audit action is required and bounded.");
  const safeMetadata = metadata && typeof metadata === "object" && !Array.isArray(metadata) ? metadata : {};
  const payload = { action: normalizedAction, actorId: actorId == null ? null : String(actorId), entityType: entityType == null ? null : String(entityType).slice(0, 80), entityId: entityId == null ? null : String(entityId).slice(0, 160), requestId: requestId == null ? null : String(requestId).slice(0, 100), metadata: safeMetadata, createdAt: new Date().toISOString() };
  payload.eventId = `audit_${crypto.randomBytes(12).toString("hex")}`;
  return payload;
}

function assertOwnership(row, userId, field = "userId") {
  if (!row || String(row[field]) !== String(userId)) throw Object.assign(new Error("Resource not found."), { status: 404, code: "NOT_FOUND" });
  return true;
}

function assertOpenAccount(user) {
  if (!user || String(user.accountStatus || "active") === "closed") throw Object.assign(new Error("Account is closed."), { status: 403, code: "ACCOUNT_CLOSED" });
  return true;
}

function sessionSecurityState(row, now = new Date()) {
  if (!row) return { valid: false, reason: "missing" };
  if (String(row.accountStatus || "active") === "closed") return { valid: false, reason: "account_closed" };
  const expires = new Date(row.expiresAt).getTime();
  if (!Number.isFinite(expires) || expires <= new Date(now).getTime()) return { valid: false, reason: "expired" };
  return { valid: true, reason: "active" };
}

function assertFreshAdmin({ authenticated, admin, issuedAt, now = new Date(), maxAgeMs = 15 * 60 * 1000 } = {}) {
  if (!authenticated || !admin) throw Object.assign(new Error("Administrator access required."), { status: 403, code: "FORBIDDEN" });
  const age = new Date(now).getTime() - new Date(issuedAt).getTime();
  if (!Number.isFinite(age) || age < 0 || age > Math.max(60 * 1000, Number(maxAgeMs) || 15 * 60 * 1000)) throw Object.assign(new Error("Administrator step-up authentication is required."), { status: 401, code: "STEP_UP_REQUIRED" });
  return true;
}

function assertVendorRole(row, vendorId) {
  if (!row || String(row.id) !== String(vendorId) || !["active", "verified"].includes(String(row.status || "active"))) throw Object.assign(new Error("Vendor access required."), { status: 403, code: "FORBIDDEN" });
  return true;
}

function walletBalanceInvariant({ ledgerBalanceMinor, availableBalanceMinor = ledgerBalanceMinor } = {}) {
  const ledger = Number(ledgerBalanceMinor);
  const available = Number(availableBalanceMinor);
  const ok = Number.isSafeInteger(ledger) && Number.isSafeInteger(available) && ledger >= 0 && available >= 0 && available <= ledger;
  return { ok, ledgerBalanceMinor: ledger, availableBalanceMinor: available };
}

function walletLedgerInvariant(rows = []) {
  const seen = new Set();
  const violations = [];
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row?.transactionId || seen.has(String(row.transactionId))) violations.push(String(row?.transactionId || "missing"));
    seen.add(String(row?.transactionId || ""));
    if (!Number.isSafeInteger(Number(row?.amountMinor)) || Number(row.amountMinor) === 0) violations.push(String(row?.transactionId || "invalid"));
  }
  return { ok: violations.length === 0, violations };
}

function orderAmountInvariant(order, items = []) {
  if (!order) return { ok: false, reason: "order_missing" };
  const total = Number(order.total);
  const computed = (Array.isArray(items) ? items : []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
  const ok = Number.isFinite(total) && total >= 0 && Number.isFinite(computed) && Math.abs(total - computed) < 0.005;
  return { ok, total, computed: Number(computed.toFixed(2)) };
}

function refundCapInvariant(orderTotal, refunds = []) {
  const total = Number(orderTotal);
  const refunded = (Array.isArray(refunds) ? refunds : []).filter(r => ["pending", "processing", "processed"].includes(String(r.status))).reduce((sum, r) => sum + Number(r.amount || 0), 0);
  return { ok: Number.isFinite(total) && total >= 0 && refunded <= total + 0.005, orderTotal: total, reservedRefunds: Number(refunded.toFixed(2)) };
}

function webhookReplayDecision(existing, eventKey) {
  if (!eventKey || String(eventKey).length > 200) return { accept: false, reason: "invalid_event_key" };
  if (existing) return { accept: false, reason: "duplicate", priorOutcome: existing.outcome || null };
  return { accept: true, reason: "new" };
}

function notificationDedupeContract({ userId, dedupeKey } = {}) {
  const key = String(dedupeKey || "").trim();
  return { ok: Boolean(userId) && Boolean(key) && key.length <= 160, userId: userId == null ? null : String(userId), dedupeKey: key.slice(0, 160) };
}

function jobQueueHealth(rows = []) {
  const counts = { queued: 0, running: 0, completed: 0, failed: 0 };
  for (const row of Array.isArray(rows) ? rows : []) if (Object.prototype.hasOwnProperty.call(counts, row?.status)) counts[row.status]++;
  return { ok: counts.running < 1000 && counts.queued < 10000, counts };
}

function backupHealthGate(recovery) {
  if (!recovery || recovery.ok !== true) return { ok: false, reason: "recovery_unhealthy" };
  if (recovery.backups?.configured && recovery.backups?.freshness?.status === "fail") return { ok: false, reason: "backup_stale" };
  return { ok: true, reason: "healthy" };
}

function maintenanceLease({ holder, expiresAt, now = new Date() } = {}) {
  if (!holder || !expiresAt) return { active: false };
  const active = new Date(expiresAt).getTime() > new Date(now).getTime();
  return { active, holder: String(holder).slice(0, 100), expiresAt: String(expiresAt) };
}

function redactIncident(input = {}) {
  const json = JSON.stringify(input, (key, value) => /password|secret|token|authorization|cookie|api[_-]?key|providerreference/i.test(key) ? "[REDACTED]" : value);
  return JSON.parse(json);
}

function schemaFingerprint(db) {
  const rows = db.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE type IN ('table','index','trigger','view') ORDER BY type,name").all();
  const canonical = rows.map(r => `${r.type}|${r.name}|${r.tbl_name}|${r.sql || ""}`).join("\n");
  return crypto.createHash("sha256").update(canonical).digest("hex");
}

function databaseIntegrity(db) {
  const quick = db.prepare("PRAGMA quick_check").get();
  const foreignKeys = db.prepare("PRAGMA foreign_key_check").all();
  return { ok: String(Object.values(quick || {})[0]) === "ok" && foreignKeys.length === 0, quickCheck: String(Object.values(quick || {})[0]), foreignKeyViolations: foreignKeys.length };
}

function certification(results = []) {
  const list = Array.isArray(results) ? results : [];
  return { total: list.length, passed: list.filter(Boolean).length, ok: list.length === 25 && list.every(Boolean) };
}

module.exports = { MILESTONES, MAX_IDEMPOTENCY_KEY, DEFAULT_REPLAY_WINDOW_MS, MAX_JSON_BYTES, boundedIdempotencyKey, idempotencyReplayWindow, safeJsonBytes, criticalAuditEnvelope, assertOwnership, assertOpenAccount, sessionSecurityState, assertFreshAdmin, assertVendorRole, walletBalanceInvariant, walletLedgerInvariant, orderAmountInvariant, refundCapInvariant, webhookReplayDecision, notificationDedupeContract, jobQueueHealth, backupHealthGate, maintenanceLease, redactIncident, schemaFingerprint, databaseIntegrity, certification };
