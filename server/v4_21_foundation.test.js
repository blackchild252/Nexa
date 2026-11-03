"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { walletProviderReadiness } = require("./walletProviderReadiness");
const trust = require("./trustSafetyOperations");
const experience = require("./experienceOperations");
const dami = require("./damiProviderPolicy");

test("live wallet mode fails readiness without provider configuration", () => {
  assert.equal(walletProviderReadiness({ NEXA_WALLET_MODE: "live" }).ready, false);
  assert.equal(walletProviderReadiness({ NEXA_WALLET_MODE: "sandbox" }).ready, true);
  assert.equal(walletProviderReadiness({ NEXA_WALLET_MODE: "live", NEXA_WALLET_PROVIDER: "psp", NEXA_WALLET_WEBHOOK_SECRET: "secret" }).ready, false);
  const configuredButUnregistered = walletProviderReadiness({ NEXA_WALLET_MODE: "live", NEXA_WALLET_PROVIDER: "psp", NEXA_WALLET_WEBHOOK_SECRET: "secret", NEXA_WALLET_PROVIDER_ADAPTER: "configured" });
  assert.equal(configuredButUnregistered.configured, true);
  assert.equal(configuredButUnregistered.adapterAvailable, false);
  assert.equal(configuredButUnregistered.ready, false);
});

test("trust reports normalize safely and urgent reasons escalate", () => {
  const report = trust.normalizeTrustReport({ id: "r1", reporterId: "u1", subjectId: "u2", reason: "child_safety", escalation: "urgent" });
  assert.equal(report.status, "open");
  assert.equal(trust.requiresUrgentReview(report), true);
});

test("experience lifecycle summary is bounded to canonical states", () => {
  const result = experience.summarizeLifecycle([{status:"confirmed"},{status:"bad"},{status:"refunded"}]);
  assert.deepEqual(result.counts, {pending:1, confirmed:1, fulfilled:0, refunded:1, cancelled:0});
});

test("Dami provider policy bounds cost and prevents action fallback by default", () => {
  const policy = dami.getDamiProviderPolicy({ DAMI_PROVIDER_TIMEOUT_MS: "999999", DAMI_MAX_OUTPUT_TOKENS: "999999" });
  assert.equal(policy.timeoutMs, 30000);
  assert.equal(policy.maxOutputTokens, 1200);
  assert.equal(policy.allowActionFallback, false);
  assert.equal(dami.canRetryAction(policy, 0), false);
});

test("CI uses the reproducible npm install path once the lockfile is present", () => {
  const workflow = fs.readFileSync(path.join(__dirname, "..", ".github", "workflows", "nexa-quality.yml"), "utf8");
  assert.match(workflow, /npm ci/);
});
