"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPlatformReadiness } = require("./platformReadiness");

test("platform readiness reports international commerce as deferred until real evidence exists", () => {
  const report = buildPlatformReadiness({ packageVersion: "test", generatedAt: "2026-01-01T00:00:00.000Z" });
  const item = report.items.find((entry) => entry.key === "internationalCommerce");
  assert.ok(item);
  assert.equal(item.status, "deferred");
  assert.equal(item.available, false);
  assert.ok(item.requirements.length >= 5);
  assert.equal(report.internationalCommerce.enabled, false);
  assert.equal(report.internationalCommerce.internationalCheckoutEnabled, false);
  assert.equal(report.readOnlyForAdmin, true);
  assert.equal(report.strategicTraceability.strategicMilestones, 500);
  assert.deepEqual(report.strategicTraceability.misfitBlocks, [11, 12, 13]);
  assert.equal(report.strategicTraceability.itemLevelEvidenceAuditComplete, false);
});
