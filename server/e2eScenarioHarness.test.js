"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const { runAll } = require("./e2eScenarioHarness");

test("Dami/Mall simulated E2E resolves cheapest top and preserves confirmation boundary", () => {
  const result = runAll();
  assert.equal(result.mall.product.id, "p_tee_4500");
  assert.equal(result.mall.product.currency, "NGN");
  assert.equal(result.commerce.order.status, "paid");
  assert.equal(result.state.notifications.some(n => n.event === "checkout.created"), true);
});

test("complete cross-module simulated E2E carries Mall -> payment -> refund -> notifications", () => {
  const result = runAll();
  const events = result.state.notifications.map(n => n.event);
  assert.deepEqual(events, ["mall.search", "checkout.created", "checkout.payment_initialized", "payment.verified", "refund.processed"]);
  assert.equal(result.payment.refund.amountMinor, 450000);
});

test("extension simulated E2E enforces consent, scope isolation and revocation", () => {
  const result = runAll();
  assert.equal(result.extension.extension.status, "revoked");
  assert.equal(result.extension.auditCount, 2);
  assert.equal(result.state.audit[0].metadata.scopes.includes("mall.read"), true);
});
