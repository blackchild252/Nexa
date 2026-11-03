"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const workflow = require("./damiWorkflow");
const safety = require("./damiWorkflowSafety");
const runs = require("./damiWorkflowRuns");

test("B136 canonical workflow state normalizes status and completed indexes", () => {
  const r = workflow.normalizeWorkflowState({
    status: " RUNNING ",
    steps: [
      { intent: "mall", purpose: "find" },
      { intent: "money", purpose: "budget", dependsOn: [0] },
    ],
    completed: [0, 0, 9, -1],
  });
  assert.equal(r.ok, true);
  assert.equal(r.state.status, "active");
  assert.deepEqual(r.state.completed, [0]);
  assert.deepEqual(r.state.steps[1].dependsOn, [0]);
});

test("B136 rejects duplicate dependencies and dependency cycles", () => {
  assert.equal(workflow.validateDependencyGraph([
    { intent: "mall", dependsOn: [] },
    { intent: "money", dependsOn: [0, 0] },
  ]).ok, false);
  assert.equal(workflow.validateDependencyGraph([
    { intent: "mall", dependsOn: [1] },
    { intent: "money", dependsOn: [0] },
  ]).ok, false);
});

test("B136 readiness is deterministic and ignores completed invalid indexes", () => {
  const steps = [
    { intent: "mall", dependsOn: [] },
    { intent: "scamcheck", dependsOn: [0] },
    { intent: "money", dependsOn: [1] },
  ];
  const a = workflow.nextReadyStep(steps, new Set([99]));
  const b = workflow.nextReadyStep(steps, new Set([99]));
  assert.deepEqual(a, b);
  assert.equal(a.index, 0);
});

test("B136 bounded state transitions reject illegal transitions", () => {
  assert.equal(workflow.transitionWorkflowState("draft", "active").ok, true);
  assert.equal(workflow.transitionWorkflowState("active", "completed").ok, true);
  assert.equal(workflow.transitionWorkflowState("completed", "active").ok, false);
  assert.equal(workflow.transitionWorkflowState("failed", "completed").ok, false);
});

test("B136 safety and run graph consume canonical dependency state", () => {
  const steps = [{ intent: "mall", dependsOn: [] }, { intent: "money", dependsOn: [0] }];
  const ready = safety.readiness(steps, []);
  assert.equal(ready[0].ready, true);
  assert.equal(ready[1].ready, false);
  assert.deepEqual(runs.dependencyGraph({ steps }), [
    { index: 0, title: "Step 1", dependsOn: [] },
    { index: 1, title: "Step 2", dependsOn: [0] },
  ]);
});
