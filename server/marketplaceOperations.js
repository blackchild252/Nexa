"use strict";
const ORDER_STATUSES = Object.freeze(["placed","pending","accepted","fulfilled","completed","rejected","cancelled"]);
const DISPUTE_STATUSES = Object.freeze(["open","pending_buyer_confirmation","resolved"]);
function summarizeOrder(order={}){const status=ORDER_STATUSES.includes(String(order.status))?String(order.status):"unknown";return {id:String(order.id||""),status,total:Number(order.total)||0,currency:String(order.currency||""),attention:["rejected","cancelled"].includes(status)||["placed","pending","accepted"].includes(status)};}
function normalizeOrderStatus(value){const v=String(value||"").trim().toLowerCase();return ORDER_STATUSES.includes(v)?v:null;}
function isOrderStatus(value){return normalizeOrderStatus(value)!==null;}
function clampOrderLimit(value){const n=Number(value);return Number.isFinite(n)?Math.min(100,Math.max(1,Math.floor(n)||1)):30;}
function boundRows(rows=[],limit=100){return Array.isArray(rows)?rows.slice(0,Math.max(0,limit)):[];}
function normalizeOrderEvent(event={}){return {id:String(event.id||""),actorId:String(event.actorId||""),fromStatus:event.fromStatus==null?null:String(event.fromStatus),toStatus:String(event.toStatus||""),note:event.note==null?null:String(event.note).slice(0,500),createdAt:String(event.createdAt||"")};}
function mergeOrderLists(...lists){const map=new Map();for(const list of lists){for(const item of Array.isArray(list)?list:[]){const id=String(item?.id||item?.orderId||"");if(id&&!map.has(id))map.set(id,item);}}return [...map.values()];}
function merchantSummary(orders=[],disputes=[]){const out={orders:orders.length,active:0,completed:0,exceptions:0,disputes:0};for(const o of orders){const x=summarizeOrder(o);if(["placed","pending","accepted","fulfilled"].includes(x.status))out.active++;if(x.status==="completed")out.completed++;if(["rejected","cancelled"].includes(x.status))out.exceptions++;}out.disputes=disputes.filter(d=>DISPUTE_STATUSES.includes(String(d.status))&&String(d.status)!=="resolved").length;return out;}

const MARKETPLACE_INVARIANTS = Object.freeze({
  payment: Object.freeze(["unpaid", "pending", "paid", "failed", "refunded", "review_required"]),
  shipment: Object.freeze(["not_ready", "ready", "in_transit", "delivered", "failed", "returned"]),
  delivery: Object.freeze(["not_started", "in_transit", "delivered", "failed", "return_to_seller"]),
  payout: Object.freeze(["not_eligible", "eligible", "held", "released", "paid", "review_required"]),
});
const ORDER_TRANSITIONS = Object.freeze({
  placed: Object.freeze(["accepted", "rejected", "cancelled"]),
  pending: Object.freeze(["accepted", "rejected", "cancelled"]),
  accepted: Object.freeze(["fulfilled", "cancelled"]),
  fulfilled: Object.freeze(["completed"]),
  completed: Object.freeze([]), rejected: Object.freeze([]), cancelled: Object.freeze([]),
});
const TERMINAL_ORDER_STATES = Object.freeze(["completed", "rejected", "cancelled"]);
function canTransitionOrder(from, to) { return (ORDER_TRANSITIONS[String(from || "")] || []).includes(String(to || "")); }
function isTerminalOrderStatus(status) { return TERMINAL_ORDER_STATES.includes(String(status || "")); }
function normalizeMarketplaceState(kind, value) {
  const allowed = MARKETPLACE_INVARIANTS[kind];
  const normalized = String(value || "").trim().toLowerCase();
  return allowed && allowed.includes(normalized) ? normalized : null;
}
function buyerOrderEligibility({ buyerId, orderOwnerId, accountActive = true } = {}) {
  if (!accountActive) return { eligible: false, reason: "buyer_inactive" };
  if (!buyerId || !orderOwnerId || String(buyerId) !== String(orderOwnerId)) return { eligible: false, reason: "buyer_not_order_owner" };
  return { eligible: true, reason: "eligible" };
}
function sellerOrderEligibility({ sellerActive = true, sellerId, orderSellerId } = {}) {
  if (!sellerActive) return { eligible: false, reason: "seller_inactive" };
  if (!sellerId || !orderSellerId || String(sellerId) !== String(orderSellerId)) return { eligible: false, reason: "seller_not_order_owner" };
  return { eligible: true, reason: "eligible" };
}
function moderationOutcomeForOrder({ orderId, outcome, reason } = {}) {
  const allowed = ["under_review", "actioned", "dismissed", "takedown", "restored"];
  const normalized = String(outcome || "").trim().toLowerCase();
  if (!String(orderId || "").trim() || !allowed.includes(normalized)) return { ok: false, reason: "invalid_moderation_outcome" };
  return { ok: true, orderId: String(orderId).trim().slice(0, 100), category: "moderation", outcome: normalized, reason: String(reason || "").trim().slice(0, 500), requiresOrderReview: ["actioned", "takedown"].includes(normalized), financialMutationPerformed: false };
}
function cancellationEligibility({ status, paid = false, shipmentStatus = "not_ready" } = {}) {
  if (!canTransitionOrder(status, "cancelled")) return { eligible: false, reason: "invalid_order_state" };
  if (paid) return { eligible: false, reason: "paid_order_requires_review" };
  if (["in_transit", "delivered", "returned"].includes(String(shipmentStatus))) return { eligible: false, reason: "shipment_already_started" };
  return { eligible: true, reason: "eligible" };
}
function returnEligibility({ status, deliveredAt, now = new Date().toISOString() } = {}) {
  if (status !== "completed" || !deliveredAt) return { eligible: false, reason: "delivery_not_confirmed" };
  const delivered = Date.parse(deliveredAt), current = Date.parse(now);
  if (!Number.isFinite(delivered) || !Number.isFinite(current) || delivered > current) return { eligible: false, reason: "invalid_delivery_time" };
  if (current - delivered > 30 * 24 * 60 * 60 * 1000) return { eligible: false, reason: "return_window_closed" };
  return { eligible: true, reason: "eligible" };
}
function refundEligibility({ paymentStatus, refundStatus = "none", amount, refundableAmount } = {}) {
  if (paymentStatus !== "paid") return { eligible: false, reason: "payment_not_confirmed" };
  if (["pending", "approved", "completed"].includes(String(refundStatus))) return { eligible: false, reason: "refund_already_in_progress_or_complete" };
  const n = Number(amount), available = Number(refundableAmount);
  if (!Number.isFinite(n) || n <= 0 || !Number.isFinite(available) || available < n) return { eligible: false, reason: "invalid_or_excess_refund_amount" };
  return { eligible: true, reason: "eligible" };
}
function payoutTransitionResult(from, to) {
  const transitions = { not_eligible: ["eligible", "held", "review_required"], eligible: ["held", "released", "review_required"], held: ["eligible", "released", "review_required"], released: ["paid", "review_required"], paid: [], review_required: ["held", "eligible"] };
  return (transitions[String(from || "")] || []).includes(String(to || "")) ? { ok: true, from, to } : { ok: false, reason: "invalid_or_terminal_payout_transition" };
}
function payoutEligibility({ sellerActive = true, orderStatus, paymentStatus, disputeOpen = false, payoutStatus = "not_eligible" } = {}) {
  if (!sellerActive) return { eligible: false, reason: "seller_inactive" };
  if (orderStatus !== "completed" || paymentStatus !== "paid") return { eligible: false, reason: "order_or_payment_incomplete" };
  if (disputeOpen) return { eligible: false, reason: "dispute_open" };
  if (["held", "released", "paid"].includes(String(payoutStatus))) return { eligible: false, reason: "payout_already_held_or_processed" };
  return { eligible: true, reason: "eligible" };
}
const DELIVERY_TRANSITIONS = Object.freeze({ not_started: Object.freeze(["in_transit", "failed"]), in_transit: Object.freeze(["delivered", "failed", "return_to_seller"]), failed: Object.freeze(["in_transit", "return_to_seller"]), delivered: Object.freeze([]), return_to_seller: Object.freeze(["returned"]), returned: Object.freeze([]) });
function canTransitionDelivery(from, to) { return (DELIVERY_TRANSITIONS[String(from || "")] || []).includes(String(to || "")); }
function deliveryTransitionResult(from, to) {
  if (!normalizeMarketplaceState("delivery", from) || !normalizeMarketplaceState("delivery", to)) return { ok: false, reason: "unknown_delivery_state" };
  return canTransitionDelivery(from, to) ? { ok: true, from, to } : { ok: false, reason: "invalid_delivery_transition" };
}
function sellerSuspensionImpact({ sellerSuspended = false, openOrders = 0 } = {}) {
  const count = Number(openOrders);
  return { suspended: !!sellerSuspended, openOrders: Number.isSafeInteger(count) && count > 0 ? count : 0, newOrdersAllowed: !sellerSuspended, existingOrders: sellerSuspended && count > 0 ? "review_required" : "unchanged", autoCancelExistingOrders: false };
}
function disputeTransitionResult(from, to) {
  const transitions = { open: ["pending_buyer_confirmation", "resolved"], pending_buyer_confirmation: ["open", "resolved"], resolved: [] };
  return (transitions[String(from || "")] || []).includes(String(to || "")) ? { ok: true, from, to } : { ok: false, reason: "invalid_or_terminal_dispute_transition" };
}
function normalizeOrderTimeline(events = [], limit = 100) {
  return (Array.isArray(events) ? events : []).map(normalizeOrderEvent).filter((e) => e.id && e.toStatus).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id)).slice(-Math.min(100, Math.max(1, Number(limit) || 100)));
}
function reconciliationDiagnostics({ orders = [], events = [], disputes = [], refunds = [] } = {}) {
  const orderIds = new Set((Array.isArray(orders) ? orders : []).map((o) => String(o.id || "")).filter(Boolean));
  const orphanEvents = (Array.isArray(events) ? events : []).filter((e) => !orderIds.has(String(e.orderId || ""))).length;
  const orphanDisputes = (Array.isArray(disputes) ? disputes : []).filter((d) => !orderIds.has(String(d.orderId || ""))).length;
  const duplicateRefunds = new Set(); let duplicates = 0;
  for (const refund of Array.isArray(refunds) ? refunds : []) { const key = String(refund.reference || refund.id || ""); if (key && duplicateRefunds.has(key)) duplicates++; else if (key) duplicateRefunds.add(key); }
  return { orderCount: orderIds.size, orphanEvents, orphanDisputes, duplicateRefundReferences: duplicates, requiresReview: orphanEvents + orphanDisputes + duplicates > 0, financialMutationPerformed: false };
}
function investigationRecord({ id, orderId, category, reason, createdAt = new Date().toISOString() } = {}) {
  const safe = (v, max = 180) => String(v || "").trim().slice(0, max);
  if (!safe(id, 100) || !safe(orderId, 100) || !safe(category, 80) || !safe(reason, 500)) return { ok: false, reason: "required_investigation_fields_missing" };
  return { ok: true, record: { id: safe(id, 100), orderId: safe(orderId, 100), category: safe(category, 80), reason: safe(reason, 500), status: "open", createdAt: safe(createdAt, 40), resolvedAt: null, resolvedBy: null }, financialMutationPerformed: false };
}
function summarizeMarketplaceCommandCenter({ orders = [], disputes = [], vendors = [], refunds = [] } = {}) {
  const safeOrders = Array.isArray(orders) ? orders : [];
  const byStatus = {};
  for (const order of safeOrders) { const status = ORDER_STATUSES.includes(String(order.status)) ? String(order.status) : "unknown"; byStatus[status] = (byStatus[status] || 0) + 1; }
  return {
    generatedAt: new Date().toISOString(), readOnly: true,
    orders: { total: safeOrders.length, byStatus, attention: safeOrders.filter((o) => !isTerminalOrderStatus(o.status)).length },
    sellers: { total: Array.isArray(vendors) ? vendors.length : 0, suspended: (Array.isArray(vendors) && vendors.some((v) => v.status != null || v.active != null)) ? vendors.filter((v) => String(v.status || "").toLowerCase() === "suspended" || Number(v.active) === 0).length : null, statusCoverage: (Array.isArray(vendors) && vendors.some((v) => v.status != null || v.active != null)) ? "available" : "not_exposed_by_source" },
    disputes: { total: Array.isArray(disputes) ? disputes.length : 0, open: (Array.isArray(disputes) ? disputes : []).filter((d) => !["resolved", "refunded", "closed"].includes(String(d.status || "").toLowerCase())).length },
    refunds: { total: Array.isArray(refunds) ? refunds.length : 0, attention: (Array.isArray(refunds) ? refunds : []).filter((r) => ["pending", "review_required", "failed"].includes(String(r.status || "").toLowerCase())).length },
    note: "Main-owned operational snapshot only. No payout, refund, order, or seller mutation is performed by this read model.",
  };
}

module.exports={ORDER_STATUSES,DISPUTE_STATUSES,summarizeOrder,merchantSummary,normalizeOrderStatus,isOrderStatus,clampOrderLimit,boundRows,normalizeOrderEvent,mergeOrderLists,MARKETPLACE_INVARIANTS,ORDER_TRANSITIONS,TERMINAL_ORDER_STATES,canTransitionOrder,isTerminalOrderStatus,normalizeMarketplaceState,buyerOrderEligibility,sellerOrderEligibility,moderationOutcomeForOrder,cancellationEligibility,returnEligibility,refundEligibility,payoutEligibility,payoutTransitionResult,DELIVERY_TRANSITIONS,canTransitionDelivery,deliveryTransitionResult,sellerSuspensionImpact,disputeTransitionResult,normalizeOrderTimeline,reconciliationDiagnostics,investigationRecord,summarizeMarketplaceCommandCenter};
