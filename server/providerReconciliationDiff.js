"use strict";

const clean = value => typeof value === "string" ? value.trim() : "";
function cents(value) {
  // Provider/ledger reconciliation must never round malformed monetary input into a match.
  if (typeof value !== "number" && typeof value !== "string") return null;
  const raw = String(value).trim();
  if (!raw || !/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const minor = amount * 100;
  if (!Number.isSafeInteger(minor)) return null;
  return minor;
}

/** Compare normalized internal ledger rows with provider settlement rows. Findings are review-only: this module never mutates money or marks a payment settled. */
function compareProviderReconciliation({ internalRows = [], providerRows = [], settlementByReference = {} } = {}) {
  const internal = Array.isArray(internalRows) ? internalRows : [];
  const provider = Array.isArray(providerRows) ? providerRows : [];
  const findings = [];
  const byRef = rows => {
    const map = new Map();
    for (const row of rows) {
      const ref = clean(row?.reference);
      if (!ref) { findings.push({ type: "invalid_reference", side: rows === internal ? "internal" : "provider", actionable: false }); continue; }
      const list = map.get(ref) || []; list.push(row); map.set(ref, list);
    }
    return map;
  };
  const internalMap = byRef(internal);
  const providerMap = byRef(provider);
  for (const [reference, rows] of providerMap) {
    if (rows.length > 1) findings.push({ type: "duplicate_provider_reference", reference, count: rows.length, actionable: false });
  }
  for (const [reference, rows] of internalMap) {
    if (!providerMap.has(reference)) findings.push({ type: "missing_provider_transaction", reference, actionable: false });
    if (rows.length > 1) findings.push({ type: "duplicate_internal_reference", reference, count: rows.length, actionable: false });
  }
  for (const [reference, internalRowsForRef] of internalMap) {
    const providerRowsForRef = providerMap.get(reference) || [];
    if (internalRowsForRef.length !== 1 || providerRowsForRef.length !== 1) continue;
    const a = internalRowsForRef[0], b = providerRowsForRef[0];
    if (cents(a.amount) === null || cents(b.amount) === null || cents(a.amount) !== cents(b.amount)) findings.push({ type: "amount_mismatch", reference, actionable: false });
    if (clean(a.currency).toUpperCase() !== clean(b.currency).toUpperCase() || !clean(a.currency) || !clean(b.currency)) findings.push({ type: "currency_mismatch", reference, actionable: false });
    if (clean(a.status).toLowerCase() !== clean(b.status).toLowerCase() || !clean(a.status) || !clean(b.status)) findings.push({ type: "status_mismatch", reference, actionable: false });
    const settlement = settlementByReference && typeof settlementByReference === "object" ? settlementByReference[reference] : null;
    if (settlement) {
      if (clean(settlement.reference) !== reference || cents(settlement.amount) === null || cents(settlement.amount) !== cents(b.amount)) findings.push({ type: "settlement_mismatch", reference, actionable: false });
    }
  }
  for (const reference of providerMap.keys()) if (!internalMap.has(reference)) findings.push({ type: "unmatched_provider_transaction", reference, actionable: false });
  return { ok: true, mode: "review_only", automaticChanges: false, internalCount: internal.length, providerCount: provider.length, findings };
}

module.exports = { compareProviderReconciliation };
