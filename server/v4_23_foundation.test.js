"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const settlement = require("./walletSettlement");
const appeals = require("./trustAppeals");
const merchant = require("./merchantOperations");
const knowledge = require("./damiKnowledgeState");

test("V4.23 accessibility contract preserves minimum touch target", () => {
  const source = fs.readFileSync(require.resolve("../src/accessibility.ts"), "utf8");
  assert.match(source, /minTouchTarget:\s*44/);
  assert.match(source, /recommendedTouchTarget:\s*48/);
  assert.match(source, /maxTextScaleLayoutRisk:\s*1\.3/);
  assert.match(source, /touch-targets/);
  assert.match(source, /text-scaling/);
  assert.match(source, /screen-reader-labels/);
  assert.match(source, /keyboard-focus/);
});

test("V4.23 settlement refuses mismatched provider identity", () => {
  const d = settlement.reconciliationDecision({providerReference:"p1",source:"provider",amountMinor:1000,currency:"NGN"},{providerReference:"p2",status:"success",amountMinor:1000,currency:"NGN"});
  assert.equal(d.safeToApply, false);
  assert.equal(d.referenceMatches, false);
});

test("V4.23 appeals only open for actioned or dismissed reports by the subject", () => {
  assert.equal(appeals.canAppeal({status:"actioned",subjectId:"u1"},"u1"),true);
  assert.equal(appeals.canAppeal({status:"open",subjectId:"u1"},"u1"),false);
  assert.equal(appeals.canAppeal({status:"dismissed",subjectId:"u1"},"u2"),false);
});

test("V4.23 merchant operations reports attention and venue readiness", () => {
  const summary = merchant.summarizeMerchantRows([{status:"pending"},{status:"fulfilled"},{status:"confirmed"}]);
  assert.equal(summary.total,3);
  assert.equal(summary.needsAttention,2);
  assert.equal(merchant.venueReadiness({ownerVerified:true,contactReady:true,fulfillmentReady:true}).ready,true);
});

test("V4.23 Dami knowledge state is bounded and deduplicated", () => {
  const rows = knowledge.buildKnowledgeContext([{id:"1",kind:"user",title:"A",text:"Hello"},{id:"2",kind:"user",title:"A",text:"Hello"},{id:"3",kind:"module",title:"Money",text:"Wallet"}]);
  assert.equal(rows.length,2);
  assert.equal(rows[0].text,"Hello");
});
