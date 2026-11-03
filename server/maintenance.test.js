"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const m=require("./maintenance");

test("expired AI memories are removed only by expiry timestamp",()=>{
  const calls=[]; const db={prepare(sql){calls.push(sql);return{run(...args){calls.push(args);return{changes:4};}};}};
  assert.deepEqual(m.purgeExpiredMemories(db,new Date("2026-09-26T00:00:00.000Z")),{deleted:4});
  assert.match(calls[0],/ai_memories WHERE expiresAt IS NOT NULL AND expiresAt <= \?/);
  assert.equal(calls[1][0],"2026-09-26T00:00:00.000Z");
});

test("workflow run retention is bounded",()=>{
  const calls=[]; const db={prepare(sql){calls.push(sql);return{run(...args){calls.push(args);return{changes:2};}};}};
  const r=m.purgeOldWorkflowRuns(db,99999,new Date("2026-09-26T00:00:00.000Z"));
  assert.equal(r.deleted,2); assert.equal(r.days,3650); assert.match(calls[0],/DELETE FROM ai_workflow_runs WHERE createdAt < \?/);
});


test("expired and consumed fee previews are retired",()=>{
  const calls=[]; const db={prepare(sql){calls.push(sql);return{run(...args){calls.push(args);return{changes:3};}};}};
  assert.deepEqual(m.purgeExpiredFeePreviews(db,new Date("2026-09-26T00:00:00.000Z")),{deleted:3});
  assert.match(calls[0],/DELETE FROM nexa_fee_previews WHERE expiresAt <= \? OR consumedAt IS NOT NULL/);
});

test("workflow receipt retention is bounded",()=>{
  const calls=[]; const db={prepare(sql){calls.push(sql);return{run(...args){calls.push(args);return{changes:2};}};}};
  const r=m.purgeOldWorkflowReceipts(db,99999,new Date("2026-09-26T00:00:00.000Z"));
  assert.equal(r.deleted,2); assert.equal(r.days,3650); assert.match(calls[0],/DELETE FROM ai_workflow_run_receipts WHERE createdAt < \?/);
});

test("orphaned workflow receipts are removed by workflow ownership",()=>{
  const calls=[]; const db={prepare(sql){calls.push(sql);return{run(){return{changes:1};}};}};
  assert.deepEqual(m.purgeOrphanedWorkflowReceipts(db),{deleted:1});
  assert.match(calls[0],/NOT EXISTS \(SELECT 1 FROM ai_workflows/);
});
