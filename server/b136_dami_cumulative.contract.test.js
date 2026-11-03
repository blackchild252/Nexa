"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path");
const workflow=require("./damiWorkflow"); const replay=require("./damiReplaySafety"); const receipts=require("./damiExecutionReceipts"); const runs=require("./damiWorkflowRuns"); const knowledge=require("./damiKnowledgeState"); const memory=require("./damiMemoryReliability"); const orch=require("./damiOrchestrator");
const root=path.join(__dirname,"..");

test("B136 M1725-M1748 cumulative workflow and dependency security contract",()=>{
  const state=workflow.normalizeWorkflowState({status:"active",steps:[{intent:"mall",dependsOn:[]},{intent:"money",dependsOn:[0]}],completed:[0]});
  assert.equal(state.ok,true); assert.equal(workflow.validateDependencyGraph([{intent:"mall",dependsOn:[0]}]).ok,false);
  assert.equal(replay.replayEquivalent({workflowId:"w",userId:"u",key:"k"},{workflowId:" w ",userId:" u ",key:" k "}),true);
  assert.equal(replay.confirmationValid({confirmationRequired:true,confirmed:true,createdAt:"2026-10-01T00:09:00Z"},Date.parse("2026-10-01T00:10:00Z"),120000),true);
  assert.equal(receipts.validateReceiptOwnership({userId:"u",workflowId:"w",runId:"r"},"u","w","r").ok,true);
  assert.equal(runs.recoveryDecision({status:"failed",attempts:3,maxAttempts:3}).retry,false);
  assert.equal(orch.normalizeSpecialistResult({type:"mall",products:[{id:"1",name:"A"}]}).products.length,1);
  const k=knowledge.buildKnowledgeContext([{id:"s",kind:"system",title:"Rule",text:"A"},{id:"u",kind:"user",title:"Rule",text:"B"}]);
  assert.equal(k[0].provenance.kind,"system"); assert.equal(k[0].conflictGroup,k[1].conflictGroup);
  assert.equal(memory.resolveMemoryConflicts([{category:"x",content:"A",source:"user"},{category:"x",content:"B",source:"module"}])[0].conflict,true);
});

test("B136 historical contract keeps current release metadata synchronized",()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json"),"utf8")); const mem=JSON.parse(fs.readFileSync(path.join(root,"PROJECT_MEMORY.json"),"utf8"));
  assert.match(mem.currentBatch,/^B\d+$/);
  assert.equal(mem.currentVersion,pkg.version);
  assert.match(fs.readFileSync(path.join(root,"VERSION.md"),"utf8"),new RegExp(`V${pkg.version}`));
});
