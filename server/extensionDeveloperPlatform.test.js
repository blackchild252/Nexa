"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const db = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");

test("developer analytics is bounded, owner-scoped to extension records, and no-store", () => {
  const start = index.indexOf('app.get("/api/extensions/developer/analytics"');
  const end = index.indexOf('app.get("/api/extensions/developer/reviews"', start);
  const route = index.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(route, /Math\.max\(7, Math\.min\(90/);
  assert.match(route, /WHERE userId=\? ORDER BY createdAt DESC LIMIT 100/);
  assert.match(route, /JOIN extensions e ON e\.id=l\.extensionId\s+WHERE e\.userId=\?/);
  assert.match(route, /Cache-Control", "no-store"/);
  assert.doesNotMatch(route, /email|password|keyHash|publicConfig/);
});

test("extension review schema preserves developer/reviewer lineage and terminal timestamps", () => {
  assert.match(db, /CREATE TABLE IF NOT EXISTS extension_review_submissions/);
  for (const field of ["extensionId", "userId", "version", "status", "developerNotes", "reviewerId", "reviewerNotes", "submittedAt", "reviewedAt", "updatedAt"]) assert.match(db, new RegExp(`\\b${field}\\b`));
});

test("review submission is extension-owner scoped and duplicate open submissions are rejected", () => {
  const start = index.indexOf('app.post("/api/extensions/:id/review"');
  const end = index.indexOf('app.get("/api/admin/extensions/reviews"', start);
  const route = index.slice(start, end);
  assert.match(route, /WHERE id=\? AND userId=\?/);
  assert.match(route, /status IN \('submitted','in_review'\)/);
  assert.match(route, /status: existing\.status/);
  assert.match(route, /review_submitted/);
});

test("owner review decisions are gated and terminal decisions cannot be changed", () => {
  const start = index.indexOf('app.post("/api/admin/extensions/reviews/:id/decision"');
  const end = index.indexOf('\n});', start) + 4;
  const route = index.slice(start, end);
  assert.match(route, /isConfiguredAdmin\(req\.user\)/);
  assert.match(route, /\["approved", "rejected"\]\.includes\(current\.status\)/);
  assert.match(route, /terminal: \["approved", "rejected"\]/);
  assert.match(route, /review_decision/);
});
