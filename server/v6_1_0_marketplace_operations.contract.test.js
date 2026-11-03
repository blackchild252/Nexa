"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const ops = require("./marketplaceOperations");
test("Block 10 marketplace order transitions protect terminal states", () => {
  assert.equal(ops.canTransitionOrder("placed", "accepted"), true);
  assert.equal(ops.canTransitionOrder("completed", "cancelled"), false);
  assert.equal(ops.isTerminalOrderStatus("rejected"), true);
  assert.equal(ops.isTerminalOrderStatus("accepted"), false);
});
test("Block 10 marketplace state normalization fails closed", () => {
  assert.equal(ops.normalizeMarketplaceState("payment", "paid"), "paid");
  assert.equal(ops.normalizeMarketplaceState("shipment", "invented"), null);
  assert.equal(ops.normalizeMarketplaceState("payout", "released"), "released");
});
test("Block 10 cancellation blocks paid orders and started shipments", () => {
  assert.deepEqual(ops.cancellationEligibility({status:"placed", paid:true}), {eligible:false,reason:"paid_order_requires_review"});
  assert.deepEqual(ops.cancellationEligibility({status:"accepted", shipmentStatus:"in_transit"}), {eligible:false,reason:"shipment_already_started"});
  assert.equal(ops.cancellationEligibility({status:"placed"}).eligible, true);
});
test("Block 10 return and refund eligibility enforce lifecycle boundaries", () => {
  assert.equal(ops.returnEligibility({status:"completed",deliveredAt:"2026-01-01T00:00:00.000Z",now:"2026-02-15T00:00:00.000Z"}).eligible, false);
  assert.equal(ops.returnEligibility({status:"completed",deliveredAt:"2026-10-01T00:00:00.000Z",now:"2026-10-09T00:00:00.000Z"}).eligible, true);
  assert.equal(ops.refundEligibility({paymentStatus:"pending",amount:5,refundableAmount:10}).eligible, false);
  assert.equal(ops.refundEligibility({paymentStatus:"paid",amount:5,refundableAmount:10}).eligible, true);
});
test("Block 10 payout eligibility fails closed for suspended sellers, open disputes and repeat payouts", () => {
  assert.equal(ops.payoutEligibility({sellerActive:false,orderStatus:"completed",paymentStatus:"paid"}).eligible, false);
  assert.equal(ops.payoutEligibility({orderStatus:"completed",paymentStatus:"paid",disputeOpen:true}).eligible, false);
  assert.equal(ops.payoutEligibility({orderStatus:"completed",paymentStatus:"paid",payoutStatus:"paid"}).eligible, false);
  assert.equal(ops.payoutEligibility({orderStatus:"completed",paymentStatus:"paid"}).eligible, true);
});
test("Block 10 Admin command-center snapshot is explicitly read-only and summarizes only supplied rows", () => {
  const snap=ops.summarizeMarketplaceCommandCenter({orders:[{id:"1",status:"placed"},{id:"2",status:"completed"}],disputes:[{status:"open"},{status:"resolved"}],vendors:[{status:"suspended"}],refunds:[{status:"pending"}]});
  assert.equal(snap.readOnly,true); assert.equal(snap.orders.total,2); assert.equal(snap.orders.attention,1); assert.equal(snap.disputes.open,1); assert.equal(snap.sellers.suspended,1); assert.equal(snap.refunds.attention,1);
});

test("Block 10 delivery failure and return-to-seller transitions are bounded", () => {
  assert.equal(ops.canTransitionDelivery("in_transit", "failed"), true);
  assert.equal(ops.canTransitionDelivery("delivered", "return_to_seller"), false);
  assert.deepEqual(ops.deliveryTransitionResult("bad", "delivered"), {ok:false,reason:"unknown_delivery_state"});
});
test("Block 10 seller suspension flags open orders for review without auto-cancelling", () => {
  assert.deepEqual(ops.sellerSuspensionImpact({sellerSuspended:true,openOrders:3}), {suspended:true,openOrders:3,newOrdersAllowed:false,existingOrders:"review_required",autoCancelExistingOrders:false});
});
test("Block 10 dispute terminal states and canonical timeline are deterministic", () => {
  assert.equal(ops.disputeTransitionResult("resolved", "open").ok, false);
  const timeline=ops.normalizeOrderTimeline([{id:"b",toStatus:"accepted",createdAt:"2026-01-02"},{id:"a",toStatus:"placed",createdAt:"2026-01-01"}]);
  assert.deepEqual(timeline.map((e)=>e.id),["a","b"]);
});
test("Block 10 reconciliation detects orphan records and investigation records require a reason", () => {
  const result=ops.reconciliationDiagnostics({orders:[{id:"o1"}],events:[{orderId:"missing"}],disputes:[{orderId:"o2"}],refunds:[{reference:"r1"},{reference:"r1"}]});
  assert.equal(result.requiresReview,true); assert.equal(result.financialMutationPerformed,false);
  assert.equal(ops.investigationRecord({id:"i",orderId:"o1",category:"delivery",reason:"Investigate delivery"}).ok,true);
  assert.equal(ops.investigationRecord({id:"i",orderId:"o1",category:"delivery",reason:""}).ok,false);
});

test("Block 10 Main marketplace operations endpoint is authenticated, Admin-permission gated and read-only", () => {
  const fs = require("node:fs"); const path = require("node:path");
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  assert.match(source, /app\.get\("\/api\/admin\/marketplace\/operations", auth\.authMiddleware, adminAccess\.require\("mall"\)/);
  assert.match(source, /providerCalls: false, mutationsPerformed: false/);
  assert.match(source, /marketplace-operations-read-model/);
});

test("Block 10 payout hold/release transitions are bounded and paid is terminal", () => {
  assert.equal(ops.payoutTransitionResult("eligible", "held").ok, true);
  assert.equal(ops.payoutTransitionResult("held", "released").ok, true);
  assert.equal(ops.payoutTransitionResult("paid", "held").ok, false);
});
test("Block 10 investigation route is permission-gated, idempotent, and separate from order mutation", () => {
  const fs = require("node:fs"); const path = require("node:path");
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  const investigations = fs.readFileSync(path.join(__dirname, "marketplaceInvestigations.js"), "utf8");
  assert.match(source, /app\.post\("\/api\/admin\/marketplace\/investigations", auth\.authMiddleware, adminAccess\.require\("mall"\)/);
  assert.match(investigations, /requestKey TEXT NOT NULL UNIQUE/);
  assert.match(investigations, /SELECT 1 FROM mall_orders WHERE id=\?/);
  assert.doesNotMatch(investigations, /UPDATE mall_orders|UPDATE mall_refunds|UPDATE users/);
});

test("Block 10 buyer/seller lifecycle ownership checks fail closed", () => {
  assert.equal(ops.buyerOrderEligibility({buyerId:"u1",orderOwnerId:"u2"}).eligible, false);
  assert.equal(ops.buyerOrderEligibility({buyerId:"u1",orderOwnerId:"u1"}).eligible, true);
  assert.equal(ops.sellerOrderEligibility({sellerActive:false,sellerId:"s1",orderSellerId:"s1"}).eligible, false);
  assert.equal(ops.sellerOrderEligibility({sellerActive:true,sellerId:"s1",orderSellerId:"s1"}).eligible, true);
});
test("Block 10 moderation outcomes link to orders without changing financial state", () => {
  assert.deepEqual(ops.moderationOutcomeForOrder({orderId:"o1",outcome:"takedown",reason:"Unsafe listing"}), {ok:true,orderId:"o1",category:"moderation",outcome:"takedown",reason:"Unsafe listing",requiresOrderReview:true,financialMutationPerformed:false});
  assert.equal(ops.moderationOutcomeForOrder({orderId:"o1",outcome:"unknown"}).ok,false);
});
