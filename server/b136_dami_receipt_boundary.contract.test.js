"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const receipts = require("./damiExecutionReceipts");
const runs = require("./damiWorkflowRuns");
const orchestrator = require("./damiOrchestrator");

test("B136 receipt ownership rejects cross-user, cross-workflow, and cross-run bindings", () => {
  const r = {userId:"u1",workflowId:"w1",runId:"r1"};
  assert.equal(receipts.validateReceiptOwnership(r,"u1","w1","r1").ok, true);
  assert.equal(receipts.validateReceiptOwnership(r,"u2","w1","r1").ok, false);
  assert.equal(receipts.validateReceiptOwnership(r,"u1","w2","r1").ok, false);
  assert.equal(receipts.validateReceiptOwnership(r,"u1","w1","r2").ok, false);
});

test("B136 failed runs cannot be resumed as completed and retries stay bounded", () => {
  assert.equal(runs.recoveryDecision({status:"failed",attempts:1,maxAttempts:3}).retry, true);
  assert.equal(runs.recoveryDecision({status:"failed",attempts:3,maxAttempts:3}).retry, false);
  assert.equal(runs.recoveryDecision({status:"completed",attempts:0,maxAttempts:3}).retry, false);
});

test("B136 specialist normalization bounds and strips unsafe object shapes", () => {
  const normalized = orchestrator.normalizeSpecialistResult({type:"mall", products:[{id:"1",name:"A",price:10},{id:"2",name:"B"}], extra:"ignored"});
  assert.deepEqual(normalized, {type:"mall", products:[{id:"1",name:"A",price:10},{id:"2",name:"B"}]});
  assert.equal(JSON.stringify(normalized).length < 2000, true);
});

test("B136 workflow run state rejects unknown recovery transitions", () => {
  assert.equal(runs.transitionRunState("running","failed").ok, true);
  assert.equal(runs.transitionRunState("failed","running").ok, true);
  assert.equal(runs.transitionRunState("completed","running").ok, false);
});
