"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { buildCustomerCareTraceability } = require("./customerCareTraceability");
const { buildPlatformReadiness } = require("./platformReadiness");
const ledger = fs.readFileSync(path.join(__dirname, "../docs/CEO_GLOBAL_READINESS_ITEM_CROSSWALK.md"), "utf8");
const roadmap = fs.existsSync(path.join(__dirname, "../MASTER_ROADMAP.md")) ? "internal master is authoritative" : "internal master missing";
const report = buildCustomerCareTraceability();
const checks = [
  ["Help-to-Staff handoff evidence is present", () => assert.equal(report.items[0].status, "implemented")],
  ["Live Staff chat evidence is present but not live-certified", () => { assert.equal(report.items[1].status, "implemented"); assert.match(report.items[1].note, /live acceptance is not established/i); }],
  ["Staff assignment evidence is capability-scoped", () => assert.match(report.items[2].evidence, /adminStaffWork/)],
  ["Queue management is item-audited", () => assert.equal(report.items[3].status, "implemented")],
  ["Priority is constrained and evidenced", () => assert.match(report.items[4].note, /low, normal, high or urgent/)],
  ["SLA timers are explicitly missing", () => assert.equal(report.items[5].status, "missing")],
  ["SLA risk remains unconfigured", () => assert.match(report.items[6].note, /approved SLA policy/)],
  ["Escalation is classified partial", () => assert.equal(report.items[7].status, "partial")],
  ["Transfer is not inferred from reassignment", () => assert.match(report.items[8].note, /not treated as a verified transfer/)],
  ["Supervisor takeover remains missing", () => assert.equal(report.items[9].status, "missing")],
  ["Internal notes are not confused with public messages", () => assert.match(report.items[10].evidence, /private internal-note channel/)],
  ["Customer history is partial, not complete", () => assert.equal(report.items[11].status, "partial")],
  ["Related-order context is unavailable", () => assert.equal(report.items[12].status, "missing")],
  ["Payment context is unavailable rather than inferred", () => assert.match(report.items[13].note, /remains unavailable/)],
  ["Account context is classified partial", () => assert.equal(report.items[14].status, "partial")],
  ["Canned responses remain missing", () => assert.equal(report.items[15].status, "missing")],
  ["Attachments are not claimed without a pipeline", () => assert.equal(report.items[16].status, "missing")],
  ["Conversation search is limited to queue metadata", () => assert.match(report.items[17].note, /transcript full-text search is not established/)],
  ["Reopen evidence is present with limits", () => assert.equal(report.items[18].status, "implemented")],
  ["Resolution reasons remain missing", () => assert.equal(report.items[19].status, "missing")],
  ["Staff performance metrics are partial", () => assert.equal(report.items[20].status, "partial")],
  ["Per-agent workload metrics are not inferred from queue age", () => assert.equal(report.items[21].status, "unverified")],
  ["Support audit durability limitation is explicit", () => assert.match(report.items[22].note, /do not prove durable, complete audit lineage/)],
  ["Admin command center remains separately owned", () => assert.match(report.items[23].note, /Main source evidence cannot certify Admin command-center completeness/)],
  ["All 25 items are reported without claiming feature completion", () => { assert.equal(report.items.length, 25); assert.equal(report.auditedItems, 25); assert.equal(report.featureComplete, false); assert.match(ledger, /MISFIT_OPEN/); assert.match(roadmap, /internal master is authoritative/); }],
];
test("Block 24 Main Customer Care source-evidence crosswalk: 25 milestones", async (t) => {
  assert.equal(checks.length, 25);
  for (let i = 0; i < checks.length; i++) await t.test(`M${6991 + i} ${checks[i][0]}`, checks[i][1]);
});
