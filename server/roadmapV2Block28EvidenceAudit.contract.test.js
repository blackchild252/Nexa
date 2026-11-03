"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Main Block 28 audit records all 25 ranked rows without claiming feature closure", () => {
  const report = read("docs/CEO_GLOBAL_READINESS_V2_BLOCK28_EVIDENCE_AUDIT.md");
  const queue = read("docs/CEO_GLOBAL_READINESS_V2_CARRY_FORWARD_QUEUE.md");
  const roadmap = fs.existsSync(path.resolve(root, "MASTER_ROADMAP.md")) ? "internal master is authoritative" : "internal master missing";
  const rows = [...report.matchAll(/^\| (\d{3}) \|/gm)].map((m) => Number(m[1]));
  assert.equal(rows.length, 25);
  assert.deepEqual(rows, Array.from({ length: 25 }, (_, i) => i + 1));
  for (const status of ["AUDITED_LOCAL_EVIDENCE_FEATURE_OPEN", "AUDITED_PARTIAL_FEATURE_OPEN", "AUDITED_TARGET_REVIEW_FEATURE_OPEN"]) {
    assert.ok(queue.includes(status), `missing queue status ${status}`);
  }
  assert.match(roadmap, /internal master is authoritative/);
  assert.match(report, /No item is automatically certified complete/);
  assert.match(report, /manual_policy_review_required/);
});

test("Main evidence cited by Block 28 exists and covers auth/recovery/session/identity boundaries", () => {
  const report = read("docs/CEO_GLOBAL_READINESS_V2_BLOCK28_EVIDENCE_AUDIT.md");
  for (const file of [
    "server/authLifecycle.js", "server/auth.js", "server/index.js",
    "server/v5_71_0_verification.contract.test.js",
    "server/v5_72_0_session_integrity.contract.test.js",
    "server/identityVerification.js"
  ]) assert.ok(fs.existsSync(path.join(root, file)), `missing evidence file ${file}`);
  assert.match(report, /durable account lock state/i);
  assert.match(report, /TARGET_REVIEW_REQUIRED/);
  assert.match(report, /real email delivery\/provider acceptance is not configured or tested/);
});
