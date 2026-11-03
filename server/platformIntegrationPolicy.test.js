"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { CAPABILITIES, buildIntegrationEvidence, strictTrue } = require("./platformIntegrationPolicy");

test("platform integration policy fails closed by default", () => {
  const result = buildIntegrationEvidence();
  assert.equal(result.status, "evidence_incomplete");
  assert.equal(result.activationAllowed, false);
  assert.equal(result.secretsExposed, false);
  assert.equal(result.items.length, 5);
  for (const item of result.items) {
    assert.equal(item.enabled, false);
    assert.equal(item.configured, false);
    assert.equal(item.status, "deferred");
    assert.ok(item.missingRequirements.length > 0);
  }
});

test("only literal boolean true can satisfy a readiness assertion", () => {
  for (const value of ["true", "yes", 1, {}, [], "configured"]) assert.equal(strictTrue(value), false);
  assert.equal(strictTrue(true), true);
});

test("configured but unvalidated integrations are never treated as enabled", () => {
  const result = buildIntegrationEvidence({ configured: { oauth: true, webhooks: true } });
  for (const item of result.items.filter((entry) => ["oauth", "webhooks"].includes(entry.key))) {
    assert.equal(item.status, "configured_unverified");
    assert.equal(item.enabled, false);
    assert.equal(item.validated, false);
  }
});

test("evidence completeness requires every named gate plus provider validation, review and live acceptance", () => {
  const gates = {};
  for (const [key, required] of Object.entries(CAPABILITIES)) gates[key] = Object.fromEntries(required.map((name) => [name, true]));
  const full = { configured: {}, validated: {}, independentReview: {}, liveAcceptance: {}, gates };
  for (const key of Object.keys(CAPABILITIES)) {
    full.configured[key] = true; full.validated[key] = true; full.independentReview[key] = true; full.liveAcceptance[key] = true;
  }
  const result = buildIntegrationEvidence(full);
  assert.equal(result.status, "evidence_complete");
  assert.ok(result.items.every((item) => item.status === "evidence_complete" && item.enabled === false));
  full.gates.oauth.pkceS256 = false;
  assert.equal(buildIntegrationEvidence(full).items.find((item) => item.key === "oauth").status, "configured_unverified");
});
