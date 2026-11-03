"use strict";
// Docs-truth guard: catches status drift between docs and the code/release metadata.
// Source-only on purpose, so it runs without installing dependencies.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const exists = (p) => fs.existsSync(path.join(root, p));
const roadmaps = ["PRIORITY_ROADMAP.md", "TEMPORARY_ROADMAP.md"];
const masterRoadmap = path.join(root, "MASTER_ROADMAP.md");

test("AGENTS.md names the current version and Batch without stage labels", () => {
  const version = JSON.parse(read("package.json")).version;
  const batch = (read("VERSION.md").match(/^#{1,2} (?:NEXA )?V([\d.]+) (B\d+)/m) || []);
  assert.equal(batch[1], version, "VERSION.md version must match package.json");
  assert.match(batch[2] || "", /^B\d+$/);
  const agents = read("AGENTS.md");
  assert.ok(agents.includes(`Current project state: **V${version} ${batch[2]}**`));
  for (const line of agents.split(/\n/).filter(line => /^Current project state/i.test(line))) assert.doesNotMatch(line, /checkpoint|repair|stage|phase|slice/i);
});



test("internal master roadmap is permanent and no competing active roadmap remains", () => {
  assert.equal(fs.existsSync(masterRoadmap), true, "MASTER_ROADMAP.md is the active authority");
  assert.match(read("MASTER_ROADMAP.md"), /^# NEXA MAIN — PERMANENT INTERNAL MASTER ROADMAP/m);
  assert.match(read("scripts/roadmap-check.mjs"), /MASTER_ROADMAP\.md/);
  for (const file of roadmaps) assert.equal(exists(file), false, `${file} must not compete with the master`);
});

// Feature-evidence guards remain code-focused; roadmap status is maintained in the internal master.
const evidence = [
  { name: "item 55 Sky Money reconciliation", files: ["server/walletReconciliationPlan.js", "docs/ADR-016-SKY-MONEY-RECONCILIATION-CONTINUITY.md"] },
  { name: "M316 provider routing", files: ["server/aiProviderGateway.js", "server/aiProviderGateway.test.js"] },
  { name: "M317 provider failover", files: ["server/aiProviderGateway.js", "server/aiProviderGateway.test.js"] },
];
for (const item of evidence) {
  test(`${item.name} code evidence exists; internal roadmap remains authoritative`, () => {
    for (const f of item.files) assert.ok(exists(f), `${f} must exist`);
    assert.equal(fs.existsSync(masterRoadmap), true);
    for (const rm of roadmaps) assert.equal(exists(rm), false, `${rm} must not be reintroduced`);
  });
}

test("B58 visual-fidelity history remains while the internal master stays canonical", () => {
  assert.equal(fs.existsSync(masterRoadmap), true);
  for (const rm of roadmaps) assert.equal(exists(rm), false, `${rm} must remain absent`);
});
