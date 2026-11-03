"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { validateSteps, transitionWorkflowStatus, validateActionConfirmations } = require("./aiHubValidation");

test("M6775: workflow model permits only known local actions", () => {
  assert.equal(validateSteps([{ type: "create_task", title: "Review" }]).value.length, 1);
  assert.match(validateSteps([{ type: "send_payment", title: "Pay" }]).error, /Only create_task and save_note/);
});

test("M6776: workflow creation schema bounds and normalizes owner-owned draft steps", () => {
  assert.equal(validateSteps([{ type: "save_note", content: "hello" }]).value[0].content, "hello");
  assert.ok(validateSteps([]).error);
  assert.ok(validateSteps(Array.from({ length: 21 }, () => ({ type: "save_note", content: "x" }))).error);
});

test("M6777: only drafts can be edited; submitted, approved and active definitions are immutable", () => {
  assert.equal(transitionWorkflowStatus("draft", "draft", true).ok, true);
  for (const status of ["awaiting_approval", "approved", "active"]) assert.equal(transitionWorkflowStatus(status, status, true).ok, false);
  assert.equal(transitionWorkflowStatus("active", "active", false).ok, true);
});

test("M6778/M6779/M6784: workflow approval must precede activation and execution", () => {
  assert.equal(transitionWorkflowStatus("draft", "awaiting_approval", false).ok, true);
  assert.equal(transitionWorkflowStatus("draft", "approved", false).ok, false);
  assert.equal(transitionWorkflowStatus("draft", "active", false).ok, false);
  assert.equal(transitionWorkflowStatus("awaiting_approval", "approved", false).ok, true);
  assert.equal(transitionWorkflowStatus("approved", "active", false).ok, true);
  assert.equal(transitionWorkflowStatus("active", "archived", false).ok, true);
});

test("M6780: archived workflow state is terminal", () => {
  assert.equal(transitionWorkflowStatus("archived", "draft", false).ok, false);
  assert.equal(transitionWorkflowStatus("archived", "archived", false).ok, false);
  assert.equal(transitionWorkflowStatus("draft", "cancelled", false).ok, true);
  assert.equal(transitionWorkflowStatus("cancelled", "active", false).ok, false);
});

test("M6782/M6783: action allowlist excludes external action execution", () => {
  for (const type of ["transfer_money", "send_email", "call_external_api", "delete_account"]) {
    assert.ok(validateSteps([{ type, title: "Do it" }]).error);
  }
});

test("M6784: each workflow step requires an explicit action-specific confirmation", () => {
  const steps = [{ type: "create_task", title: "Create task" }, { type: "save_note", content: "Save note" }];
  assert.equal(validateActionConfirmations(steps, true, [0, 1]).ok, true);
  assert.equal(validateActionConfirmations(steps, true, [0]).ok, false);
  assert.equal(validateActionConfirmations(steps, true, [0, 0, 1]).ok, false);
  assert.equal(validateActionConfirmations(steps, false, [0, 1]).status, 428);
});
