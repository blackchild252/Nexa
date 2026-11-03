"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { compareProviderReconciliation } = require("./providerReconciliationDiff");
const row = (reference, overrides = {}) => ({ reference, amount: 100, currency: "NGN", status: "completed", ...overrides });

test("provider reconciliation detects missing, duplicate, amount, currency, status and settlement mismatches without mutations", () => {
  const result = compareProviderReconciliation({
    internalRows: [row("missing"), row("dup"), row("dup"), row("amount"), row("currency"), row("status"), row("settle")],
    providerRows: [row("dup"), row("amount", { amount: 90 }), row("currency", { currency: "USD" }), row("status", { status: "pending" }), row("settle")],
    settlementByReference: { settle: { reference: "settle", amount: 99 } },
  });
  const types = new Set(result.findings.map(x => x.type));
  for (const type of ["missing_provider_transaction", "duplicate_internal_reference", "amount_mismatch", "currency_mismatch", "status_mismatch", "settlement_mismatch"]) assert.ok(types.has(type), type);
  assert.equal(result.mode, "review_only");
  assert.equal(result.automaticChanges, false);
});

test("duplicate provider references and provider-only transactions are exceptions, not auto-applied", () => {
  const result = compareProviderReconciliation({ internalRows: [row("a")], providerRows: [row("a"), row("a"), row("external")] });
  assert.ok(result.findings.some(x => x.type === "duplicate_provider_reference"));
  assert.ok(result.findings.some(x => x.type === "unmatched_provider_transaction" && x.reference === "external"));
  assert.ok(result.findings.every(x => x.actionable === false));
});

test("invalid references and unsafe amount values are never treated as matches", () => {
  const result = compareProviderReconciliation({ internalRows: [{ ...row(""), amount: -1 }], providerRows: [{ ...row(""), amount: "NaN" }] });
  assert.equal(result.findings.filter(x => x.type === "invalid_reference").length, 2);
  assert.equal(result.automaticChanges, false);
});


test("missing, boolean, excessive-precision and unsafe monetary values cannot reconcile as equal", () => {
  const cases = [
    { internal: null, provider: 0 },
    { internal: "", provider: 0 },
    { internal: false, provider: 0 },
    { internal: "100.005", provider: 100 },
    { internal: 90071992547410, provider: 90071992547410 },
    { internal: "NaN", provider: 0 },
  ];
  for (const [index, values] of cases.entries()) {
    const result = compareProviderReconciliation({
      internalRows: [row(`precision-${index}`, { amount: values.internal })],
      providerRows: [row(`precision-${index}`, { amount: values.provider })],
    });
    assert.ok(result.findings.some(f => f.type === "amount_mismatch"), `case ${index}`);
    assert.equal(result.automaticChanges, false);
  }
});
