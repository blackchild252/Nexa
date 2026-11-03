"use strict";

const CATEGORIES = Object.freeze([
  "security", "financial", "customerCare", "dami", "marketplace", "social", "chat", "marketing", "system",
]);
const PRIORITIES = Object.freeze(["low", "normal", "high", "critical"]);
const CHANNELS = Object.freeze(["inApp", "push", "email", "sms"]);
const CATEGORY_ALIASES = Object.freeze({
  money: "financial", payments: "financial", wallet: "financial",
  support: "customerCare", customer_care: "customerCare", help: "customerCare",
  assistant: "dami", ai: "dami", marketplace: "marketplace", social: "social", chat: "chat",
  promo: "marketing", marketing: "marketing", security: "security", system: "system",
});

function normalizeCategory(value) {
  const raw = String(value || "system").trim();
  const alias = CATEGORY_ALIASES[raw.toLowerCase()];
  const category = alias || raw;
  return CATEGORIES.includes(category) ? category : "system";
}
function normalizePriority(value) {
  const priority = String(value || "normal").trim().toLowerCase();
  return PRIORITIES.includes(priority) ? priority : "normal";
}
function normalizeChannels(input) {
  const source = input && typeof input === "object" && !Array.isArray(input) ? input : {};
  return Object.fromEntries(CHANNELS.map((channel) => [channel, source[channel] === true]));
}
function providerReadiness(env = process.env) {
  // Expose only readiness booleans; never return credential values or raw env names.
  return Object.freeze({
    push: Boolean(String(env.EXPO_ACCESS_TOKEN || "").trim()),
    email: Boolean(String(env.NEXA_EMAIL_PROVIDER_URL || "").trim() && String(env.NEXA_EMAIL_PROVIDER_TOKEN || "").trim()),
    sms: Boolean(String(env.NEXA_SMS_PROVIDER_URL || "").trim() && String(env.NEXA_SMS_PROVIDER_TOKEN || "").trim()),
  });
}
function deliveryDecision({ category, priority, channel, enabled = true, quiet = false, providerReady = true } = {}) {
  const safeCategory = normalizeCategory(category);
  const safePriority = normalizePriority(priority);
  const safeChannel = CHANNELS.includes(String(channel)) ? String(channel) : "inApp";
  if (!enabled) return { allowed: false, reason: "preference_disabled", category: safeCategory, priority: safePriority, channel: safeChannel };
  if (safeChannel !== "inApp" && !providerReady) return { allowed: false, reason: "provider_not_ready", category: safeCategory, priority: safePriority, channel: safeChannel };
  if (quiet && safePriority !== "critical") return { allowed: false, reason: "quiet_hours", category: safeCategory, priority: safePriority, channel: safeChannel };
  return { allowed: true, reason: "eligible", category: safeCategory, priority: safePriority, channel: safeChannel };
}
module.exports = { CATEGORIES, PRIORITIES, CHANNELS, normalizeCategory, normalizePriority, normalizeChannels, providerReadiness, deliveryDecision };
