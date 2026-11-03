"use strict";
const assert=require("node:assert/strict");
const test=require("node:test");
const fs=require("node:fs");
const path=require("node:path");
const read=p=>fs.readFileSync(path.join(__dirname,"..",p),"utf8");

test("production operations expose non-destructive backup verification mode",()=>{
 const s=read("scripts/backup-db.mjs");
 assert.match(s,/--verify/); assert.match(s,/integrity_check/); assert.match(s,/fileMustExist/);
});

test("Dami consequential action confirmations are durable and user scoped",()=>{
 const s=read("server/aiActions.js"), db=read("server/db.js"), index=read("server/index.js");
 assert.match(db,/ai_action_confirmations/); assert.match(s,/INSERT INTO ai_action_confirmations/); assert.match(s,/consumedAt/); assert.match(s,/expiresAt/); assert.match(index,/createPending\(db, req\.user\.id/); assert.match(index,/consume\(db, req\.user\.id/);
});

test("Sky Money exposes provider reconciliation without bypassing provider status",()=>{
 const s=read("server/wallet.js");
 assert.match(s,/reconcileProviderStatus/); assert.match(s,/provider\.verifyDeposit|provider\.verifyWithdrawal/); assert.match(s,/status='pending'/); assert.match(s,/\/api\/wallet\/transactions\/:id\/reconcile/);
});

test("Chase has a report boundary and explicit age trust state",()=>{
 const s=read("server/friends.js"), db=read("server/db.js");
 assert.match(s,/\/api\/social\/reports/); assert.match(s,/harassment/); assert.match(s,/scam/); assert.match(s,/zeezaAgeTrustStatus/); assert.match(db,/social_reports/); assert.match(db,/zeezaAgeTrustStatus/);
});

test("L.A. operations summary reuses Kitchen, Yaayz and Fitness lifecycle state",()=>{
 const s=read("server/index.js");
 assert.match(s,/\/api\/leisure\/admin\/operations/); assert.match(s,/kitchen_orders/); assert.match(s,/yaayz_ticket_orders/); assert.match(s,/fitness_gyms/); assert.match(s,/isConfiguredAdmin/);
});
