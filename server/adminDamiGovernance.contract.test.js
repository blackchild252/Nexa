"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "adminDamiGovernance.js"), "utf8");
const model = fs.readFileSync(path.join(__dirname, "adminDamiGovernanceModel.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

test("M8101-M8109: Admin Knowledge Hub is durable, owner-scoped, cited and delete-aware", () => {
  assert.match(source, /CREATE TABLE IF NOT EXISTS admin_dami_knowledge/);
  assert.match(source, /ownerId=\? AND scope='admin-operations'/);
  assert.match(source, /governance\.ingestAdminDocument/);
  assert.match(source, /governance\.indexAdminDocuments/);
  assert.match(source, /governance\.retrieveAdminKnowledge/);
  assert.match(model, /untrusted-content/);
  assert.match(source, /status='deleted',chunks='\[\]'/);
  assert.match(source, /owner\s*=\s*admin\.require\("operations"\)/);
});

test("M8110-M8121: Admin workflows persist versioned lifecycle and recommendation receipts without execution", () => {
  assert.match(source, /CREATE TABLE IF NOT EXISTS admin_dami_workflows/);
  assert.match(source, /UPDATE admin_dami_workflows SET status=\?,version=\?,updatedAt=\? WHERE id=\? AND ownerId=\? AND version=\? AND status=\?/);
  assert.match(source, /governance\.transitionAdminWorkflow/);
  assert.match(model, /APPROVAL_REQUIRED/);
  assert.match(source, /governance\.receipt/);
  assert.match(source, /executed: false/);
  assert.match(source, /UNIQUE\(ownerId,idempotencyKey\)/);
  assert.doesNotMatch(source, /fetch\(|axios|child_process|spawn\(/);
});

test("M8122-M8125: Admin Dami API mounts separately and has bounded audit history", () => {
  assert.match(index, /registerAdminDamiGovernance\(\{app,auth,admin:adminAccess,db\}\)/);
  assert.match(source, /CREATE TABLE IF NOT EXISTS admin_dami_events/);
  assert.match(source, /LIMIT 80/);
  assert.match(source, /externalActionExecution: false/);
  assert.match(source, /consumerKnowledgeAccess: false/);
  assert.match(model, /function buildAdminContext/);
});
