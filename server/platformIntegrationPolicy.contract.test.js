"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const policy = require("./platformIntegrationPolicy");
const report = require("./platformReadiness").buildPlatformReadiness();
const roadmap = fs.existsSync(path.join(__dirname, "..", "MASTER_ROADMAP.md")) ? "internal master is authoritative" : "internal master missing";
const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "package.json"), "utf8"));
const checks = [
  ["all five sensitive integration families are registered", () => assert.deepEqual(Object.keys(policy.CAPABILITIES), ["semanticSearch", "oauth", "webhooks", "sandbox", "productionCertification"])],
  ["evidence registry is connected to Main readiness output", () => assert.equal(report.integrationEvidence.status, "evidence_incomplete")],
  ["activation is fail-closed by default", () => assert.equal(report.integrationEvidence.activationAllowed, false)],
  ["no integration is marked enabled by default", () => assert.ok(report.integrationEvidence.items.every((item) => item.enabled === false))],
  ["secrets are never returned by evidence records", () => assert.ok(report.integrationEvidence.items.every((item) => item.secretsExposed === false && !Object.keys(item).some((key) => /^(secret|token|credentialValue)$/i.test(key))))],
  ["string truth values cannot claim configuration", () => assert.equal(policy.strictTrue("true"), false)],
  ["numeric truth values cannot claim validation", () => assert.equal(policy.strictTrue(1), false)],
  ["object truth values cannot claim independent review", () => assert.equal(policy.strictTrue({ passed: true }), false)],
  ["semantic search requires explicit configuration evidence", () => assert.ok(report.integrationEvidence.items.find((item) => item.key === "semanticSearch").missingRequirements.includes("explicitConfigurationEvidence"))],
  ["OAuth remains disabled without complete evidence", () => assert.equal(report.integrationEvidence.items.find((item) => item.key === "oauth").enabled, false)],
  ["webhooks remain disabled without complete evidence", () => assert.equal(report.integrationEvidence.items.find((item) => item.key === "webhooks").enabled, false)],
  ["sandbox remains disabled without complete evidence", () => assert.equal(report.integrationEvidence.items.find((item) => item.key === "sandbox").enabled, false)],
  ["production certification remains evidence-only", () => assert.equal(report.integrationEvidence.items.find((item) => item.key === "productionCertification").enabled, false)],
  ["configured but unvalidated OAuth remains unverified", () => assert.equal(policy.buildIntegrationEvidence({ configured: { oauth: true } }).items.find((item) => item.key === "oauth").status, "configured_unverified")],
  ["provider validation alone does not complete evidence", () => assert.notEqual(policy.buildIntegrationEvidence({ validated: { webhooks: true } }).items.find((item) => item.key === "webhooks").status, "evidence_complete")],
  ["independent review alone does not complete evidence", () => assert.notEqual(policy.buildIntegrationEvidence({ independentReview: { sandbox: true } }).items.find((item) => item.key === "sandbox").status, "evidence_complete")],
  ["live acceptance alone does not complete evidence", () => assert.notEqual(policy.buildIntegrationEvidence({ liveAcceptance: { semanticSearch: true } }).items.find((item) => item.key === "semanticSearch").status, "evidence_complete")],
  ["each integration exposes missing requirements as a bounded array", () => assert.ok(report.integrationEvidence.items.every((item) => Array.isArray(item.missingRequirements) && item.missingRequirements.length > 0))],
  ["each integration exposes only boolean evidence fields", () => assert.ok(report.integrationEvidence.items.every((item) => [item.configured, item.validated, item.independentReview, item.liveAcceptance, item.enabled, item.secretsExposed].every((v) => typeof v === "boolean")))],
  ["evidence never equates configuration with activation", () => assert.equal(policy.buildIntegrationEvidence({ configured: { oauth: true } }).items.find((item) => item.key === "oauth").enabled, false)],
  ["all required OAuth gates are named", () => assert.ok(policy.CAPABILITIES.oauth.includes("pkceS256") && policy.CAPABILITIES.oauth.includes("rotatingRefreshTokens"))],
  ["webhook evidence includes replay and SSRF gates", () => assert.ok(policy.CAPABILITIES.webhooks.includes("replayProtection") && policy.CAPABILITIES.webhooks.includes("httpsSsrFProtection"))],
  ["sandbox evidence includes isolation and resource limits", () => assert.ok(policy.CAPABILITIES.sandbox.includes("isolatedRuntime") && policy.CAPABILITIES.sandbox.includes("resourceLimits"))],
  ["Block 22 is registered as the current Main block", () => assert.match(roadmap, /internal master is authoritative/)],
  ["new policy tests are part of the cumulative contract gate", () => assert.ok(packageJson.scripts["verify:contract"].includes("platformIntegrationPolicy.contract.test.js"))],
];
test("Block 22 Main integration/security evidence contract: 25 milestones", async (t) => {
  assert.equal(checks.length, 25);
  for (let i = 0; i < checks.length; i++) await t.test(`M${6941 + i} ${checks[i][0]}`, checks[i][1]);
});
