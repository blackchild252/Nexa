"use strict";

const DEFAULTS = Object.freeze({ timeoutMs: 30000, maxAttempts: 2, maxOutputTokens: 1200 });

function boundedInt(value, min, max, fallback) {
  const n = Number(value);
  return Number.isInteger(n) && n >= min && n <= max ? n : fallback;
}

function getDamiProviderPolicy(env = process.env) {
  return Object.freeze({
    timeoutMs: boundedInt(env.DAMI_PROVIDER_TIMEOUT_MS, 5000, 60000, DEFAULTS.timeoutMs),
    maxAttempts: boundedInt(env.DAMI_PROVIDER_MAX_ATTEMPTS, 1, 3, DEFAULTS.maxAttempts),
    maxOutputTokens: boundedInt(env.DAMI_MAX_OUTPUT_TOKENS, 256, 4000, DEFAULTS.maxOutputTokens),
    allowActionFallback: String(env.DAMI_ALLOW_ACTION_FALLBACK || "false").toLowerCase() === "true",
  });
}

function canRetryAction(policy, attempt) {
  return Boolean(policy?.allowActionFallback) && Number(attempt) < Number(policy?.maxAttempts || DEFAULTS.maxAttempts);
}

module.exports = { DEFAULTS, getDamiProviderPolicy, canRetryAction };
