"use strict";
const crypto = require("crypto");
const { majorToMinorUnits } = require("./currencyModel");
const SECRET = () => process.env.PAYSTACK_SECRET_KEY || "";
const isMock = () => String(process.env.PAYMENT_MODE || "live").toLowerCase() === "mock";
const mockAllowed = () => String(process.env.NODE_ENV || "").toLowerCase() !== "production";
const PROVIDER_TIMEOUT_MS = 15_000;
async function paystack(path, options = {}) {
  if (!SECRET()) throw new Error("PAYSTACK_SECRET_KEY is not configured");
  const controller = typeof AbortController === "function" ? new AbortController() : null;
  const timer = controller ? setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS) : null;
  try {
    const r = await fetch(`https://api.paystack.co${path}`, {
      method: options.method || "GET", headers: { Authorization: `Bearer ${SECRET()}`, "Content-Type": "application/json" },
      body: options.body ? JSON.stringify(options.body) : undefined,
      ...(controller ? { signal: controller.signal } : {}),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !data?.status) throw new Error(data?.message || `Paystack request failed (${r.status})`);
    return data.data;
  } catch (e) {
    if (e?.name === "AbortError") throw new Error(`Paystack request timed out after ${PROVIDER_TIMEOUT_MS}ms`);
    throw e;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
function matchesExpectedPayment(result, order, expectedReference) {
  if (!result || !order) return false;
  if (expectedReference != null) {
    const returnedReference = String(result.reference || result.transaction || "").trim();
    if (!returnedReference || returnedReference !== String(expectedReference)) return false;
  }
  let expectedAmountMinor;
  try { expectedAmountMinor = majorToMinorUnits(order.total, order.currency); }
  catch { return false; }
  return result.status === "success" &&
    String(result.currency || "").toUpperCase() === String(order.currency || "").toUpperCase() &&
    Number.isSafeInteger(Number(result.amount)) &&
    Number(result.amount) === expectedAmountMinor;
}

function validatePaymentVerificationOrder(order, reference) {
  if (!order) return { ok: false, status: 404, error: "Payment/order not found." };
  if (String(order.paymentMethod || "").toLowerCase() !== "online") {
    return { ok: false, status: 409, error: "This order is not configured for online payment verification." };
  }
  if (String(order.status || "").toLowerCase() === "cancelled") {
    return { ok: false, status: 409, error: "This order has been cancelled and cannot receive an online payment." };
  }
  const storedReference = String(order.paymentRef || "").trim();
  if (!storedReference || storedReference !== String(reference || "").trim()) {
    return { ok: false, status: 409, error: "Payment reference does not match this order." };
  }
  return { ok: true };
}

function canVendorSetPaid(paymentMethod) {
  return String(paymentMethod || "").toLowerCase() !== "online";
}

function validateRefundRequest(order, paidItemCount, existingRefund, reason) {
  if (!order) return { ok: false, status: 404, error: "Order not found." };
  if (order.paymentMethod !== "online" || !order.paymentRef) {
    return { ok: false, status: 409, error: "Only NEXA-processed online payments can be refunded here. Contact the seller for direct payments." };
  }
  if (Number(paidItemCount) <= 0) return { ok: false, status: 409, error: "This order has no confirmed payment." };
  if (existingRefund) return { ok: false, status: 409, error: "A refund is already recorded for this order.", refund: existingRefund };
  const cleanReason = String(reason || "").trim().slice(0, 300);
  if (cleanReason.length < 4) return { ok: false, status: 400, error: "Please provide a refund reason (at least 4 characters)." };
  let amountMinor;
  try { amountMinor = majorToMinorUnits(order.total, order.currency); }
  catch { return { ok: false, status: 409, error: "This order has an unsupported currency or invalid refundable amount." }; }
  if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) return { ok: false, status: 409, error: "This order has an invalid refundable amount." };
  return { ok: true, reason: cleanReason, amountMinor };
}

function validateRefundProviderResult(result, transaction, amountMinor) {
  if (!result || typeof result !== "object") return { ok: false, error: "Empty refund provider response." };
  const returnedTransaction = String(result.transaction || result.reference || "").trim();
  if (!returnedTransaction || returnedTransaction !== String(transaction)) {
    return { ok: false, error: "Refund provider transaction mismatch." };
  }
  if (result.amount == null || !Number.isFinite(Number(result.amount)) || Number(result.amount) !== Number(amountMinor)) {
    return { ok: false, error: "Refund provider amount mismatch." };
  }
  const status = String(result.status || "").toLowerCase();
  if (!["pending", "processing", "processed", "failed"].includes(status)) {
    return { ok: false, error: "Unknown refund provider status." };
  }
  return { ok: true, status };
}

function claimRefund(db, { id, orderId, buyerId, reference, amount, currency, reason, createdAt }) {
  const run = db.transaction(() => {
    const existing = db.prepare("SELECT id,status FROM mall_refunds WHERE orderId = ? AND status IN ('pending','processing','processed') LIMIT 1").get(orderId);
    if (existing) return { created: false, refund: existing };
    db.prepare("INSERT INTO mall_refunds(id,orderId,buyerId,reference,amount,currency,status,reason,providerReference,createdAt,updatedAt) VALUES(?,?,?,?,?,?, 'processing', ?, '', ?, ?)")
      .run(id, orderId, buyerId, reference, amount, currency, reason, createdAt, createdAt);
    return { created: true, refund: { id, status: 'processing' } };
  });
  return run();
}

function finalizeRefund(db, { id, status, providerReference, updatedAt }) {
  const next = String(status || '').toLowerCase();
  if (!['pending', 'processing', 'processed', 'failed'].includes(next)) return { changes: 0 };
  return db.prepare("UPDATE mall_refunds SET status = ?, providerReference = COALESCE(NULLIF(?, ''), providerReference), updatedAt = ? WHERE id = ? AND status = 'processing'")
    .run(next, String(providerReference || ''), updatedAt, id);
}

function applyRefundEvent(db, { id, status, providerReference, updatedAt }) {
  const next = String(status || '').toLowerCase();
  const allowed = new Set(['pending', 'processing', 'processed', 'failed']);
  if (!allowed.has(next)) return { changes: 0 };
  const run = db.transaction(() => {
    const row = db.prepare("SELECT status FROM mall_refunds WHERE id = ?").get(id);
    if (!row) return { changes: 0, previousStatus: null, status: null };
    const current = String(row.status || '').toLowerCase();
    const rank = { pending: 1, processing: 2, failed: 3, processed: 4 };
    if ((rank[next] || 0) < (rank[current] || 0)) return { changes: 0, previousStatus: current, status: current };
    if (next === current && !providerReference) return { changes: 0, previousStatus: current, status: current };
    const result = db.prepare("UPDATE mall_refunds SET status = ?, providerReference = COALESCE(NULLIF(?, ''), providerReference), updatedAt = ? WHERE id = ? AND status = ?")
      .run(next, String(providerReference || ''), updatedAt, id, current);
    return { changes: result.changes, previousStatus: current, status: result.changes ? next : current };
  });
  return run();
}

function claimDispute(db, { id, orderId, buyerId, reason, details, createdAt }) {
  const run = db.transaction(() => {
    const existing = db.prepare("SELECT id,status FROM mall_checkout_disputes WHERE orderId = ? AND buyerId = ? AND status = 'open' LIMIT 1").get(orderId, buyerId);
    if (existing) return { created: false, dispute: existing };
    db.prepare("INSERT INTO mall_checkout_disputes(id,orderId,buyerId,reason,details,status,createdAt,updatedAt) VALUES(?,?,?,?,?,'open',?,?)")
      .run(id, orderId, buyerId, reason, details || null, createdAt, createdAt);
    return { created: true, dispute: { id, status: 'open' } };
  });
  return run();
}

function transitionDispute(db, { id, fromStatuses, toStatus, resolution, updatedAt }) {
  const allowedFrom = Array.isArray(fromStatuses) ? fromStatuses.map(v => String(v || '').toLowerCase()).filter(Boolean) : [];
  const next = String(toStatus || '').toLowerCase();
  const allowedNext = new Set(['open', 'pending_buyer_confirmation', 'resolved']);
  if (!allowedFrom.length || !allowedNext.has(next)) return { changes: 0, previousStatus: null, status: null };
  const placeholders = allowedFrom.map(() => '?').join(',');
  const params = [next, String(resolution || ''), updatedAt, id, ...allowedFrom];
  const result = db.prepare(`UPDATE mall_checkout_disputes SET status = ?, resolution = COALESCE(NULLIF(?, ''), resolution), updatedAt = ? WHERE id = ? AND status IN (${placeholders})`).run(...params);
  return { changes: result.changes, status: result.changes ? next : null };
}

function validateDisputeRequest(order, reason) {
  if (!order) return { ok: false, status: 404, error: "Order not found." };
  const cleanReason = String(reason || "").trim().slice(0, 120);
  if (cleanReason.length < 3) return { ok: false, status: 400, error: "Please provide a dispute reason." };
  return { ok: true, reason: cleanReason };
}
module.exports = {
  PROVIDER_TIMEOUT_MS,
  matchesExpectedPayment,
  validatePaymentVerificationOrder,
  validateRefundRequest,
  validateRefundProviderResult,
  canVendorSetPaid,
  validateDisputeRequest,
  claimRefund,
  finalizeRefund,
  applyRefundEvent,
  claimDispute,
  transitionDispute,
  isEnabled: () => process.env.PAYMENTS_ENABLED === "true" && (mockAllowed() ? (isMock() || Boolean(SECRET())) : Boolean(SECRET())),
  mockAllowed,
  initialize: async ({ email, amountMinor, currency, reference, metadata }) => {
    if (isMock() && !mockAllowed()) throw new Error("Mock payments are disabled in production.");
    if (isMock()) return { reference, status: "success", email, amount: amountMinor, currency, metadata, mock: true, completed: true };
    return paystack("/transaction/initialize", { method:"POST", body:{ email, amount:String(amountMinor), currency, reference, metadata:JSON.stringify(metadata), callback_url:process.env.PAYSTACK_CALLBACK_URL || undefined } });
  },
  verify: async (reference) => {
    if (isMock()) {
      if (!mockAllowed()) throw new Error("Mock payments are disabled in production.");
      // Development-only deterministic success response. No real funds move.
      return { status: "success", reference, currency: "NGN", amount: Number(String(process.env.MOCK_PAYMENT_AMOUNT_MINOR || "0")) };
    }
    return paystack(`/transaction/verify/${encodeURIComponent(reference)}`);
  },
  refund: async ({ transaction, amountMinor, reason }) => {
    if (isMock()) {
      if (!mockAllowed()) throw new Error("Mock payments are disabled in production.");
      return { id: `mock_refund_${transaction}_${Date.now()}`, status: "processed", transaction, amount: amountMinor, reason };
    }
    return paystack("/refund", { method:"POST", body:{ transaction, amount: amountMinor, reason } });
  },
  verifyWebhookSignature: (rawBody, signature) => {
    if (isMock()) return false;
    if (!rawBody || !signature || !SECRET()) return false;
    const expected = crypto.createHmac("sha512", SECRET()).update(rawBody).digest("hex");
    const a=Buffer.from(String(signature)); const b=Buffer.from(expected);
    return a.length===b.length && crypto.timingSafeEqual(a,b);
  },
};
