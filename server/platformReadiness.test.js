"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { buildPlatformReadiness, DEFINITIONS } = require("./platformReadiness");

test("platform readiness report is read-only, bounded and makes no production certification claim", () => {
  const report = buildPlatformReadiness({ packageVersion: "test-version", generatedAt: "2026-10-09T00:00:00.000Z" });
  assert.equal(report.platformVersion, "test-version");
  assert.equal(report.readOnlyForAdmin, true);
  assert.equal(report.summary.total, 26);
  assert.equal(report.summary.implemented + report.summary.deferred, report.summary.total);
  assert.equal(report.search.maxQueryLength, 80);
  assert.equal(report.search.maxQueryTokens, 8);
  assert.equal(report.items.find((item) => item.key === "productionCertification").available, false);
  assert.match(report.items.find((item) => item.key === "productionCertification").details, /not been certified/i);
});

test("external or incomplete developer capabilities fail closed as deferred", () => {
  const report = buildPlatformReadiness();
  for (const key of ["semanticSearch", "oauth", "webhooks", "sandbox", "productionCertification"]) {
    const item = report.items.find((entry) => entry.key === key);
    assert.equal(item?.status, "deferred", key);
    assert.ok(item.requirements.length >= 3, `${key} must expose concrete completion requirements`);
  }
  assert.ok(report.extensions.scopeCount > 0);
  assert.ok(report.extensions.capabilityCount > 0);
  assert.equal(DEFINITIONS.length, report.items.length);
});


test("Customer Care source traceability is item-level, bounded and does not claim full completion", () => {
  const report = buildPlatformReadiness();
  assert.equal(report.customerCareTraceability.auditedItems, 25);
  assert.equal(report.customerCareTraceability.items.length, 25);
  assert.equal(report.customerCareTraceability.featureComplete, false);
  assert.equal(report.strategicTraceability.customerCareItemsAudited, 25);
  assert.equal(report.strategicTraceability.customerCareFeatureComplete, false);
});
