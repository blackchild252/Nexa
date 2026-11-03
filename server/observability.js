"use strict";

const { captureException, captureMessage } = require("./sentry");

const SEVERITIES = Object.freeze(["info", "warning", "error", "critical"]);
const SECRET_KEY = /(?:password|passwd|secret|token|authorization|cookie|credential|api[-_]?key|private[-_]?key|recovery[-_]?proof|otp|email|phone|mobile|address|message|body|content|query|prompt)/i;
const SECRET_VALUE = /(?:bearer\s+[a-z0-9._~+\/-]+=*|(?:sk|pk|rk)-[_a-z0-9-]{12,}|(?:ghp|github_pat|xox[baprs])[_-][a-z0-9_-]{12,}|-----BEGIN [A-Z ]*PRIVATE KEY-----)/i;
const MAX_METADATA_DEPTH = 4;
const MAX_METADATA_KEYS = 40;
const MAX_STRING_LENGTH = 240;

function sanitizeMetadata(value, depth = 0) {
  if (depth > MAX_METADATA_DEPTH) return "[TRUNCATED]";
  if (value == null || typeof value === "boolean" || (typeof value === "number" && Number.isFinite(value))) return value;
  if (typeof value === "string") {
    const bounded = value.replace(/[\u0000-\u001f\u007f]/g, " ").slice(0, MAX_STRING_LENGTH);
    return SECRET_VALUE.test(bounded) ? "[REDACTED]" : bounded;
  }
  if (Array.isArray(value)) return value.slice(0, MAX_METADATA_KEYS).map((item) => sanitizeMetadata(item, depth + 1));
  if (typeof value !== "object") return "[OMITTED]";
  const out = {};
  for (const key of Object.keys(value).slice(0, MAX_METADATA_KEYS)) {
    if (SECRET_KEY.test(key)) { out[String(key).slice(0, 80)] = "[REDACTED]"; continue; }
    out[String(key).slice(0, 80)] = sanitizeMetadata(value[key], depth + 1);
  }
  return out;
}

function normalizeOperationalEvent(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) input = {};
  const severity = SEVERITIES.includes(String(input.severity)) ? String(input.severity) : "info";
  return {
    severity,
    action: String(input.action || "unknown").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 100),
    domain: String(input.domain || "platform").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 60),
    requestId: /^[A-Za-z0-9._:-]{1,100}$/.test(String(input.requestId || "")) ? String(input.requestId) : null,
    metadata: input.metadata && typeof input.metadata === "object" && !Array.isArray(input.metadata) ? sanitizeMetadata(input.metadata) : {},
  };
}

function reportOperationalEvent(event) {
  const normalized = normalizeOperationalEvent(event);
  const level = normalized.severity === "critical" || normalized.severity === "error" ? "error" : normalized.severity;
  captureMessage(`[${normalized.domain}] ${normalized.action}`, level);
  return normalized;
}

function safeException(error) {
  const name = error && typeof error.name === "string" && /^[A-Za-z][A-Za-z0-9]{0,49}$/.test(error.name) ? error.name : "Error";
  const safe = new Error("Operational exception details redacted");
  safe.name = name;
  return safe;
}

function reportException(error, context = {}) {
  return captureException(safeException(error), normalizeOperationalEvent(context));
}

module.exports = { SEVERITIES, sanitizeMetadata, normalizeOperationalEvent, safeException, reportOperationalEvent, reportException };
