"use strict";

const crypto = require("node:crypto");

const MILESTONES = Object.freeze([
  [875, "release-identity-self-consistency"],
  [876, "production-strict-launch-gate"],
  [877, "persistent-db-path-boundary"],
  [878, "backup-destination-isolation"],
  [879, "restore-verification-contract"],
  [880, "schema-compatibility-contract"],
  [881, "migration-checksum-contract"],
  [882, "user-ownership-column-contract"],
  [883, "account-closure-coverage-contract"],
  [884, "retention-window-execution-bound"],
  [885, "session-token-format-contract"],
  [886, "authentication-enumeration-safety"],
  [887, "password-hash-cost-contract"],
  [888, "oauth-redirect-allowlist-contract"],
  [889, "webhook-event-identity-contract"],
  [890, "webhook-outcome-terminality-contract"],
  [891, "payment-reconciliation-drift-contract"],
  [892, "refund-transition-contract"],
  [893, "inventory-reservation-expiry-contract"],
  [894, "extension-key-rotation-contract"],
  [895, "extension-capability-audit-contract"],
  [896, "ai-input-resource-bound"],
  [897, "ai-action-replay-boundary"],
  [898, "client-session-recovery-contract"],
  [899, "v5-61-cumulative-launch-certification"],
]);

const MAX_DB_PATH = 500;
const MAX_MIGRATION_HASH = 128;
const MAX_AI_INPUT_BYTES = 64 * 1024;
const MAX_REDIRECTS = 8;

function releaseIdentity({ version, batch, packageVersion = version, archiveName = "" } = {}) {
  const v = String(version || "");
  const b = String(batch || "");
  const expected = `NEXA-V${v}-${b}.zip`;
  return { ok: /^\d+\.\d+\.\d+$/.test(v) && /^B\d+$/.test(b) && packageVersion === v && archiveName === expected, version: v, batch: b, expectedArchive: expected };
}

function strictLaunchGate(env = {}) {
  const production = String(env.NODE_ENV || "").toLowerCase() === "production";
  const strict = String(env.NEXA_STRICT_LAUNCH || "") === "1";
  return { production, strict, blocked: production && strict && String(env.NEXA_LAUNCH_CERTIFIED || "") !== "1" };
}

function persistentDbPath(value) {
  const p = String(value || "").trim();
  return { ok: Boolean(p) && p.length <= MAX_DB_PATH && !/[\0\r\n]/.test(p), path: p.slice(0, MAX_DB_PATH) };
}

function backupDestination(sourcePath, destinationPath) {
  const source = String(sourcePath || "");
  const destination = String(destinationPath || "");
  const ok = Boolean(source && destination) && source !== destination && !destination.startsWith(source + "/") && !source.startsWith(destination + "/");
  return { ok, source, destination };
}

function restoreVerification({ integrity, requiredTablesPresent, schemaHashMatches }) {
  return { ok: integrity === "ok" && requiredTablesPresent === true && schemaHashMatches === true };
}

function schemaCompatibility(actual, expected) {
  const a = String(actual || "");
  const e = String(expected || "");
  return { ok: Boolean(a && e && a === e), actual: a, expected: e };
}

function migrationChecksum(sql, expectedHash) {
  const hash = crypto.createHash("sha256").update(String(sql || ""), "utf8").digest("hex");
  const expected = String(expectedHash || "").toLowerCase();
  return { ok: /^[a-f0-9]{64}$/.test(expected) && crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(expected)), hash };
}

function ownershipColumnContract(columns = []) {
  const set = new Set(Array.isArray(columns) ? columns.map(String) : []);
  return { ok: set.has("userId"), hasUserId: set.has("userId") };
}

function accountClosureCoverage(deleteTables = [], expectedTables = []) {
  const actual = new Set((Array.isArray(deleteTables) ? deleteTables : []).map(String));
  const missing = (Array.isArray(expectedTables) ? expectedTables : []).filter((t) => !actual.has(String(t)));
  return { ok: missing.length === 0, missing };
}

function retentionExecutionBound(days, maxDays) {
  const n = Number(days);
  const max = Math.max(1, Number(maxDays) || 1);
  return { ok: Number.isInteger(n) && n >= 1 && n <= max, days: n, maxDays: max };
}

function sessionTokenFormat(token) {
  const t = String(token || "");
  return { ok: /^[a-f0-9]{64}$/.test(t), length: t.length };
}

function authenticationMessageSafe(message) {
  const m = String(message || "").toLowerCase();
  return !/(email exists|account exists|user exists|no such email|unknown email)/i.test(m);
}

function passwordHashCost(hash, minimumCost = 10) {
  const m = /^\$2[aby]?\$(\d{2})\$/.exec(String(hash || ""));
  const cost = m ? Number(m[1]) : 0;
  return { ok: cost >= Number(minimumCost), cost };
}

function oauthRedirectAllowed(target, allowed = []) {
  try {
    const url = new URL(String(target || ""));
    const list = Array.isArray(allowed) ? allowed.map(String) : [];
    return { ok: url.protocol === "https:" && list.includes(url.origin + url.pathname), origin: url.origin, path: url.pathname };
  } catch (_) { return { ok: false, origin: null, path: null }; }
}

function webhookEventIdentity({ eventId, reference, bodyHash }) {
  const id = String(eventId || "").trim();
  const ref = String(reference || "").trim();
  const hash = String(bodyHash || "").trim().toLowerCase();
  return { ok: Boolean(id || hash) && Boolean(ref) && /^[a-f0-9]{64}$/.test(hash) || Boolean(id && ref), eventId: id, reference: ref, bodyHash: hash };
}

function webhookOutcomeTerminality(outcome) {
  return { terminal: !["received", "vendor_activation_failed"].includes(String(outcome || "")), outcome: String(outcome || "") };
}

function reconciliationDrift(actual, expected, tolerance = 0) {
  const a = Number(actual), e = Number(expected), t = Math.max(0, Number(tolerance) || 0);
  return { ok: Number.isFinite(a) && Number.isFinite(e) && Math.abs(a - e) <= t, delta: Number.isFinite(a) && Number.isFinite(e) ? a - e : null, tolerance: t };
}

function refundTransitionAllowed(from, to) {
  const transitions = { pending: new Set(["pending", "processing", "failed"]), processing: new Set(["processing", "processed", "failed"]), processed: new Set(["processed"]), failed: new Set(["failed", "processing"]) };
  return Boolean(transitions[String(from || "")]?.has(String(to || "")));
}

function inventoryReservationExpiry(expiresAt, now = Date.now(), maxAgeMs = 30 * 60 * 1000) {
  const exp = new Date(expiresAt).getTime();
  const age = exp - Number(now);
  return { ok: Number.isFinite(exp) && age >= 0 && age <= Math.max(1000, Number(maxAgeMs) || 1), remainingMs: Number.isFinite(exp) ? age : null };
}

function extensionKeyRotation(oldKey, newKey) {
  const a = String(oldKey || "");
  const b = String(newKey || "");
  return { ok: /^[A-Za-z0-9._:-]{24,256}$/.test(b) && a !== b, changed: a !== b };
}

function extensionCapabilityAudit({ extensionId, userId, scope, action }) {
  return { ok: [extensionId, userId, scope, action].every((v) => String(v || "").trim().length > 0), extensionId: String(extensionId || "").slice(0,160), userId: String(userId || "").slice(0,160), scope: String(scope || "").slice(0,100), action: String(action || "").slice(0,100) };
}

function aiInputResourceBound(value, maxBytes = MAX_AI_INPUT_BYTES) {
  const bytes = Buffer.byteLength(String(value == null ? "" : value), "utf8");
  return { ok: bytes <= Math.max(1024, Number(maxBytes) || MAX_AI_INPUT_BYTES), bytes, maxBytes: Math.max(1024, Number(maxBytes) || MAX_AI_INPUT_BYTES) };
}

function aiActionReplayBoundary({ actionId, userId, consumedAt }) {
  return { ok: Boolean(String(actionId || "").trim()) && Boolean(String(userId || "").trim()) && !consumedAt, replayed: Boolean(consumedAt) };
}

function clientSessionRecovery({ status, hasToken, retried }) {
  const code = Number(status);
  const recoverable = [401, 419].includes(code);
  return { recoverable, shouldReauth: recoverable && !hasToken, retried: Boolean(retried) };
}

module.exports = {
  MILESTONES, MAX_DB_PATH, MAX_MIGRATION_HASH, MAX_AI_INPUT_BYTES, MAX_REDIRECTS,
  releaseIdentity, strictLaunchGate, persistentDbPath, backupDestination, restoreVerification,
  schemaCompatibility, migrationChecksum, ownershipColumnContract, accountClosureCoverage,
  retentionExecutionBound, sessionTokenFormat, authenticationMessageSafe, passwordHashCost,
  oauthRedirectAllowed, webhookEventIdentity, webhookOutcomeTerminality, reconciliationDrift,
  refundTransitionAllowed, inventoryReservationExpiry, extensionKeyRotation,
  extensionCapabilityAudit, aiInputResourceBound, aiActionReplayBoundary, clientSessionRecovery,
};
