"use strict";

const crypto = require("node:crypto");

const MILESTONES = Object.freeze([
  [900, "inventory-release-idempotency"],[901,"stock-nonnegative-boundary"],[902,"order-transition-actor-boundary"],[903,"paid-item-cancellation-boundary"],[904,"order-total-recalculation-boundary"],
  [905,"payment-reference-format-boundary"],[906,"payment-currency-normalization"],[907,"payment-amount-integer-boundary"],[908,"webhook-body-hash-continuity"],[909,"webhook-event-replay-binding"],
  [910,"refund-cumulative-cap-boundary"],[911,"refund-currency-binding"],[912,"refund-provider-reference-binding"],[913,"wallet-ledger-balance-boundary"],[914,"wallet-negative-balance-boundary"],
  [915,"wallet-currency-isolation"],[916,"store-ajo-contribution-cap"],[917,"store-ajo-user-ownership"],[918,"money-group-entry-membership-boundary"],[919,"money-group-owner-action-boundary"],
  [920,"vendor-product-ownership-boundary"],[921,"vendor-staff-role-boundary"],[922,"ticket-price-snapshot-boundary"],[923,"ticket-quantity-invariant"],[924,"v5-62-cumulative-financial-integrity-certification"]
]);

function inventoryReleaseOnce(releasedAt) { return !String(releasedAt || "").trim(); }
function stockNonnegative(stock, delta = 0) { const s=Number(stock), d=Number(delta); return Number.isSafeInteger(s)&&Number.isSafeInteger(d)&&s+d>=0; }
function orderTransitionActor(role, from, to, buyerId, sellerId, actorId) {
  if (!actorId) return false;
  const buyerTransitions = new Set(["cancelled","completed"]);
  const sellerTransitions = new Set(["accepted","rejected","fulfilled"]);
  return role === "buyer" ? buyerId === actorId && buyerTransitions.has(to) : role === "seller" ? sellerId === actorId && sellerTransitions.has(to) : false;
}
function paidItemCancellationAllowed(paid, status) { return !(Number(paid) === 1 && String(status) === "cancelled"); }
function orderTotalMatches(items, total, tolerance = 0.005) { const sum=(Array.isArray(items)?items:[]).reduce((n,x)=>n+Number(x.price||0)*Number(x.quantity||0),0); return Number.isFinite(sum)&&Number.isFinite(Number(total))&&Math.abs(sum-Number(total))<=Math.max(0,Number(tolerance)||0); }
function paymentReferenceSafe(ref) { return /^[A-Za-z0-9._:-]{8,160}$/.test(String(ref||"")); }
function normalizeCurrency(currency) { const c=String(currency||"").trim().toUpperCase(); return /^[A-Z]{3}$/.test(c)?c:null; }
function paymentAmountMinorSafe(amount) { const n=Number(amount); return Number.isSafeInteger(n)&&n>0&&n<=Number.MAX_SAFE_INTEGER; }
function webhookBodyHashContinuity(body, expectedHash) { const actual=crypto.createHash("sha256").update(Buffer.isBuffer(body)?body:Buffer.from(String(body??""))).digest("hex"); return /^[a-f0-9]{64}$/i.test(String(expectedHash||"")) && crypto.timingSafeEqual(Buffer.from(actual),Buffer.from(String(expectedHash).toLowerCase())); }
function webhookReplayBinding(eventKey, reference, bodyHash, prior) { return Boolean(String(eventKey||"").trim()&&String(reference||"").trim()&&/^[a-f0-9]{64}$/.test(String(bodyHash||"").toLowerCase())) && (!prior || (prior.reference===reference && String(prior.bodyHash||"").toLowerCase()===String(bodyHash).toLowerCase())); }
function refundCumulativeCap(orderTotal, refunds, requested) { const total=Number(orderTotal), req=Number(requested); const reserved=(Array.isArray(refunds)?refunds:[]).filter(r=>["pending","processing","processed"].includes(String(r.status))).reduce((n,r)=>n+Number(r.amount||0),0); return Number.isFinite(total)&&Number.isFinite(req)&&req>0&&reserved+req<=total+0.005; }
function refundCurrencyMatches(orderCurrency, refundCurrency) { return normalizeCurrency(orderCurrency)!==null && normalizeCurrency(orderCurrency)===normalizeCurrency(refundCurrency); }
function refundProviderReferenceBinding(reference, providerReference) { return paymentReferenceSafe(reference) && String(providerReference||"").trim().length>=4 && String(providerReference).length<=200; }
function walletLedgerBalanced(balanceMinor, ledgerEntries) { const entries=Array.isArray(ledgerEntries)?ledgerEntries:[]; const sum=entries.reduce((n,e)=>n+Number(e.amountMinor||0),0); return Number.isSafeInteger(Number(balanceMinor))&&Number.isSafeInteger(sum)&&Number(balanceMinor)===sum; }
function walletNegativeBalanceAllowed(balanceMinor) { return Number.isSafeInteger(Number(balanceMinor))&&Number(balanceMinor)>=0; }
function walletCurrencyIsolated(accountCurrency, transactionCurrency) { return normalizeCurrency(accountCurrency)!==null && normalizeCurrency(accountCurrency)===normalizeCurrency(transactionCurrency); }
function storeAjoContributionCap(targetAmount, existing, requested) { const total=Number(targetAmount), req=Number(requested); const paid=(Array.isArray(existing)?existing:[]).filter(x=>String(x.status)==="paid").reduce((n,x)=>n+Number(x.amount||0),0); return Number.isFinite(total)&&Number.isFinite(req)&&req>0&&paid+req<=total+0.005; }
function storeAjoOwnership(ajoUserId, actorId) { return Boolean(ajoUserId)&&ajoUserId===actorId; }
function moneyGroupEntryMembership(memberIds, memberId, toMemberId) { const set=new Set((Array.isArray(memberIds)?memberIds:[]).map(String)); return (!memberId||set.has(String(memberId)))&&(!toMemberId||set.has(String(toMemberId))); }
function moneyGroupOwnerAction(ownerId, actorId) { return Boolean(ownerId)&&ownerId===actorId; }
function vendorProductOwnership(productVendorId, actorVendorId) { return Boolean(productVendorId)&&productVendorId===actorVendorId; }
function vendorStaffRole(role, allowed=["staff"]) { return allowed.includes(String(role||"")); }
function ticketPriceSnapshot(listingPrice, orderPrice, quantity) { const a=Number(listingPrice), b=Number(orderPrice), q=Number(quantity); return Number.isFinite(a)&&Number.isFinite(b)&&Number.isSafeInteger(q)&&q>0&&Math.abs(a*q-b)<=0.005; }
function ticketQuantityInvariant(quantity, available) { const q=Number(quantity), a=Number(available); return Number.isSafeInteger(q)&&q>0&&Number.isSafeInteger(a)&&a>=0; }

module.exports={MILESTONES,inventoryReleaseOnce,stockNonnegative,orderTransitionActor,paidItemCancellationAllowed,orderTotalMatches,paymentReferenceSafe,normalizeCurrency,paymentAmountMinorSafe,webhookBodyHashContinuity,webhookReplayBinding,refundCumulativeCap,refundCurrencyMatches,refundProviderReferenceBinding,walletLedgerBalanced,walletNegativeBalanceAllowed,walletCurrencyIsolated,storeAjoContributionCap,storeAjoOwnership,moneyGroupEntryMembership,moneyGroupOwnerAction,vendorProductOwnership,vendorStaffRole,ticketPriceSnapshot,ticketQuantityInvariant};
