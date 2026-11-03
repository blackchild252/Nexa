"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = __dirname;
const read = (name) => fs.readFileSync(path.join(root, name), "utf8");
const api = read("aiHub.js");
const schema = read("db.js");
const closure = read("v5_77_0_account_closure_integrity.js");
const validation = read("aiHubValidation.js");
const mainIndex = read("index.js");

test("M6767-M6774: authenticated knowledge routes use bounded ingestion, indexing, citations, and owner-scoped deletion", () => {
  assert.match(api, /app\.post\("\/api\/ai\/knowledge"/);
  assert.match(api, /knowledgeHub\.ingestDocument/);
  assert.match(api, /knowledgeHub\.indexDocuments/);
  assert.match(api, /knowledgeHub\.retrieve/);
  assert.match(api, /knowledgeHub\.deleteSource/);
  assert.match(api, /app\.get\("\/api\/ai\/knowledge\/\:id\/chunks"/);
  assert.match(mainIndex, /damiKnowledgeHub\.retrieve\(message, knowledgeDocs, req\.user\.id, 6\)/);
  assert.match(mainIndex, /if \(retrievedKnowledgeContext\) input\.push/);
  assert.match(api, /WHERE id=\? AND userId=\?/);
});

test("M6781/M6785/M6789: workflow execution is idempotent and emits bounded audit metadata", () => {
  assert.match(api, /INSERT OR IGNORE INTO ai_workflow_idempotency/);
  assert.match(api, /ai_workflow_run_receipts/);
  assert.match(api, /workflow\.execution_completed/);
  assert.match(api, /workflow\.execution_denied/);
  assert.match(api, /app\.get\("\/api\/ai\/workflows\/\:id\/audit"/);
  assert.match(api, /keyFingerprint/);
  assert.doesNotMatch(api, /auditDamiEvent\([^\n]*req\.body\?\.content/);
});

test("M6782/M6783: workflow mutation and run routes remain authenticated and owner-scoped", () => {
  assert.match(api, /app\.patch\("\/api\/ai\/workflows\/\:id", auth\.authMiddleware/);
  assert.match(api, /transitionWorkflowStatus\(w\.status,status,changedDefinition\)/);
  assert.match(api, /WHERE id=\? AND userId=\?/);
  assert.match(api, /Workflow approval is required before execution/);
  assert.match(api, /validateActionConfirmations/);
  assert.match(validation, /Explicit action confirmation is required for every workflow step/);
  assert.match(validation, /Only create_task and save_note workflow steps are supported/);
});

test("M6789: audit schema is durable and user deletion removes its records", () => {
  assert.match(schema, /CREATE TABLE IF NOT EXISTS ai_dami_audit_events/);
  assert.match(schema, /ALTER TABLE ai_knowledge ADD COLUMN type TEXT NOT NULL DEFAULT/);
  assert.match(schema, /idx_ai_dami_audit_user_created/);
  assert.match(closure, /"ai_dami_audit_events"/);
});
