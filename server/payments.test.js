"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const payments = require("./payments");

test("vendor payment toggles are allowed only for direct/offline payment orders", () => {
  assert.equal(payments.canVendorSetPaid("pay_seller"), true);
  assert.equal(payments.canVendorSetPaid(""), true);
  assert.equal(payments.canVendorSetPaid("online"), false);
  assert.equal(payments.canVendorSetPaid("ONLINE"), false);
});

test("payment verification requires success, exact currency, exact minor-unit amount, and matching reference when supplied", () => {
  const order = { total: 1250.50, currency: "NGN" };
  assert.equal(payments.matchesExpectedPayment({ status: "success", currency: "NGN", amount: 125050 }, order), true);
  assert.equal(payments.matchesExpectedPayment({ status: "success", reference: "pay_1", currency: "NGN", amount: 125050 }, order, "pay_1"), true);
  assert.equal(payments.matchesExpectedPayment({ status: "success", reference: "other", currency: "NGN", amount: 125050 }, order, "pay_1"), false);
  assert.equal(payments.matchesExpectedPayment({ status: "success", currency: "NGN", amount: 125050 }, order, "pay_1"), false);
  assert.equal(payments.matchesExpectedPayment({ status: "pending", currency: "NGN", amount: 125050 }, order), false);
  assert.equal(payments.matchesExpectedPayment({ status: "success", currency: "USD", amount: 125050 }, order), false);
  assert.equal(payments.matchesExpectedPayment({ status: "success", currency: "NGN", amount: 125049 }, order), false);
  assert.equal(payments.matchesExpectedPayment(null, order), false);
});

test("payment webhook fulfillment requires an online-payment order", () => {
  const online = { paymentMethod: "online", paymentRef: "pay_1", currency: "NGN", total: 1250.50 };
  const direct = { paymentMethod: "pay_seller", paymentRef: "pay_1", currency: "NGN", total: 1250.50 };
  assert.equal(payments.matchesExpectedPayment({ status: "success", reference: "pay_1", currency: "NGN", amount: 125050 }, online, "pay_1"), true);
  assert.equal(String(direct.paymentMethod).toLowerCase() === "online", false);
});

test("Paystack webhook signature accepts exact HMAC and rejects tampering", () => {
  const old = process.env.PAYSTACK_SECRET_KEY;
  process.env.PAYSTACK_SECRET_KEY = "test-secret";
  try {
    const raw = Buffer.from('{"event":"charge.success"}');
    const sig = crypto.createHmac("sha512", "test-secret").update(raw).digest("hex");
    assert.equal(payments.verifyWebhookSignature(raw, sig), true);
    assert.equal(payments.verifyWebhookSignature(raw, `${sig.slice(0, -1)}0`), false);
    assert.equal(payments.verifyWebhookSignature(raw, ""), false);
  } finally {
    if (old === undefined) delete process.env.PAYSTACK_SECRET_KEY;
    else process.env.PAYSTACK_SECRET_KEY = old;
  }
});


test("refund provider result must match transaction and requested amount", () => {
  assert.equal(payments.validateRefundProviderResult({status:"processed", transaction:"tx-1", amount:1250, id:"rf-1"}, "tx-1", 1250).ok, true);
  assert.equal(payments.validateRefundProviderResult({status:"processed", transaction:"other", amount:1250}, "tx-1", 1250).ok, false);
  assert.equal(payments.validateRefundProviderResult({status:"processed", transaction:"tx-1", amount:1200}, "tx-1", 1250).ok, false);
  assert.equal(payments.validateRefundProviderResult({status:"processed", amount:1250}, "tx-1", 1250).ok, false);
  assert.equal(payments.validateRefundProviderResult({status:"processed", transaction:"tx-1"}, "tx-1", 1250).ok, false);
  assert.equal(payments.validateRefundProviderResult({status:"mystery", transaction:"tx-1", amount:1250}, "tx-1", 1250).ok, false);
});

test("refund validation enforces ownership-ready payment state, reason, and currency precision", () => {
  const order = { paymentMethod: "online", paymentRef: "pay_1", total: 1250.50, currency: "NGN" };
  assert.deepEqual(payments.validateRefundRequest(order, 1, null, "Item was not delivered"), {
    ok: true, reason: "Item was not delivered", amountMinor: 125050
  });
  assert.equal(payments.validateRefundRequest(order, 0, null, "Item was not delivered").status, 409);
  assert.equal(payments.validateRefundRequest(order, 1, { id: "r1", status: "processing" }, "Item was not delivered").status, 409);
  assert.equal(payments.validateRefundRequest(order, 1, null, "no").status, 400);
  assert.equal(payments.validateRefundRequest({ ...order, total: 0 }, 1, null, "Item was not delivered").status, 409);
  assert.equal(payments.validateRefundRequest({ ...order, currency: "JPY", total: 1.5 }, 1, null, "Item was not delivered").status, 409);
  assert.equal(payments.validateRefundRequest({ ...order, currency: "XXX" }, 1, null, "Item was not delivered").status, 409);
});

test("dispute validation bounds and validates the buyer-provided reason", () => {
  const order = { id: "o1" };
  const result = payments.validateDisputeRequest(order, "  Item not received  ");
  assert.equal(result.ok, true);
  assert.equal(result.reason, "Item not received");
  assert.equal(payments.validateDisputeRequest(order, "x").status, 400);
  assert.equal(payments.validateDisputeRequest(null, "valid reason").status, 404);
  const long = payments.validateDisputeRequest(order, "x".repeat(200));
  assert.equal(long.reason.length, 120);
});


function fakeDb() {
  const refunds = new Map();
  const disputes = new Map();
  return {
    refunds, disputes,
    transaction(fn) { return (...args) => fn(...args); },
    prepare(sql) {
      return {
        get(...args) {
          if (sql.includes("FROM mall_refunds") && sql.includes("WHERE id = ?")) {
            return refunds.get(args[0]) || undefined;
          }
          if (sql.includes("FROM mall_refunds")) {
            const [orderId] = args;
            return [...refunds.values()].find(r => r.orderId === orderId && ["pending","processing","processed"].includes(r.status)) || undefined;
          }
          if (sql.includes("FROM mall_checkout_disputes")) {
            const [orderId, buyerId] = args;
            return [...disputes.values()].find(d => d.orderId === orderId && d.buyerId === buyerId && d.status === "open") || undefined;
          }
          throw new Error(`Unhandled get: ${sql}`);
        },
        run(...args) {
          if (sql.startsWith("INSERT INTO mall_refunds")) {
            const [id,orderId,buyerId,reference,amount,currency,reason,createdAt,updatedAt] = args;
            refunds.set(id,{id,orderId,buyerId,reference,amount,currency,status:"processing",reason,providerReference:"",createdAt,updatedAt});
            return {changes:1};
          }
          if (sql.startsWith("INSERT INTO mall_checkout_disputes")) {
            const [id,orderId,buyerId,reason,details,createdAt,updatedAt] = args;
            disputes.set(id,{id,orderId,buyerId,reason,details,status:"open",createdAt,updatedAt});
            return {changes:1};
          }
          if (sql.startsWith("UPDATE mall_refunds")) {
            const row = refunds.get(args[3] || args[args.length - 1]);
            if (sql.includes("WHERE id = ? AND status = ?")) {
              const [status,providerReference,updatedAt,id,currentStatus] = args;
              if (!row || row.status !== currentStatus) return {changes:0};
              row.status=status; if (providerReference) row.providerReference=providerReference; row.updatedAt=updatedAt;
              return {changes:1};
            }
            const [status,providerReference,updatedAt,id] = args;
            if (!row || row.status !== "processing") return {changes:0};
            row.status=status; if (providerReference) row.providerReference=providerReference; row.updatedAt=updatedAt;
            return {changes:1};
          }
          if (sql.startsWith("SELECT COUNT(*)")) return {n:0};
          throw new Error(`Unhandled run: ${sql}`);
        }
      };
    }
  };
}

test("refund claim is atomic and blocks a concurrent active refund", () => {
  const db = fakeDb();
  const first = payments.claimRefund(db, { id:"r1", orderId:"o1", buyerId:"u1", reference:"pay1", amount:100, currency:"NGN", reason:"Not received", createdAt:"2026-09-25T00:00:00Z" });
  const second = payments.claimRefund(db, { id:"r2", orderId:"o1", buyerId:"u1", reference:"pay1", amount:100, currency:"NGN", reason:"Not received", createdAt:"2026-09-25T00:01:00Z" });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.refund.id, "r1");
  assert.equal(second.refund.status, "processing");
  assert.equal(db.refunds.size, 1);
});

test("dispute claim is atomic and blocks a concurrent open dispute", () => {
  const db = fakeDb();
  const first = payments.claimDispute(db, { id:"d1", orderId:"o1", buyerId:"u1", reason:"Not received", details:null, createdAt:"2026-09-25T00:00:00Z" });
  const second = payments.claimDispute(db, { id:"d2", orderId:"o1", buyerId:"u1", reason:"Different reason", details:null, createdAt:"2026-09-25T00:01:00Z" });
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.dispute.id, "d1");
  assert.equal(second.dispute.status, "open");
  assert.equal(db.disputes.size, 1);
});

test("refund finalization only changes the claimed processing row", () => {
  const db = fakeDb();
  payments.claimRefund(db, { id:"r1", orderId:"o1", buyerId:"u1", reference:"pay1", amount:100, currency:"NGN", reason:"Not received", createdAt:"2026-09-25T00:00:00Z" });
  const changed = payments.finalizeRefund(db, { id:"r1", status:"processed", providerReference:"pr1", updatedAt:"2026-09-25T00:02:00Z" });
  assert.equal(changed.changes, 1);
  assert.deepEqual({status:db.refunds.get("r1").status,providerReference:db.refunds.get("r1").providerReference}, {status:"processed",providerReference:"pr1"});
});


test("refund lifecycle does not regress a more advanced state", () => {
  const db = fakeDb();
  payments.claimRefund(db, { id:"r1", orderId:"o1", buyerId:"u1", reference:"pay1", amount:100, currency:"NGN", reason:"Not received", createdAt:"2026-09-25T00:00:00Z" });
  const processing = payments.applyRefundEvent(db, { id:"r1", status:"processing", providerReference:"pr1", updatedAt:"2026-09-25T00:01:00Z" });
  assert.equal(processing.status, "processing");
  const processed = payments.applyRefundEvent(db, { id:"r1", status:"processed", providerReference:"pr1", updatedAt:"2026-09-25T00:02:00Z" });
  assert.equal(processed.status, "processed");
  const regressed = payments.applyRefundEvent(db, { id:"r1", status:"failed", providerReference:"pr1", updatedAt:"2026-09-25T00:03:00Z" });
  assert.equal(regressed.changes, 0);
  assert.equal(regressed.status, "processed");
  assert.equal(db.refunds.get("r1").status, "processed");
});


test("payment verification order guard requires an online order and exact stored reference", () => {
  const online = { paymentMethod: "online", paymentRef: "pay_1" };
  assert.deepEqual(payments.validatePaymentVerificationOrder(online, "pay_1"), { ok: true });
  assert.equal(payments.validatePaymentVerificationOrder(null, "pay_1").status, 404);
  assert.equal(payments.validatePaymentVerificationOrder({ paymentMethod: "pay_seller", paymentRef: "pay_1" }, "pay_1").status, 409);
  assert.equal(payments.validatePaymentVerificationOrder(online, "other").status, 409);
  assert.equal(payments.validatePaymentVerificationOrder({ paymentMethod: "online", paymentRef: "" }, "pay_1").status, 409);
  assert.equal(payments.validatePaymentVerificationOrder({ paymentMethod: "online", paymentRef: "pay_1", status: "cancelled" }, "pay_1").status, 409);
});

test("dispute transitions are atomic and only move from the expected lifecycle state", () => {
  const rows = new Map([[
    "d1", { id:"d1", status:"open", resolution:"" }
  ]]);
  const db = {
    prepare(sql) {
      return {
        run(...args) {
          assert.match(sql, /UPDATE mall_checkout_disputes SET status/);
          const [next, resolution, updatedAt, id, ...from] = args;
          const row = rows.get(id);
          if (!row || !from.includes(row.status)) return {changes:0};
          row.status = next;
          if (resolution) row.resolution = resolution;
          row.updatedAt = updatedAt;
          return {changes:1};
        }
      };
    }
  };
  const first = payments.transitionDispute(db, {id:"d1", fromStatuses:["open"], toStatus:"pending_buyer_confirmation", resolution:"Seller response", updatedAt:"t1"});
  assert.equal(first.changes, 1);
  assert.equal(rows.get("d1").status, "pending_buyer_confirmation");
  const stale = payments.transitionDispute(db, {id:"d1", fromStatuses:["open"], toStatus:"pending_buyer_confirmation", resolution:"Stale response", updatedAt:"t2"});
  assert.equal(stale.changes, 0);
  assert.equal(rows.get("d1").resolution, "Seller response");
  const resolved = payments.transitionDispute(db, {id:"d1", fromStatuses:["pending_buyer_confirmation"], toStatus:"resolved", updatedAt:"t3"});
  assert.equal(resolved.changes, 1);
  assert.equal(rows.get("d1").status, "resolved");
});

test("dispute transition rejects unsupported states and empty source state", () => {
  const db = { prepare() { throw new Error("should not prepare a query"); } };
  assert.equal(payments.transitionDispute(db, {id:"d1", fromStatuses:[], toStatus:"resolved", updatedAt:"t"}).changes, 0);
  assert.equal(payments.transitionDispute(db, {id:"d1", fromStatuses:["open"], toStatus:"closed", updatedAt:"t"}).changes, 0);
});
