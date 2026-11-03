"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { normalizeListing, reviewDecision } = require("./extensionCatalog");
const { normalizeOperationalEvent } = require("./observability");
const { normalizePlan, safetySummary } = require("./damiPlanning");
const { listFeatures, canStart } = require("./futureFeatures");

test("extension catalog normalizes listings and keeps high-risk publishing gated", () => {
  const listing = normalizeListing({ title: "Money Helper", categories: ["Finance", "finance"], requestedScopes: ["money.read", "chat.read"] });
  assert.deepEqual(listing.categories, ["finance"]);
  assert.equal(reviewDecision(listing, { developerVerified: false }).status, "review");
  assert.equal(reviewDecision(listing, { developerVerified: true }).status, "published");
});

test("observability normalizes operational events", () => {
  const event = normalizeOperationalEvent({ severity: "critical", action: "payment.failed", domain: "money", metadata: { token: "never-log" } });
  assert.equal(event.severity, "critical");
  assert.equal(event.action, "payment.failed");
});

test("Dami planning exposes cross-module and confirmation requirements", () => {
  const plan = normalizePlan({ goal: "Buy and notify", steps: [{ intent: "marketplace.purchase", requiresConfirmation: true }, { intent: "notifications.send" }] });
  assert.equal(safetySummary(plan).crossModule, true);
  assert.equal(safetySummary(plan).requiresConfirmation, true);
});

test("future features remain dependency-gated candidates", () => {
  assert.ok(listFeatures().length >= 4);
  assert.equal(canStart("merchant-tools", ["auth", "payments", "notifications"]), false);
  assert.equal(canStart("merchant-tools", ["auth", "payments", "notifications", "operations"]), true);
});
