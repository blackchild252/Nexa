"use strict";
function userStatus(db,userId) {
  const tickets=db.prepare(`SELECT o.id,o.ticketId,o.quantity,o.total,o.currency,o.status,o.paymentRef,o.ticketCode,o.createdAt,t.title,t.venue,t.startsAt
    FROM yaayz_ticket_orders o JOIN yaayz_ticket_listings t ON t.id=o.ticketId WHERE o.buyerId=? ORDER BY o.createdAt DESC LIMIT 50`).all(userId);
  const kitchen=db.prepare(`SELECT id,total,currency,status,paymentRef,providerVerified,feeStatus,referralCode,createdAt,updatedAt
    FROM kitchen_orders WHERE userId=? ORDER BY createdAt DESC LIMIT 50`).all(userId);
  const pending=tickets.filter(x=>x.status==='pending_payment').length+kitchen.filter(x=>x.status==='pending_payment').length;
  const paid=tickets.filter(x=>x.status==='paid').length+kitchen.filter(x=>x.status==='paid').length;
  return {summary:{pendingPayments:pending,paidOrders:paid},tickets,kitchen};
}
function returnContext(kind, reference) {
  const k=String(kind||"").toLowerCase(); const r=String(reference||"").trim();
  if(!["yaayz","kitchen"].includes(k) || !r || r.length>160) return null;
  return {kind:k,reference:r,route:k==='yaayz'?'/yaayz':'/leisure/kitchen'};
}
module.exports={userStatus,returnContext};
