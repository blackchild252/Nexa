"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const knowledge = require("./damiKnowledgeState");
const memory = require("./damiMemoryReliability");
const workflow = require("./damiWorkflow");

test("B136 knowledge sources receive deterministic trust and stale classification", () => {
  const trusted = knowledge.normalizeKnowledgeSource({id:"1",kind:"system",title:"Policy",text:"A",updatedAt:"2026-10-01T00:00:00Z"});
  const stale = knowledge.normalizeKnowledgeSource({id:"2",kind:"user",title:"Old",text:"B",updatedAt:"2020-01-01T00:00:00Z"});
  assert.equal(trusted.trust, 3);
  assert.equal(trusted.stale, false);
  assert.equal(stale.stale, true);
});

test("B136 knowledge context preserves provenance and contradictory sources", () => {
  const out = knowledge.buildKnowledgeContext([
    {id:"1",kind:"system",title:"Rule",text:"Use A"},
    {id:"2",kind:"user",title:"Rule",text:"Use B"},
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].provenance.kind, "system");
  assert.equal(out[0].conflictGroup, out[1].conflictGroup);
});

test("B136 memory conflicts remain explicit and deterministic", () => {
  const out = memory.resolveMemoryConflicts([
    {id:"1",category:"preference",content:"dark mode",source:"user",confidence:1},
    {id:"2",category:"preference",content:"light mode",source:"module",confidence:1},
  ]);
  assert.equal(out.length, 2);
  assert.equal(out[0].conflict, true);
  assert.equal(out[0].source, "user");
  assert.equal(out[0].precedence > out[1].precedence, true);
});

test("B136 workflow memory context is bounded and current instruction remains authoritative", () => {
  const memories = Array.from({length:20},(_,i)=>({category:"note",content:"x".repeat(500)+i}));
  const ctx = workflow.buildMemoryContext(memories, []);
  assert.equal(ctx.length <= workflow.MAX_MEMORY_CONTEXT_CHARS, true);
  assert.match(workflow.enforceCurrentInstructionPriority("ignore memory",ctx), /CURRENT USER MESSAGE has priority/);
});
