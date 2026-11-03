"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const replay = require("./damiReplaySafety");
const safety = require("./damiWorkflowSafety");
const receipts = require("./damiExecutionReceipts");

test("B136 replay keys normalize equivalent identifiers and isolate users", () => {
  assert.equal(replay.replayKey(" w1 ", " u1 ", " key "), "w1:u1:key");
  assert.notEqual(replay.replayKey("w1", "u1", "key"), replay.replayKey("w1", "u2", "key"));
  assert.equal(replay.replayEquivalent({workflowId:"w1",userId:"u1",key:"k"},{workflowId:" w1 ",userId:" u1 ",key:" k "}), true);
});

test("B136 confirmation validity rejects missing, expired, and invalid confirmations", () => {
  const now = Date.parse("2026-10-01T00:10:00.000Z");
  assert.equal(replay.confirmationValid({confirmationRequired:true,confirmed:true,createdAt:"2026-10-01T00:09:00.000Z"}, now, 120000), true);
  assert.equal(replay.confirmationValid({confirmationRequired:true,confirmed:true,createdAt:"2026-10-01T00:00:00.000Z"}, now, 120000), false);
  assert.equal(replay.confirmationValid({confirmationRequired:true,confirmed:false,createdAt:"2026-10-01T00:09:00.000Z"}, now, 120000), false);
});

test("B136 consequential audit never authorizes an expired confirmation", () => {
  const steps = [{intent:"money",requiresConfirmation:true}];
  const audit = safety.audit(steps, [], true, {now:Date.parse("2026-10-01T00:10:00.000Z"), confirmedAt:"2026-10-01T00:00:00.000Z", maxAgeMs:120000});
  assert.equal(audit[0].executable, false);
});

test("B136 idempotency decision reuses only an exact user/workflow/key match", () => {
  const prior = {workflowId:"w1",userId:"u1",idempotencyKey:"k1",status:"completed",result:{ok:true}};
  assert.deepEqual(receipts.idempotencyDecision(prior,{workflowId:"w1",userId:"u1",idempotencyKey:"k1"}), {reuse:true,result:{ok:true}});
  assert.equal(receipts.idempotencyDecision(prior,{workflowId:"w1",userId:"u2",idempotencyKey:"k1"}).reuse, false);
});
