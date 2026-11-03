"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("web export preflight identifies missing packages before invoking Expo", () => {
  const result = spawnSync(process.execPath, ["scripts/web-export-preflight.mjs"], { cwd: root, encoding: "utf8", timeout: 8000 });
  assert.ok([0, 2].includes(result.status), result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.readOnly, true);
  assert.ok(report.prerequisites.some(x => x.name === "expo"));
  assert.ok(Array.isArray(report.missing));
  assert.match(report.nextStep, /npm ci|npm run build:web/);
  assert.doesNotMatch(result.stdout, /Exported [0-9]+ files/);
});

test("preview smoke gate blocks non-loopback URLs and has an explicit dependency preflight", () => {
  const source = fs.readFileSync(path.join(root, "scripts/preview-smoke-gate.mjs"), "utf8");
  assert.match(source, /only loopback URLs are allowed/);
  assert.match(source, /Preview smoke prerequisite failure/);
  assert.match(source, /process\.exit\(result\.status/);
});
