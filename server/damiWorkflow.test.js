const test = require('node:test');
const assert = require('node:assert/strict');
const w = require('./damiWorkflow');

test('workflow validation allows dependent cross-module steps and marks consequential capabilities', () => {
  const r = w.normalizeWorkflowSteps([
    { intent:'mall', purpose:'find products' },
    { intent:'money', purpose:'show budget', dependsOn:[0] },
    { intent:'scamcheck', purpose:'check seller message', dependsOn:[0,1] },
  ]);
  assert.equal(r.ok,true); assert.equal(r.steps[1].requiresConfirmation,true); assert.deepEqual(r.steps[2].dependsOn,[0,1]);
});
test('workflow rejects forward or self dependencies', () => {
  const r = w.normalizeWorkflowSteps([{intent:'mall'},{intent:'chat',dependsOn:[2]}]);
  assert.equal(r.ok,false);
});
test('memory context is bounded and current instructions have priority', () => {
  const ctx = w.buildMemoryContext([{category:'preference',content:'likes fashion'}],[{title:'Trip',goal:'plan Lagos trip',status:'active',steps:[{title:'book hotel'}]}]);
  assert.match(ctx,/fashion/); assert.match(w.enforceCurrentInstructionPriority('current',ctx),/CURRENT USER MESSAGE has priority/);
});
