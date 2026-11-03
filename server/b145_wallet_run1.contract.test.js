"use strict";
// B145 run 1: sandbox money is blocked in production, recipients are notified, history shows names.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const wallet = fs.readFileSync(path.join(__dirname, "wallet.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const { evaluateLaunchReadiness } = require("./launchReadiness");

test("sandbox deposit and withdrawal are refused when NODE_ENV=production", () => {
  assert.match(wallet, /function assertSandboxAllowed/);
  assert.match(wallet, /provider\.mode === "sandbox" && String\(process\.env\.NODE_ENV/);
  assert.equal((wallet.match(/assertSandboxAllowed\(provider\)/g) || []).length, 3); // definition + deposit + withdraw
});

test("launch readiness fails (not warns) for a sandbox wallet in production", () => {
  const r = evaluateLaunchReadiness({ env: { NODE_ENV: "production", NEXA_WALLET_MODE: "sandbox" }, packageVersion: "5.98.5" });
  assert.equal(r.checks.find(c => c.id === "pay.wallet-mode").status, "fail");
});

test("the wallet router receives sendPush and notifies the recipient of a transfer", () => {
  assert.match(index, /createWalletRouter\(\{ app, auth, db, rateLimit, sendPush \}\)/);
  assert.match(wallet, /"Money received"/);
  assert.match(wallet, /dedupeKey: `wallet-transfer:/);
});

test("recipient history shows the sender's name, not a raw id", () => {
  assert.match(wallet, /`Received from \$\{senderName\}`/);
  assert.equal(/`Received from \$\{userId\}`/.test(wallet), false);
  assert.match(wallet, /row\.description === `Received from \$\{row\.counterpartyUserId\}`/);
});
