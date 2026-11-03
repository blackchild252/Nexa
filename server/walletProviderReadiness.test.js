"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { walletProviderReadiness } = require("./walletProviderReadiness");
const { getWalletProvider } = require("./walletProvider");
const fs = require("node:fs");
const path = require("node:path");

test("sandbox is explicitly simulation-only outside production", () => {
  const state = walletProviderReadiness({ NODE_ENV: "development", NEXA_WALLET_MODE: "sandbox" });
  assert.equal(state.ready, true); assert.equal(state.status, "sandbox"); assert.equal(state.readyForCredentials, false);
  assert.equal(getWalletProvider().realFunds, false);
});
test("production sandbox mode fails closed", () => {
  const state = walletProviderReadiness({ NODE_ENV: "production", NEXA_WALLET_MODE: "sandbox" });
  assert.equal(state.ready, false); assert.equal(state.status, "blocked_sandbox_in_production");
});
test("unknown wallet mode is invalid and cannot activate a provider", () => {
  const state = walletProviderReadiness({ NODE_ENV: "development", NEXA_WALLET_MODE: "prod-ish" });
  assert.equal(state.ready, false); assert.equal(state.mode, "invalid"); assert.equal(state.healthStatus, "blocked");
});
test("live config placeholders never count as credentials", () => {
  const state = walletProviderReadiness({ NODE_ENV: "development", NEXA_WALLET_MODE: "live", NEXA_WALLET_PROVIDER: "paystack", NEXA_WALLET_WEBHOOK_SECRET: "your_secret_here", NEXA_WALLET_PROVIDER_ADAPTER: "paystack" });
  assert.equal(state.ready, false); assert.equal(state.configured, false); assert.ok(state.missing.includes("NEXA_WALLET_WEBHOOK_SECRET"));
});
test("complete-looking live config still fails closed until a live adapter is actually registered", () => {
  const state = walletProviderReadiness({ NODE_ENV: "development", NEXA_WALLET_MODE: "live", NEXA_WALLET_PROVIDER: "paystack", NEXA_WALLET_WEBHOOK_SECRET: "owner-supplied-secret", NEXA_WALLET_PROVIDER_ADAPTER: "paystack", NEXA_WALLET_PROVIDER_TIMEOUT_MS: "12000" });
  assert.equal(state.configured, true); assert.equal(state.adapterAvailable, false); assert.equal(state.ready, false); assert.equal(state.healthStatus, "not_connected"); assert.ok(state.missing.includes("registered_live_adapter")); assert.equal(state.timeoutMs, 12000);
  assert.doesNotMatch(JSON.stringify(state), /owner-supplied-secret/);
});
test("invalid adapter timeout is normalized to a bounded default", () => {
  const state = walletProviderReadiness({ NEXA_WALLET_MODE: "live", NEXA_WALLET_PROVIDER_TIMEOUT_MS: "999999" });
  assert.equal(state.timeoutMs, 30000);
});

test("Main exposes provider readiness only through authenticated configured-Admin route", () => {
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  const start = source.indexOf('app.get("/api/admin/wallet-provider-readiness"');
  assert.notEqual(start, -1);
  const route = source.slice(start, start + 450);
  assert.match(route, /auth\.authMiddleware/);
  assert.match(route, /isConfiguredAdmin\(req\.user\)/);
  assert.match(route, /getWalletProviderReadiness\(\)/);
  assert.doesNotMatch(route, /secretValue|apiKeyValue/);
});

test("sandbox wallet transactions carry explicit simulation metadata", () => {
  const source = fs.readFileSync(path.join(__dirname, "wallet.js"), "utf8");
  assert.match(source, /simulated: providerResult\.simulation === true/);
  assert.match(source, /realFunds: providerResult\.realFunds === true/);
});
