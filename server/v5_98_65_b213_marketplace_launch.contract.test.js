"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("M3220 Marketplace buyer journey keeps catalog, checkout, cancellation, refund and dispute boundaries",()=>{
 const s=read("server/index.js");
 assert.match(s,/mall\/products/); assert.match(s,/mall\/checkout/); assert.match(s,/mall\/orders/);
 assert.match(s,/rollbackUnpaidCheckout/); assert.match(s,/validateRefundRequest/); assert.match(s,/validateDisputeRequest/);
 assert.match(s,/feePreviewId/); assert.match(s,/criticalControls\.orderAmountInvariant/);
});

test("M3221 Vendor journey requires active vendor entitlement and preserves paid-entry/renewal separation",()=>{
 const s=read("server/index.js"); const v=read("server/vendorSubscriptions.js");
 assert.match(s,/requireVendorAccess/); assert.match(s,/vendor\/register/); assert.match(s,/subscription\/entry\/payment/); assert.match(s,/subscription\/renew/);
 assert.match(v,/FREE_SLOT_LIMIT = 10/); assert.match(v,/ENTRY_AMOUNT_MINOR = 3_000_000/); assert.match(v,/RENEWAL_AMOUNT_MINOR = 1_000_000/);
 assert.match(v,/vendorEntitlement/); assert.match(v,/VENDOR_SUBSCRIPTION_EXPIRED/);
});

test("M3222 Seller trust and Aami rewards remain server-derived and review-eligible",()=>{
 const s=read("server/social.js"); const i=read("server/index.js"); const a=read("server/aamiEconomy.js");
 assert.match(s,/eligibleReviewItem\(orderItemId,req\.user\.id\)/);
 assert.match(s,/i\.status='delivered'/); assert.match(s,/i\.paid=1/);
 assert.match(s,/moderationStatus='published'/); assert.match(s,/sellerReply IS NULL/);
 assert.match(i,/awardActivity\(db,vendorOwner\.userId,'seller_order'/);
 assert.match(a,/seller_order/); assert.match(a,/aami-activity:/);
});

test("M3223 Cross-module launch controls preserve authorization and payment integrity",()=>{
 const s=read("server/index.js"); const v=read("server/vendorSubscriptions.js");
 assert.match(s,/payments\.matchesExpectedPayment/); assert.match(s,/vendorSubscriptions\.assertServerAmount/);
 assert.match(s,/isConfiguredAdmin\(req\.user\)/); assert.match(s,/auth\.authMiddleware/);
 assert.match(s,/UPDATE mall_orders SET providerVerified=1/); assert.match(s,/awardActivity\(db,order\.userId,'marketplace_purchase'/);
 assert.match(v,/status === "success"/); assert.match(v,/currency === CURRENCY/);
});

test("M3224 historical release metadata is preserved while the active strategic queue stays current",()=>{
 const roadmap=read("MASTER_ROADMAP.md"); const report=read("B213_REPORT.md");
 // B213 is historical evidence in the canonical roadmap/report; it must not replace the current V2 execution queue.
 assert.match(roadmap,/M3200–M3224/); assert.match(roadmap,/M3224/);
 assert.match(report,/M3200–M3224 — 25 milestones completed cumulatively/);
 assert.match(roadmap,/CURRENT ACTIVE MAIN BLOCK — M7516–M7540/);
 assert.match(roadmap,/PERMANENT INTERNAL MASTER ROADMAP/);
});
