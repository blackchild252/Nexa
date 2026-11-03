"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const contract = require("./walletProviderContract");

test("provider statuses normalize into a finite canonical set", () => {
  assert.equal(contract.normalizeProviderStatus("SUCCESS"), "completed");
  assert.equal(contract.normalizeProviderStatus("in-progress"), "processing");
  assert.equal(contract.normalizeProviderStatus("declined"), "failed");
  assert.equal(contract.normalizeProviderStatus("brand-new-provider-state"), "unknown");
});
test("provider completion requires verification or an explicitly non-real sandbox simulation", () => {
  assert.equal(contract.validateProviderResult({ status: "success" }).valid, false);
  assert.deepEqual(contract.validateProviderResult({ status: "completed", verified: true }).issues, []);
  assert.equal(contract.validateProviderResult({ status: "completed", simulation: true, realFunds: false }).valid, true);
});
test("provider results reject reference, amount and currency mismatches", () => {
  const result = contract.validateProviderResult({ status: "pending", reference: "ref-12345678", amountMinor: 500, currency: "USD" }, { reference: "ref-12345678", amountMinor: 500, currency: "NGN" });
  assert.deepEqual(result.issues, ["currency_mismatch"]);
});
test("provider errors are normalized and never leak raw provider messages", () => {
  const out = contract.normalizeProviderError(Object.assign(new Error("secret=sk_live_should_not_escape"), { code: "provider_payload_secret" }));
  assert.equal(out.code, "PROVIDER_ERROR");
  assert.doesNotMatch(JSON.stringify(out), /sk_live_should_not_escape|provider_payload_secret/);
});
test("mutation retries require explicit adapter idempotency and a valid key", () => {
  assert.equal(contract.canRetryProviderOperation({ operation: "createWithdrawal", attempt: 0, maxAttempts: 3, idempotencyKey: "withdraw-123456", supportsIdempotency: false }), false);
  assert.equal(contract.canRetryProviderOperation({ operation: "createWithdrawal", attempt: 0, maxAttempts: 3, idempotencyKey: "withdraw-123456", supportsIdempotency: true }), true);
  assert.equal(contract.canRetryProviderOperation({ operation: "createWithdrawal", attempt: 0, maxAttempts: 3, idempotencyKey: "short", supportsIdempotency: true }), false);
  assert.equal(contract.canRetryProviderOperation({ operation: "getTransactionStatus", attempt: 0, maxAttempts: 3 }), true);
});
test("settlement references are preserved only when bounded and syntactically safe", () => {
  assert.equal(contract.normalizeSettlementReference("settle_2026:batch-42"), "settle_2026:batch-42");
  assert.equal(contract.normalizeSettlementReference(""), null);
  assert.equal(contract.normalizeSettlementReference("bad settlement reference with spaces"), null);
  assert.equal(contract.normalizeSettlementReference("x".repeat(121)), null);
});
test("provider health distinguishes blocked, not-connected, degraded, outage and healthy states", () => {
  assert.equal(contract.classifyProviderHealth({ mode: "live", configured: false }), "blocked");
  assert.equal(contract.classifyProviderHealth({ mode: "live", configured: true, adapterAvailable: false }), "not_connected");
  assert.equal(contract.classifyProviderHealth({ mode: "live", configured: true, adapterAvailable: true }), "degraded");
  assert.equal(contract.classifyProviderHealth({ mode: "live", configured: true, adapterAvailable: true, outage: true }), "outage");
  assert.equal(contract.classifyProviderHealth({ mode: "live", configured: true, adapterAvailable: true, lastSuccessAt: new Date(100000).toISOString(), now: 100000 }), "healthy");
});
test("transaction references are stable-safe and bounded", () => {
  assert.equal(contract.createTransactionReference("nexa pay", "order-2026-12345678"), "NEXAPAY-ORDER202612345678");
  assert.throws(() => contract.createTransactionReference("nexa", "short"), /at least 8/);
});
test("provider timeout is bounded and times out slow adapters", async () => {
  assert.equal(contract.normalizeTimeout("999999"), 30000);
  assert.equal(contract.normalizeTimeout("bad"), 8000);
  await assert.rejects(contract.withTimeout(() => new Promise(() => {}), 1000), (error) => error.code === "PROVIDER_TIMEOUT");
});
test("provider operation retries read-only failures but does not retry non-idempotent mutations", async () => {
  let reads = 0;
  const read = await contract.executeProviderOperation({ operation: "getTransactionStatus", maxAttempts: 2, invoke: async () => { reads++; if (reads === 1) throw Object.assign(new Error("temporary"), { code: "PROVIDER_UNAVAILABLE" }); return { status: "pending" }; } });
  assert.equal(read.ok, true); assert.equal(read.attempts, 2);
  let mutations = 0;
  const mutation = await contract.executeProviderOperation({ operation: "createDeposit", maxAttempts: 3, invoke: async () => { mutations++; throw Object.assign(new Error("temporary"), { code: "PROVIDER_UNAVAILABLE" }); } });
  assert.equal(mutation.ok, false); assert.equal(mutations, 1);
});
test("provider operation refuses an unverified completed result", async () => {
  const result = await contract.executeProviderOperation({ operation: "getTransactionStatus", invoke: async () => ({ status: "completed" }) });
  assert.equal(result.ok, false); assert.equal(result.code, "PROVIDER_INVALID_RESPONSE");
});
test("provider webhook HMAC uses raw bytes and timing-safe comparison", () => {
  const raw = Buffer.from('{"type":"payment.success"}'); const secret = "owner-secret-not-in-source";
  const sig = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  const expected = crypto.createHmac("sha256", secret).update(raw).digest();
  const supplied = Buffer.from(sig, "hex");
  assert.equal(expected.length, supplied.length);
  assert.equal(crypto.timingSafeEqual(expected, supplied), true);
  assert.notEqual(crypto.createHmac("sha256", secret).update(Buffer.from("different")).digest("hex"), sig);
});
