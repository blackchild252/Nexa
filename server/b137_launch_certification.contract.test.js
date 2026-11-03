"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { B137_MILESTONES, evaluateProductionCertification } = require("./productionLaunchCertification");

const root = path.join(__dirname, "..");
const BASE = {
  NODE_ENV: "production", NEXA_STRICT_LAUNCH: "1", NEXA_LAUNCH_CERTIFIED: "1",
  DB_PATH: "/data/nexa.db", PUBLIC_URL: "https://api.example.com", CORS_ORIGINS: "https://app.example.com",
  PAYMENT_MODE: "live", PAYMENTS_ENABLED: "true", PAYSTACK_SECRET_KEY: "sk_live_real",
  NEXA_WALLET_MODE: "live", MARKET_DATA_MODE: "live", NEXA_ADMIN_EMAILS: "owner@example.com",
  XAI_API_KEY: "real-grok-key", DAMI_AI_PROVIDER: "grok", SENTRY_DSN: "https://x@sentry.io/1",
  SENTRY_ENVIRONMENT: "production", BACKUP_DIR: "/data/backups", BACKUP_MAX_AGE_HOURS: "26",
  GOOGLE_CLIENT_ID: "google-id", GOOGLE_CLIENT_SECRET: "google-secret", GOOGLE_REDIRECT_URI: "https://api.example.com/auth/google/callback"
};

function certified(env = {}) { return evaluateProductionCertification({ env: { ...BASE, ...env }, root }); }

test("B137 defines exactly 25 cumulative milestones M1750-M1774", () => {
  assert.equal(B137_MILESTONES.length, 25);
  assert.deepEqual(B137_MILESTONES.map(([m]) => m), Array.from({ length: 25 }, (_, i) => 1750 + i));
  assert.equal(new Set(B137_MILESTONES.map(([, name]) => name)).size, 25);
});

test("B137 production certification blocks any launch-readiness failure or warning", () => {
  assert.equal(certified().ok, true);
  assert.equal(certified({ NEXA_STRICT_LAUNCH: "0" }).ok, false);
  assert.equal(certified({ NEXA_WALLET_MODE: "sandbox" }).ok, false);
  assert.equal(certified({ SENTRY_DSN: "" }).ok, false);
  assert.equal(certified({ CORS_ORIGINS: "" }).ok, false);
});

test("B137 certification requires production identity and no preview/test modes", () => {
  assert.equal(certified({ NODE_ENV: "development" }).ok, false);
  assert.equal(certified({ NEXA_PREVIEW_MODE: "1" }).ok, false);
  assert.equal(certified({ NEXA_E2E_PASSWORD: "fixture" }).ok, false);
  assert.equal(certified({ NEXA_SEED_FIXTURES: "1" }).ok, false);
});

test("B137 certification verifies Google OAuth, AI provider, payments, DB, backups and runtime contracts", () => {
  for (const env of [
    { GOOGLE_CLIENT_SECRET: "" },
    { GOOGLE_REDIRECT_URI: "http://api.example.com/callback" },
    { XAI_API_KEY: "your_key_here" },
    { PAYSTACK_SECRET_KEY: "sk_test_bad" },
    { DB_PATH: "relative.db" },
    { BACKUP_DIR: "" },
  ]) assert.equal(certified(env).ok, false);
});

test("B137 certification verifies AdMob/Yaayz and production integration source boundaries", () => {
  const result = certified();
  assert.equal(result.staticChecks.admob.ok, true);
  assert.equal(result.staticChecks.yaayz.ok, true);
  assert.equal(result.staticChecks.googleSdk.ok, true);
  assert.equal(result.staticChecks.notifications.ok, true);
  assert.equal(result.staticChecks.calls.ok, true);
});

test("B137 certification report is safe and deterministic", () => {
  const result = certified();
  assert.equal(result.production, true);
  assert.equal(result.certified, true);
  assert.equal(result.ok, true);
  assert.ok(result.total >= 25);
  const serialized = JSON.stringify(result);
  for (const secret of ["real-grok-key", "google-secret", "sk_live_real"]) assert.equal(serialized.includes(secret), false);
});

test("B137 startup uses the authoritative production certification boundary", () => {
  const idx = fs.readFileSync(path.join(root, "server/index.js"), "utf8");
  assert.match(idx, /productionLaunchCertification/);
  assert.match(idx, /productionCertification\.shouldBlockStart/);
});
