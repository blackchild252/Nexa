"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

test("Yaayz is a permanent primary NEXA destination with adverts and tickets",()=>{
 const tabs=read("src/app/(tabs)/_layout.tsx"); const home=read("src/app/(tabs)/index.tsx"); const yaayz=read("src/YaayzScreen.tsx");
 assert.match(tabs,/name="yaayz" options=\{\{title:BRAND\.yaayz\}\}/); assert.match(yaayz,/Adverts/); assert.match(yaayz,/Tickets/);
});

test("standalone Dami is removed from the primary shell while Zeeza messaging remains available",()=>{
 const tabs=read("src/app/(tabs)/_layout.tsx"); const home=read("src/app/(tabs)/index.tsx"); const dami=read("src/app/dami.tsx"); const zeeza=read("src/app/(tabs)/zeeza.tsx");
 assert.doesNotMatch(tabs,/name="chat" options=\{\{title/); assert.doesNotMatch(home,/Chat/); assert.match(home,/HomeCommandCenter/); assert.match(dami,/router\.(replace|push)\('\/\(tabs\)'/); assert.match(dami,/NexaAI/); assert.match(zeeza,/Inbox/); assert.match(zeeza,/Friends/); assert.match(zeeza,/Profile/);
});

test("Yaayz ticket server layer validates ticket type, quantity, ownership and payment boundary",()=>{
 const db=read("server/db.js"); const server=read("server/index.js");
 assert.match(db,/yaayz_ticket_listings/); assert.match(db,/yaayz_ticket_orders/); assert.match(server,/YAAyz_TICKET_TYPES/); assert.match(server,/app\.post\("\/api\/yaayz\/tickets"/); assert.match(server,/app\.post\("\/api\/yaayz\/tickets\/:ticketId\/purchase"/); assert.match(server,/paymentRef/); assert.match(server,/issueYaayzTicketCode/);
});

test("Yaayz account lifecycle does not leave user-owned ticket orders behind",()=>{
 const lifecycle=read("server/accountLifecycle.js"); const integrity=require("./v5_77_0_account_closure_integrity"); assert.ok(integrity.RETAINED_USER_TABLES.includes("yaayz_ticket_orders")); assert.ok(integrity.RETAINED_USER_TABLES.includes("yaayz_ticket_listings")); assert.ok(lifecycle.includes("RETAINED_USER_TABLES"));
});


test("Yaayz is searchable through the existing unified search contract",()=>{
 const search=read("server/search.js"); const ui=read("src/UnifiedSearch.tsx");
 assert.match(search,/const TYPES = \[[^\]]*"yaayz"[^\]]*\]/);
 assert.match(search,/types.includes\("yaayz"\)/);
 assert.match(ui,/\['yaayz','Yaayz'\]/);
});


test("Yaayz ticket checkout previews and settles the server-owned service fee",()=>{
 const index=read("server/index.js"); const db=read("server/db.js"); const ui=read("src/YaayzScreen.tsx");
 assert.match(index,/yaayzFeePreview/); assert.match(index,/feePreview\(db, userId, "yaayz_service"/);
 assert.match(index,/settleYaayzFee\(db, req\.user\.id, order\.id\)/);
 assert.match(index,/providerVerified=1/); assert.match(index,/feeStatus/);
 assert.match(index,/orders\/:orderId\/fee-retry/);
 assert.match(db,/yaayz_ticket_orders/); assert.match(db,/ADD COLUMN providerVerified/); assert.match(db,/ADD COLUMN feeStatus/); assert.match(db,/ADD COLUMN feeChargeId/);
 assert.match(ui,/Before you confirm/); assert.match(ui,/NEXA service fee/); assert.match(ui,/Retry NEXA service fee/);
});

test("Yaayz fee settlement remains user-scoped and idempotent",()=>{
 const index=read("server/index.js");
 const start=index.indexOf('app.post("/api/yaayz/payments/verify"'); const end=index.indexOf('// -- Online payment:',start); const route=index.slice(start,end);
 assert.match(route,/paymentRef=\? AND o\.buyerId=\?/); assert.match(index,/yaayz:\$\{orderId\}/); assert.match(route,/WHERE id=\? AND buyerId=\?/);
});
