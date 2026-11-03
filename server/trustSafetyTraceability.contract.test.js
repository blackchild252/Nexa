"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildTrustSafetyTraceability } = require("./trustSafetyTraceability");
const { buildPlatformReadiness } = require("./platformReadiness");
const audit = buildTrustSafetyTraceability();
const root = path.join(__dirname, "..");
const checks = [
  ["reporting sources are cross-mapped without claiming one canonical intake", () => { assert.equal(audit.items[0].status, "partial"); assert.match(audit.items[0].note, /single canonical/); }],
  ["violation model convergence remains partial", () => assert.equal(audit.items[1].status, "partial")],
  ["state graph gap is explicit", () => assert.match(audit.items[2].note, /transition graph/)],
  ["automated risk scoring is not invented", () => assert.equal(audit.items[3].status, "missing")],
  ["text content boundary is not overstated as general screening", () => assert.match(audit.items[4].note, /not a general content screening/)],
  ["image provider absence is explicit", () => assert.equal(audit.items[5].status, "missing")],
  ["video screening remains externally deferred", () => assert.equal(audit.items[6].status, "deferred")],
  ["profile risk provenance gap is explicit", () => assert.match(audit.items[7].note, /provenance/)],
  ["seller risk aggregation remains partial", () => assert.equal(audit.items[8].status, "partial")],
  ["vendor moderation is not equated with a unified risk score", () => assert.match(audit.items[9].note, /unified vendor-risk score/)],
  ["message risk is not inferred from human reports", () => assert.match(audit.items[10].note, /not described as automated detection/)],
  ["product moderation evidence is bounded", () => assert.equal(audit.items[11].status, "partial")],
  ["moderation queue limitations are explicit", () => assert.match(audit.items[12].note, /cross-domain deduplication/)],
  ["Staff moderation privilege gaps are recorded", () => assert.match(audit.items[13].note, /least-privilege/)],
  ["Admin escalation is not claimed as universal", () => assert.match(audit.items[14].note, /every moderation source/)],
  ["three-strike automatic closure policy risk is disclosed", () => assert.match(audit.items[15].note, /closes accounts at three confirmed violations/)],
  ["enforcement ladder remains partial", () => assert.equal(audit.items[16].status, "partial")],
  ["temporary restriction lifecycle is not inferred", () => assert.equal(audit.items[17].status, "missing")],
  ["permanent restrictions are not treated as one common model", () => assert.match(audit.items[18].note, /common permanent restriction model/)],
  ["appeal intake completion is not overstated", () => assert.match(audit.items[19].note, /not certified/)],
  ["appeal reviewer independence remains open", () => assert.match(audit.items[20].note, /reviewer independence/)],
  ["audit durability is not assumed from partial event logging", () => assert.match(audit.items[21].note, /append-only lineage/)],
  ["safety analytics disclose incomplete definitions and coverage", () => assert.match(audit.items[22].note, /missing-source disclosure/)],
  ["Lifestyle video moderation remains deferred", () => assert.equal(audit.items[23].status, "deferred")],
  ["all 25 requirements are exposed through Main readiness without feature certification", () => { assert.equal(audit.auditedItems, 25); assert.equal(audit.featureComplete, false); assert.equal(audit.counts.partial + audit.counts.missing + audit.counts.deferred + audit.counts.implemented + audit.counts.unverified, 25); const report = buildPlatformReadiness({}); assert.equal(report.trustSafetyTraceability.auditedItems, 25); assert.equal(report.trustSafetyTraceability.featureComplete, false); }],
];
test("Block 25 Main Trust/Safety traceability contract: 25 milestones", async (t) => {
  assert.equal(checks.length, 25);
  for (let i = 0; i < checks.length; i++) await t.test(`M${7016 + i} ${checks[i][0]}`, checks[i][1]);
});
test("Block 25 Main evidence paths named in inventory exist where they refer to repository files", () => {
  for (const item of audit.items) {
    const first = item.evidence.split(";")[0].trim();
    if (/^server\//.test(first)) assert.ok(fs.existsSync(path.join(root, first)), `${first} must exist`);
  }
});
