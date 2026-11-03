"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("V3.82.1 release contracts are recorded", () => {
  const roadmap = read("MASTER_ROADMAP.md");
  for (const issue of [
    "[COMPLETED V3.82.1] Authentication/session boundary hardening",
    "[COMPLETED V3.82.1] Financial state-machine concurrency hardening",
    "[COMPLETED V3.82.1] Extension capability consent isolation"
  ]) assert.match(roadmap, new RegExp(issue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(read("MASTER_ROADMAP.md"), /V3\.82\.1/);
});

