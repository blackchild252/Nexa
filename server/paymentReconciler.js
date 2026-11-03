"use strict";
// V5.98.5 / B143 — background re-verification of stale Kitchen and Yaayz orders.
//
// Normally the Paystack webhook, or the customer's app calling the verify route, moves an order from
// `pending_payment` to `paid`. If both are missed (webhook never delivered, app closed before verifying) the order
// stays pending although the customer paid. This job asks Paystack about such orders, re-checks reference, currency
// and amount with the same matcher the webhook uses, and confirms the order with the same guarded UPDATE.
//
// Safety properties:
//  * Only orders older than `minAgeMinutes` are checked, so a customer still in checkout is not disturbed.
//  * Confirmation uses `WHERE status='pending_payment' AND paymentRef=?`, so it cannot double-apply or race the webhook.
//  * A cancelled order is never reopened. If Paystack says it was paid, the event is recorded with the existing
//    `cancelled_*_order` outcome so the V5.98.4 attention report lists it for refund.
//  * Amount or currency mismatches are recorded with the existing `*_mismatch` outcomes and never confirmed.
//  * Provider errors do not consume an attempt; the tick stops after a few consecutive provider errors.
//  * Per-reference state lives in mall_payment_events (eventKey `reconcile:<reference>`), so no schema change.
//  * Checks back off (15m, 30m, 1h, 2h, 4h, 8h) and then give up, bounding Paystack calls.

const OUTCOME = Object.freeze({
  WAITING: "reconcile_waiting",
  GAVE_UP: "reconcile_gave_up",
  KITCHEN_CONFIRMED: "reconciled_kitchen_confirmed",
  TICKET_CONFIRMED: "reconciled_ticket_confirmed",
  KITCHEN_ALREADY: "reconciled_kitchen_already_paid",
  TICKET_ALREADY: "reconciled_ticket_already_paid",
  KITCHEN_CANCELLED: "cancelled_kitchen_order",
  TICKET_CANCELLED: "cancelled_ticket_order",
  KITCHEN_MISMATCH: "kitchen_mismatch",
  TICKET_MISMATCH: "ticket_mismatch",
  TOPUP_CREDITED: "reconciled_wallet_topup_credited",
  TOPUP_ALREADY: "reconciled_wallet_topup_already_credited",
  TOPUP_MISMATCH: "wallet_topup_mismatch",
});

const DEFAULTS = Object.freeze({
  minAgeMinutes: 15,
  maxAgeHours: 48,
  maxAttempts: 6,
  maxChecksPerTick: 20,
  maxConsecutiveProviderErrors: 3,
  baseBackoffMinutes: 15,
});

const KEY_PREFIX = "reconcile:";
const EVENT_TYPE_PREFIX = "reconcile.check.";
const FLAGGED_BY_WEBHOOK = ["cancelled_kitchen_order", "cancelled_ticket_order", "kitchen_mismatch", "ticket_mismatch"];

function clampInt(value, fallback, min, max) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

// better-sqlite3 has db.transaction(fn); node:sqlite (used by tests) does not.
function runInTransaction(db, fn) {
  if (typeof db.transaction === "function") return db.transaction(fn)();
  db.exec("BEGIN IMMEDIATE");
  try {
    const out = fn();
    db.exec("COMMIT");
    return out;
  } catch (e) {
    try { db.exec("ROLLBACK"); } catch (_) {}
    throw e;
  }
}

function attemptsFromEventType(eventType) {
  const s = String(eventType || "");
  if (!s.startsWith(EVENT_TYPE_PREFIX)) return 0;
  const n = Number.parseInt(s.slice(EVENT_TYPE_PREFIX.length), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function backoffMs(attempts, baseMinutes) {
  return baseMinutes * 60 * 1000 * 2 ** Math.max(0, attempts - 1);
}

function recordEvent(db, reference, attempts, outcome, nowIso) {
  const key = KEY_PREFIX + reference;
  db.prepare("INSERT OR IGNORE INTO mall_payment_events(eventKey,reference,eventType,receivedAt,outcome,bodyHash) VALUES(?,?,?,?,?,?)")
    .run(key, reference, EVENT_TYPE_PREFIX + attempts, nowIso, outcome, null);
  db.prepare("UPDATE mall_payment_events SET eventType=?, receivedAt=?, outcome=? WHERE eventKey=?")
    .run(EVENT_TYPE_PREFIX + attempts, nowIso, outcome, key);
}

function candidateRows(db, table, userColumn, { nowMs, minAgeMs, maxAgeMs, limit }) {
  const newest = new Date(nowMs - minAgeMs).toISOString();
  const oldest = new Date(nowMs - maxAgeMs).toISOString();
  const flagged = FLAGGED_BY_WEBHOOK.map(() => "?").join(",");
  return db.prepare(
    `SELECT o.*, o.${userColumn} AS ownerId, e.eventType AS reconEventType, e.receivedAt AS reconAt, e.outcome AS reconOutcome
       FROM ${table} o
       LEFT JOIN mall_payment_events e ON e.eventKey = ('${KEY_PREFIX}' || o.paymentRef)
      WHERE o.paymentRef IS NOT NULL AND o.paymentRef <> ''
        AND o.status IN ('pending_payment','cancelled')
        AND o.createdAt <= ? AND o.createdAt >= ?
        AND (e.eventKey IS NULL OR e.outcome = '${OUTCOME.WAITING}')
        AND NOT EXISTS (SELECT 1 FROM mall_payment_events w
                         WHERE w.reference = o.paymentRef AND w.eventKey <> ('${KEY_PREFIX}' || o.paymentRef)
                           AND w.outcome IN (${flagged}))
      ORDER BY COALESCE(e.receivedAt, o.createdAt) ASC
      LIMIT ?`,
  ).all(newest, oldest, ...FLAGGED_BY_WEBHOOK, limit);
}

function isDue(row, nowMs, opts) {
  const attempts = attemptsFromEventType(row.reconEventType);
  if (!row.reconAt) return true;
  const last = Date.parse(row.reconAt);
  if (!Number.isFinite(last)) return true;
  return nowMs - last >= backoffMs(attempts, opts.baseBackoffMinutes);
}

function fulfilKitchen(db, order, reference, deps, nowIso) {
  const outcome = runInTransaction(db, () => {
    const current = db.prepare("SELECT status,paymentRef,providerVerified FROM kitchen_orders WHERE id=?").get(order.id);
    if (!current || current.status === "cancelled" || current.paymentRef !== reference) return { changes: 0, outcome: "kitchen_boundary_mismatch" };
    if (current.status === "paid" && current.providerVerified) return { changes: 0, outcome: OUTCOME.KITCHEN_ALREADY };
    const changed = db.prepare("UPDATE kitchen_orders SET status='paid',providerVerified=1,updatedAt=? WHERE id=? AND status='pending_payment' AND paymentRef=?").run(nowIso, order.id, reference);
    if (changed.changes) {
      try { deps.settleKitchenFee(db, order.ownerId, order.id); }
      catch (_) { db.prepare("UPDATE kitchen_orders SET feeStatus='pending',feeChargeId=NULL,updatedAt=? WHERE id=?").run(nowIso, order.id); }
    }
    return { changes: changed.changes, outcome: changed.changes ? OUTCOME.KITCHEN_CONFIRMED : "kitchen_race_lost" };
  });
  if (outcome.changes) {
    const safe = (fn) => { try { const r = fn(); if (r && typeof r.catch === "function") r.catch(() => {}); } catch (_) {} };
    safe(() => deps.kitchenUserCode(db, order.ownerId, order.id));
    safe(() => deps.settleKitchenReferral(db, order.id));
    safe(() => deps.generateKitchenReceipt(db.prepare("SELECT * FROM kitchen_orders WHERE id=?").get(order.id)));
    safe(() => deps.sendPush(order.ownerId, "Kitchen payment confirmed", `Your NEXA Kitchen order ${order.id} is paid.`, { screen: "leisure_kitchen", orderId: order.id }));
  }
  return outcome;
}

function fulfilTicket(db, order, reference, deps, nowIso) {
  const outcome = runInTransaction(db, () => {
    const current = db.prepare("SELECT status,paymentRef FROM yaayz_ticket_orders WHERE id=?").get(order.id);
    if (!current || current.status === "cancelled" || current.paymentRef !== reference) return { changes: 0, outcome: "ticket_boundary_mismatch" };
    if (current.status === "paid") return { changes: 0, outcome: OUTCOME.TICKET_ALREADY };
    const code = deps.issueYaayzTicketCode(order.id);
    const changed = db.prepare("UPDATE yaayz_ticket_orders SET status='paid',providerVerified=1,ticketCode=?,updatedAt=? WHERE id=? AND status='pending_payment' AND paymentRef=?").run(code, nowIso, order.id, reference);
    if (changed.changes) { try { deps.settleYaayzFee(db, order.ownerId, order.id); } catch (feeErr) { console.warn(`[NEXA] Yaayz fee settle deferred for order ${order.id}:`, feeErr && feeErr.message ? feeErr.message : "unknown error"); } }
    return { changes: changed.changes, outcome: changed.changes ? OUTCOME.TICKET_CONFIRMED : "ticket_race_lost" };
  });
  if (outcome.changes) {
    try {
      const r = deps.sendPush(order.ownerId, "Ticket payment confirmed", `Your Yaayz ticket for order ${order.id} is ready.`, { screen: "yaayz", ticketOrderId: order.id });
      if (r && typeof r.catch === "function") r.catch(() => {});
    } catch (_) {}
  }
  return outcome;
}

const KINDS = Object.freeze({
  kitchen: { table: "kitchen_orders", userColumn: "userId", fulfil: fulfilKitchen, cancelled: OUTCOME.KITCHEN_CANCELLED, mismatch: OUTCOME.KITCHEN_MISMATCH },
  ticket: { table: "yaayz_ticket_orders", userColumn: "buyerId", fulfil: fulfilTicket, cancelled: OUTCOME.TICKET_CANCELLED, mismatch: OUTCOME.TICKET_MISMATCH },
});

// deps: { verify(reference), matchesExpectedPayment(result, order, ref), issueYaayzTicketCode, settleYaayzFee,
//         settleKitchenFee, kitchenUserCode, settleKitchenReferral, generateKitchenReceipt, sendPush }
async function reconcile(db, deps, options = {}) {
  const opts = {
    minAgeMinutes: clampInt(options.minAgeMinutes, DEFAULTS.minAgeMinutes, 1, 24 * 60),
    maxAgeHours: clampInt(options.maxAgeHours, DEFAULTS.maxAgeHours, 1, 24 * 30),
    maxAttempts: clampInt(options.maxAttempts, DEFAULTS.maxAttempts, 1, 20),
    maxChecksPerTick: clampInt(options.maxChecksPerTick, DEFAULTS.maxChecksPerTick, 1, 100),
    maxConsecutiveProviderErrors: clampInt(options.maxConsecutiveProviderErrors, DEFAULTS.maxConsecutiveProviderErrors, 1, 10),
    baseBackoffMinutes: clampInt(options.baseBackoffMinutes, DEFAULTS.baseBackoffMinutes, 1, 24 * 60),
  };
  const now = options.now instanceof Date ? options.now : new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const summary = { checked: 0, confirmed: 0, flagged: 0, waiting: 0, gaveUp: 0, providerErrors: 0, stoppedEarly: false, results: [] };

  const due = [];
  for (const [kind, spec] of Object.entries(KINDS)) {
    const rows = candidateRows(db, spec.table, spec.userColumn, { nowMs, minAgeMs: opts.minAgeMinutes * 60000, maxAgeMs: opts.maxAgeHours * 3600000, limit: 200 });
    for (const row of rows) if (isDue(row, nowMs, opts)) due.push({ kind, spec, row });
  }
  due.sort((a, b) => String(a.row.reconAt || a.row.createdAt).localeCompare(String(b.row.reconAt || b.row.createdAt)));

  let consecutiveErrors = 0;
  for (const { kind, spec, row } of due.slice(0, opts.maxChecksPerTick)) {
    const reference = String(row.paymentRef);
    const attempts = attemptsFromEventType(row.reconEventType);
    let result;
    try {
      result = await deps.verify(reference);
      consecutiveErrors = 0;
    } catch (_) {
      summary.providerErrors += 1;
      consecutiveErrors += 1;
      if (consecutiveErrors >= opts.maxConsecutiveProviderErrors) { summary.stoppedEarly = true; break; }
      continue;
    }
    summary.checked += 1;
    const expected = { status: "pending", currency: row.currency, total: row.total, paymentRef: reference };
    const paidAtProvider = result && result.status === "success";
    let outcome;
    if (!paidAtProvider) {
      const next = attempts + 1;
      outcome = next >= opts.maxAttempts ? OUTCOME.GAVE_UP : OUTCOME.WAITING;
      recordEvent(db, reference, next, outcome, nowIso);
      if (outcome === OUTCOME.GAVE_UP) summary.gaveUp += 1; else summary.waiting += 1;
    } else if (!deps.matchesExpectedPayment(result, expected, reference)) {
      outcome = spec.mismatch;
      recordEvent(db, reference, attempts + 1, outcome, nowIso);
      summary.flagged += 1;
    } else if (String(row.status).toLowerCase() === "cancelled") {
      outcome = spec.cancelled;
      recordEvent(db, reference, attempts + 1, outcome, nowIso);
      summary.flagged += 1;
    } else {
      const done = spec.fulfil(db, { ...row, ownerId: row.ownerId }, reference, deps, nowIso);
      outcome = done.outcome;
      recordEvent(db, reference, attempts + 1, outcome, nowIso);
      if (done.changes) summary.confirmed += 1;
      else if (!/already_paid$/.test(outcome)) summary.flagged += 1;
    }
    summary.results.push({ kind, reference, outcome });
  }
  return summary;
}

// B144: the same re-check for wallet top-ups. A top-up is credited by the webhook, the app's verify call or the
// recheck route; if all three are missed the customer has paid but the wallet stays unfunded. This pass asks Paystack
// about pending top-ups and credits them through walletTopup.settleTopup (guarded, written once). A paid top-up whose
// amount or currency does not match is never credited: it is recorded as `wallet_topup_mismatch` so the attention
// report lists it. deps: { verify(reference), settleTopup(db, reference, providerResult), sendPush }
async function reconcileTopups(db, deps, options = {}) {
  const opts = {
    minAgeMinutes: clampInt(options.minAgeMinutes, DEFAULTS.minAgeMinutes, 1, 24 * 60),
    maxAgeHours: clampInt(options.maxAgeHours, DEFAULTS.maxAgeHours, 1, 24 * 30),
    maxAttempts: clampInt(options.maxAttempts, DEFAULTS.maxAttempts, 1, 20),
    maxChecksPerTick: clampInt(options.maxChecksPerTick, 10, 1, 100),
    maxConsecutiveProviderErrors: clampInt(options.maxConsecutiveProviderErrors, DEFAULTS.maxConsecutiveProviderErrors, 1, 10),
    baseBackoffMinutes: clampInt(options.baseBackoffMinutes, DEFAULTS.baseBackoffMinutes, 1, 24 * 60),
  };
  const now = options.now instanceof Date ? options.now : new Date();
  const nowMs = now.getTime();
  const nowIso = now.toISOString();
  const summary = { checked: 0, confirmed: 0, flagged: 0, waiting: 0, gaveUp: 0, providerErrors: 0, stoppedEarly: false, results: [] };
  const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='wallet_topups'").get();
  if (!exists) return summary;
  const newest = new Date(nowMs - opts.minAgeMinutes * 60000).toISOString();
  const oldest = new Date(nowMs - opts.maxAgeHours * 3600000).toISOString();
  const rows = db.prepare(
    `SELECT t.*, e.eventType AS reconEventType, e.receivedAt AS reconAt
       FROM wallet_topups t
       LEFT JOIN mall_payment_events e ON e.eventKey = ('${KEY_PREFIX}' || t.reference)
      WHERE t.status = 'pending' AND t.createdAt <= ? AND t.createdAt >= ?
        AND (e.eventKey IS NULL OR e.outcome = '${OUTCOME.WAITING}')
        AND NOT EXISTS (SELECT 1 FROM mall_payment_events w
                         WHERE w.reference = t.reference AND w.eventKey <> ('${KEY_PREFIX}' || t.reference)
                           AND w.outcome = '${OUTCOME.TOPUP_MISMATCH}')
      ORDER BY COALESCE(e.receivedAt, t.createdAt) ASC
      LIMIT 200`,
  ).all(newest, oldest);
  const due = rows.filter((row) => isDue(row, nowMs, opts)).slice(0, opts.maxChecksPerTick);
  let consecutiveErrors = 0;
  for (const row of due) {
    const reference = String(row.reference);
    const attempts = attemptsFromEventType(row.reconEventType);
    let result;
    try { result = await deps.verify(reference); consecutiveErrors = 0; }
    catch (_) {
      summary.providerErrors += 1; consecutiveErrors += 1;
      if (consecutiveErrors >= opts.maxConsecutiveProviderErrors) { summary.stoppedEarly = true; break; }
      continue;
    }
    summary.checked += 1;
    let outcome;
    if (!result || result.status !== "success") {
      const next = attempts + 1;
      outcome = next >= opts.maxAttempts ? OUTCOME.GAVE_UP : OUTCOME.WAITING;
      recordEvent(db, reference, next, outcome, nowIso);
      if (outcome === OUTCOME.GAVE_UP) summary.gaveUp += 1; else summary.waiting += 1;
    } else {
      const settled = deps.settleTopup(db, reference, result);
      if (settled.outcome === "credited") {
        outcome = OUTCOME.TOPUP_CREDITED; summary.confirmed += 1;
        try { const r = deps.sendPush && deps.sendPush(settled.topup.userId, "Wallet funded", "Your NEXA Wallet top-up was confirmed.", { screen: "wallet" }); if (r && typeof r.catch === "function") r.catch(() => {}); } catch (_) {}
      } else if (settled.outcome === "already_credited") outcome = OUTCOME.TOPUP_ALREADY;
      else { outcome = OUTCOME.TOPUP_MISMATCH; summary.flagged += 1; }
      recordEvent(db, reference, attempts + 1, outcome, nowIso);
    }
    summary.results.push({ kind: "wallet_topup", reference, outcome });
  }
  return summary;
}

let running = false;
async function tick(db, deps, options = {}) {
  if (running) return { skipped: true };
  running = true;
  try { return await reconcile(db, deps, options); }
  finally { running = false; }
}

module.exports = { OUTCOME, DEFAULTS, reconcile, reconcileTopups, tick, attemptsFromEventType, backoffMs };
