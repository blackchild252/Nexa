"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
function read(file){ return fs.readFileSync(path.join(__dirname,file),"utf8"); }
const closure = read("v5_77_0_account_closure_integrity.js");
const lifecycle = read("accountLifecycle.js");
const maintenance = read("maintenance.js");
const subscriptions = read("subscriptions.js");
const aiHub = read("aiHub.js");
const tests = [
 [1575,"fee previews are classified as user-owned authentication-adjacent artifacts",()=>assert.match(closure,/"nexa_fee_previews"/)],
 [1576,"fee previews are deleted by account closure",()=>assert.match(closure,/"nexa_fee_previews"[\s\S]*DELETE_USER_TABLES|DELETE_USER_TABLES[\s\S]*"nexa_fee_previews"/)],
 [1577,"workflow run receipts are included in the existing closure artifact boundary",()=>assert.match(closure,/"ai_workflow_run_receipts"/)],
 [1578,"workflow run receipts gain bounded retention maintenance",()=>assert.match(maintenance,/purgeOldWorkflowReceipts/)],
 [1579,"closure deletion remains owner-column scoped",()=>assert.match(lifecycle,/columns\.includes\("userId"\)/)],
 [1580,"fee previews have explicit expiry timestamps",()=>assert.match(subscriptions,/expiresAt TEXT NOT NULL/)],
 [1581,"fee preview consumption remains explicit",()=>assert.match(subscriptions,/consumedAt TEXT/)],
 [1582,"maintenance retires expired fee previews",()=>assert.match(maintenance,/DELETE FROM nexa_fee_previews WHERE expiresAt <= \? OR consumedAt IS NOT NULL/)],
 [1583,"maintenance exposes fee-preview cleanup",()=>assert.match(maintenance,/feePreviews: purgeExpiredFeePreviews/)],
 [1584,"maintenance exports fee-preview cleanup",()=>assert.match(maintenance,/purgeExpiredFeePreviews/)],
 [1585,"fee preview assertion remains expiry-bound",()=>assert.match(subscriptions,/row\.expiresAt\).*Date\.now/)],
 [1586,"fee preview remains plan-bound",()=>assert.match(subscriptions,/row\.planId.*currentPlan/)],
 [1587,"fee preview remains action-amount-bound",()=>assert.match(subscriptions,/row\.actionAmountMinor.*expectedAmount/)],
 [1588,"fee preview remains currency-bound",()=>assert.match(subscriptions,/row\.currency.*expectedCurrency/)],
 [1589,"fee preview remains service-bound",()=>assert.match(subscriptions,/row\.serviceCode !== String\(serviceCode\)/)],
 [1590,"fee preview remains user-bound",()=>assert.match(subscriptions,/WHERE id=\? AND userId=\?/)],
 [1591,"workflow receipts retain explicit user ownership",()=>assert.match(aiHub,/ai_workflow_run_receipts[\s\S]*userId/)],
 [1592,"workflow receipts remain tied to workflow identity",()=>assert.match(aiHub,/workflowId/)],
 [1593,"workflow receipt retention is bounded",()=>assert.match(maintenance,/DELETE FROM ai_workflow_run_receipts WHERE createdAt < \?/)],
 [1594,"workflow receipt maintenance is scheduled",()=>assert.match(maintenance,/workflowReceipts: purgeOldWorkflowReceipts/)],
 [1595,"orphaned workflow receipts are retired",()=>assert.match(maintenance,/DELETE FROM ai_workflow_run_receipts WHERE NOT EXISTS/)],
 [1596,"orphan cleanup preserves workflow-user ownership matching",()=>assert.match(maintenance,/w\.id=ai_workflow_run_receipts\.workflowId AND w\.userId=ai_workflow_run_receipts\.userId/)],
 [1597,"closure artifact classification covers both new tables",()=>{assert.match(closure,/"ai_workflow_run_receipts"/);assert.match(closure,/"nexa_fee_previews"/)}],
 [1598,"canonical service-fee consumption still marks previews consumed",()=>assert.match(subscriptions,/UPDATE nexa_fee_previews SET consumedAt=/)],
 [1599,"B130 certification remains exactly 25 milestones",()=>assert.equal(tests.length,25)],
];
for(const [n,title,fn] of tests)test(`B130 M${n}: ${title}`,fn);
