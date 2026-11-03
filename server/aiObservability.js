"use strict";

const SENSITIVE_KEYS = new Set([
  "apikey", "api_key", "authorization", "token", "access_token", "refresh_token",
  "password", "secret", "cookie", "email", "phone", "address", "imagebase64", "audio",
]);

function redactValue(key, value) {
  const normalized = String(key || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  if (SENSITIVE_KEYS.has(normalized)) return "[redacted]";
  if (typeof value === "string") return value.slice(0, 120);
  if (typeof value === "number" || typeof value === "boolean" || value == null) return value;
  return "[omitted]";
}

function safeAiEvent(event = {}) {
  const allowed = ["event", "provider", "model", "profileId", "profileVersion", "evaluationState", "correlationId", "success", "latencyMs", "route", "reason"];
  const out = {};
  for (const key of allowed) if (Object.prototype.hasOwnProperty.call(event, key)) out[key] = redactValue(key, event[key]);
  if (!out.event) out.event = "ai.request";
  return Object.freeze(out);
}

function createAiTelemetry({ captureMessage } = {}) {
  const counters = new Map();
  const capture = typeof captureMessage === "function" ? captureMessage : null;
  return {
    record(event = {}) {
      const safe = safeAiEvent(event);
      const key = `${safe.event}:${safe.provider || "unknown"}:${safe.success === false ? "error" : "ok"}`;
      counters.set(key, (counters.get(key) || 0) + 1);
      if (capture) capture(JSON.stringify(safe), safe.success === false ? "error" : "info");
      return safe;
    },
    snapshot() { return Object.freeze(Object.fromEntries(counters)); },
  };
}

module.exports = { safeAiEvent, createAiTelemetry };
