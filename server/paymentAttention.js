"use strict";
// V5.98.4 / B142 — read-only payment attention report.
// The Paystack webhook acknowledges every final outcome with HTTP 200, so a payment that was captured but could not be
// applied (for example money arriving after an order was cancelled or expired) leaves only an outcome string in
// mall_payment_events. This module classifies those outcomes so an administrator can refund or reconcile them.
// It never writes, never returns request bodies or body hashes, and never changes webhook behaviour.

const OUTCOME_CATEGORY = Object.freeze({
  cancelled_order: "paid_after_cancellation",
  cancelled_ticket_order: "paid_after_cancellation",
  cancelled_kitchen_order: "paid_after_cancellation",
  unmatched: "payment_without_order",
  mismatch: "amount_or_status_mismatch",
  ticket_mismatch: "amount_or_status_mismatch",
  kitchen_mismatch: "amount_or_status_mismatch",
  vendor_mismatch: "amount_or_status_mismatch",
  wallet_topup_mismatch: "amount_or_status_mismatch",
  wallet_topup_not_found: "payment_without_order",
  payment_boundary_mismatch: "order_boundary_mismatch",
  ticket_boundary_mismatch: "order_boundary_mismatch",
  kitchen_boundary_mismatch: "order_boundary_mismatch",
  fee_pending: "fee_settlement_pending",
  vendor_activation_failed: "fulfilment_failed",
  unmatched_refund: "refund_without_record",
  refund_failed: "refund_failed",
});

const STALE_RECEIVED = "unfinished_event";
const DEFAULT_STALE_MINUTES = 15;
const MAX_LIMIT = 100;

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

function categoryFor(outcome, receivedAt, nowMs, staleMs) {
  const known = OUTCOME_CATEGORY[String(outcome || "")];
  if (known) return known;
  if (String(outcome || "") === "received") {
    const t = Date.parse(receivedAt);
    if (Number.isFinite(t) && nowMs - t >= staleMs) return STALE_RECEIVED;
  }
  return null;
}

function attentionReport(db, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date();
  const staleMinutes = clampInt(options.staleMinutes, DEFAULT_STALE_MINUTES, 1, 7 * 24 * 60);
  const limit = clampInt(options.limit, 50, 1, MAX_LIMIT);
  const offset = clampInt(options.offset, 0, 0, 100000);
  const nowMs = now.getTime();
  const staleMs = staleMinutes * 60 * 1000;
  const outcomes = [...Object.keys(OUTCOME_CATEGORY), "received"];
  const placeholders = outcomes.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT reference, eventType, outcome, receivedAt FROM mall_payment_events WHERE outcome IN (${placeholders}) ORDER BY receivedAt DESC`)
    .all(...outcomes);
  const items = [];
  const counts = {};
  for (const row of rows) {
    const category = categoryFor(row.outcome, row.receivedAt, nowMs, staleMs);
    if (!category) continue;
    counts[category] = (counts[category] || 0) + 1;
    items.push({ reference: String(row.reference || ""), eventType: String(row.eventType || ""), outcome: String(row.outcome), category, receivedAt: String(row.receivedAt) });
  }
  return {
    generatedAt: now.toISOString(),
    staleMinutes,
    total: items.length,
    counts,
    items: items.slice(offset, offset + limit),
    limit,
    offset,
  };
}

module.exports = { OUTCOME_CATEGORY, STALE_RECEIVED, DEFAULT_STALE_MINUTES, MAX_LIMIT, attentionReport };
