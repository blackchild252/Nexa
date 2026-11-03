"use strict";

const crypto = require("node:crypto");

const PROVIDER_STATUSES = Object.freeze(["initiated", "pending", "processing", "completed", "failed", "reversed", "cancelled", "unknown"]);
const STATUS_MAP = Object.freeze({
  created: "initiated", initialized: "initiated", initiated: "initiated",
  queued: "pending", pending: "pending", awaiting: "pending", awaiting_payment: "pending",
  processing: "processing", in_progress: "processing", inprogress: "processing",
  success: "completed", succeeded: "completed", paid: "completed", settled: "completed", completed: "completed",
  failed: "failed", error: "failed", declined: "failed", rejected: "failed",
  reversed: "reversed", refunded: "reversed", chargeback: "reversed",
  cancelled: "cancelled", canceled: "cancelled", abandoned: "cancelled",
});
const SAFE_ERRORS = Object.freeze({
  PROVIDER_NOT_CONFIGURED: { message: "Payment provider is not configured.", retryable: false },
  PROVIDER_ADAPTER_UNAVAILABLE: { message: "Payment provider adapter is unavailable.", retryable: false },
  PROVIDER_TIMEOUT: { message: "Payment provider did not respond in time.", retryable: true },
  PROVIDER_UNAVAILABLE: { message: "Payment provider is temporarily unavailable.", retryable: true },
  PROVIDER_REJECTED: { message: "Payment provider rejected the request.", retryable: false },
  PROVIDER_INVALID_RESPONSE: { message: "Payment provider returned an invalid response.", retryable: false },
  PROVIDER_ERROR: { message: "Payment provider request could not be completed.", retryable: false },
});
const READ_ONLY_OPERATIONS = new Set(["getTransactionStatus", "verifyDeposit", "verifyWithdrawal", "verifyAccount", "reconcile", "health"]);
const MUTATING_OPERATIONS = new Set(["createDeposit", "createWithdrawal", "createTransfer", "createBeneficiary"]);

function normalizeProviderStatus(value) {
  const raw = String(value || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
  return STATUS_MAP[raw] || (PROVIDER_STATUSES.includes(raw) ? raw : "unknown");
}
function isPlaceholder(value) {
  const v = String(value ?? "").trim();
  return !v || /^(?:your[_ -]?(?:key|secret|password|token)(?:[_ -]?here)?|change[_ -]?me|replace[_ -]?me|placeholder|<[^>]+>|example(?:[_ -].*)?|todo|xxx+)$/i.test(v);
}
function normalizeTimeout(value, fallback = 8000) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(30000, Math.max(1000, Math.floor(n))) : fallback;
}
function validIdempotencyKey(value) {
  return /^[A-Za-z0-9:_-]{8,128}$/.test(String(value || ""));
}
function canRetryProviderOperation({ operation, attempt = 0, maxAttempts = 3, idempotencyKey, supportsIdempotency = false } = {}) {
  if (!Number.isInteger(attempt) || attempt < 0 || attempt >= Math.max(1, Math.min(3, Number(maxAttempts) || 1)) - 1) return false;
  if (READ_ONLY_OPERATIONS.has(String(operation || ""))) return true;
  return MUTATING_OPERATIONS.has(String(operation || "")) && supportsIdempotency === true && validIdempotencyKey(idempotencyKey);
}
function normalizeSettlementReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (raw.length > 120 || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{2,119}$/.test(raw)) return null;
  return raw;
}
function classifyProviderHealth({ mode = "live", configured = false, adapterAvailable = false, outage = false, lastSuccessAt = null, now = Date.now(), staleAfterMs = 5 * 60 * 1000 } = {}) {
  const safeMode = String(mode || "").toLowerCase();
  if (safeMode === "sandbox") return "sandbox";
  if (outage) return "outage";
  if (!configured) return "blocked";
  if (!adapterAvailable) return "not_connected";
  const timestamp = lastSuccessAt == null ? NaN : new Date(lastSuccessAt).getTime();
  if (!Number.isFinite(timestamp) || timestamp > Number(now) || Number(now) - timestamp > Math.max(1000, Number(staleAfterMs) || 300000)) return "degraded";
  return "healthy";
}
function createTransactionReference(prefix = "NEXA", seed = crypto.randomBytes(12).toString("hex")) {
  const safePrefix = String(prefix || "NEXA").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "NEXA";
  const safeSeed = String(seed || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 40);
  if (safeSeed.length < 8) throw new Error("Transaction reference seed must contain at least 8 alphanumeric characters.");
  return `${safePrefix}-${safeSeed}`;
}
function normalizeProviderError(error) {
  const raw = String(error?.code || "").toUpperCase();
  const code = Object.hasOwn(SAFE_ERRORS, raw) ? raw : "PROVIDER_ERROR";
  const safe = SAFE_ERRORS[code];
  return Object.freeze({ code, message: safe.message, retryable: safe.retryable });
}
function validateProviderResult(result, expected = {}) {
  const issues = [];
  if (!result || typeof result !== "object" || Array.isArray(result)) return { valid: false, issues: ["invalid_response"] };
  const status = normalizeProviderStatus(result.status);
  if (status === "unknown") issues.push("unknown_status");
  if (status === "completed" && result.verified !== true && !(result.simulation === true && result.realFunds === false)) issues.push("completion_not_verified");
  if (expected.reference && String(result.reference || result.clientReference || "") !== String(expected.reference)) issues.push("reference_mismatch");
  if (expected.amountMinor != null && Number(result.amountMinor) !== Number(expected.amountMinor)) issues.push("amount_mismatch");
  if (expected.currency && String(result.currency || "").toUpperCase() !== String(expected.currency).toUpperCase()) issues.push("currency_mismatch");
  return { valid: issues.length === 0, issues, status };
}
async function withTimeout(invoke, timeoutMs = 8000) {
  const ms = normalizeTimeout(timeoutMs);
  let timer;
  try {
    return await Promise.race([
      Promise.resolve().then(invoke),
      new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error("timeout"), { code: "PROVIDER_TIMEOUT" })), ms); }),
    ]);
  } finally { if (timer) clearTimeout(timer); }
}
async function executeProviderOperation({ operation, invoke, input, timeoutMs = 8000, maxAttempts = 1, idempotencyKey, supportsIdempotency = false } = {}) {
  if (typeof invoke !== "function") return { ok: false, ...normalizeProviderError({ code: "PROVIDER_ADAPTER_UNAVAILABLE" }), attempts: 0 };
  const limit = Math.max(1, Math.min(3, Number(maxAttempts) || 1));
  let lastError;
  let attempts = 0;
  for (let attempt = 0; attempt < limit; attempt++) {
    attempts = attempt + 1;
    try {
      const result = await withTimeout(() => invoke(input, { idempotencyKey, attempt }), timeoutMs);
      const checked = validateProviderResult(result, input || {});
      if (!checked.valid) return { ok: false, ...normalizeProviderError({ code: "PROVIDER_INVALID_RESPONSE" }), issues: checked.issues, attempts: attempt + 1 };
      return { ok: true, result: { ...result, status: checked.status }, attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      if (!canRetryProviderOperation({ operation, attempt, maxAttempts: limit, idempotencyKey, supportsIdempotency })) break;
    }
  }
  return { ok: false, ...normalizeProviderError(lastError), attempts };
}

module.exports = { PROVIDER_STATUSES, READ_ONLY_OPERATIONS, MUTATING_OPERATIONS, normalizeProviderStatus, isPlaceholder, normalizeTimeout, validIdempotencyKey, canRetryProviderOperation, createTransactionReference, normalizeProviderError, validateProviderResult, normalizeSettlementReference, classifyProviderHealth, withTimeout, executeProviderOperation };
