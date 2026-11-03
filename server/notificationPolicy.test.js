"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const policy = require("./notificationPolicy");

test("notification policy normalizes categories and priorities to allowlists", () => {
  assert.equal(policy.normalizeCategory("money"), "financial");
  assert.equal(policy.normalizeCategory("customer_care"), "customerCare");
  assert.equal(policy.normalizeCategory("untrusted-value"), "system");
  assert.equal(policy.normalizePriority("CRITICAL"), "critical");
  assert.equal(policy.normalizePriority("urgent-admin"), "normal");
});
test("notification channel normalization never enables unspecified channels", () => {
  assert.deepEqual(policy.normalizeChannels({ push: true, email: "yes", sms: false }), { inApp: false, push: true, email: false, sms: false });
});
test("provider readiness exposes booleans only and requires both email/SMS settings", () => {
  assert.deepEqual(policy.providerReadiness({ EXPO_ACCESS_TOKEN: "p", NEXA_EMAIL_PROVIDER_URL: "u", NEXA_EMAIL_PROVIDER_TOKEN: "t", NEXA_SMS_PROVIDER_URL: "u" }), { push: true, email: true, sms: false });
});
test("delivery policy respects user opt-out and provider readiness even during quiet hours", () => {
  assert.equal(policy.deliveryDecision({ category: "security", priority: "critical", channel: "push", enabled: false, quiet: true, providerReady: true }).reason, "preference_disabled");
  assert.equal(policy.deliveryDecision({ category: "financial", priority: "high", channel: "email", enabled: true, quiet: true, providerReady: false }).reason, "provider_not_ready");
  assert.equal(policy.deliveryDecision({ category: "security", priority: "critical", channel: "inApp", enabled: true, quiet: true }).allowed, true);
  assert.equal(policy.deliveryDecision({ category: "social", priority: "normal", channel: "push", enabled: true, quiet: true, providerReady: true }).reason, "quiet_hours");
});
