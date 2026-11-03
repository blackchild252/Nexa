"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const lifecycle = require("./damiPlanLifecycle");

test("Dami plans support an explicit approval path without executing actions", () => {
  assert.equal(lifecycle.canTransitionPlan("draft", "awaiting_approval"), true);
  assert.equal(lifecycle.canTransitionPlan("awaiting_approval", "approved"), true);
  assert.equal(lifecycle.canTransitionPlan("approved", "active"), true);
  assert.equal(lifecycle.requiresExplicitApproval("awaiting_approval"), true);
  assert.equal(lifecycle.requiresExplicitApproval("approved"), true);
});
test("Dami plan terminal states cannot be reopened by stale updates", () => {
  for (const state of ["cancelled", "archived"]) {
    assert.match(lifecycle.planTransitionError(state, "active"), /terminal state/);
  }
  assert.match(lifecycle.planTransitionError("completed", "active"), /terminal state/);
  assert.equal(lifecycle.planTransitionError("completed", "archived"), null);
});
test("Dami plan lifecycle rejects invalid and skipped approval transitions", () => {
  assert.equal(lifecycle.planTransitionError("draft", "approved"), "Plan status cannot transition from draft to approved.");
  assert.equal(lifecycle.planTransitionError("active", "approved"), "Plan status cannot transition from active to approved.");
  assert.equal(lifecycle.planTransitionError("draft", "not-a-status"), "Invalid plan status.");
});
test("Dami plan cancellation is terminal and does not imply action execution", () => {
  assert.equal(lifecycle.canTransitionPlan("draft", "cancelled"), true);
  assert.equal(lifecycle.canTransitionPlan("active", "cancelled"), true);
  assert.equal(lifecycle.canTransitionPlan("cancelled", "cancelled"), true);
  assert.equal(lifecycle.canTransitionPlan("cancelled", "active"), false);
});
