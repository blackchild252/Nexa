"use strict";
const REFUND_STATUSES = Object.freeze(["pending","processing","processed","failed"]);
const DISPUTE_STATUSES = Object.freeze(["open","pending_buyer_confirmation","resolved"]);
const ORDER_STATUSES = Object.freeze(["placed","confirmed","shipped","delivered","cancelled"]);
function orderLifecycle(order={}) {
  const status = ORDER_STATUSES.includes(String(order.status)) ? String(order.status) : "unknown";
  return { id:String(order.id||""), status, paymentVerified:Boolean(order.providerVerified), paymentRef:order.paymentRef||null, attention:["placed","confirmed","shipped"].includes(status) };
}
function refundSummary(rows=[]) {
  const counts=Object.fromEntries(REFUND_STATUSES.map(s=>[s,0]));
  let total=0;
  for(const r of rows){ const s=REFUND_STATUSES.includes(String(r.status))?String(r.status):"failed"; counts[s]++; total += Number(r.amount)||0; }
  return {counts,total:Number(total.toFixed(2)),active:counts.pending+counts.processing};
}
function disputeSummary(rows=[]) {
  const counts=Object.fromEntries(DISPUTE_STATUSES.map(s=>[s,0]));
  for(const r of rows){ const s=DISPUTE_STATUSES.includes(String(r.status))?String(r.status):"open"; counts[s]++; }
  return {counts,open:counts.open+counts.pending_buyer_confirmation};
}
module.exports={REFUND_STATUSES,DISPUTE_STATUSES,ORDER_STATUSES,orderLifecycle,refundSummary,disputeSummary};
