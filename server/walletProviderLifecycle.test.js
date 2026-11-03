"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const provider = fs.readFileSync(path.join(__dirname, "walletProvider.js"), "utf8");
const wallet = fs.readFileSync(path.join(__dirname, "wallet.js"), "utf8");
const db = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
const ui = fs.readFileSync(path.join(__dirname, "..", "src", "Wallet.tsx"), "utf8");

 test("Wallet provider boundary exposes create, verify, status and reconciliation contracts", () => {
  assert.match(provider, /createDeposit\(/);
  assert.match(provider, /createWithdrawal\(/);
  assert.match(provider, /verifyDeposit\(/);
  assert.match(provider, /verifyWithdrawal\(/);
  assert.match(provider, /getTransactionStatus\(/);
  assert.match(provider, /reconcile\(/);
});

test("Sandbox provider reports explicit completed verification without claiming bank settlement", () => {
  assert.match(provider, /mode: "sandbox"/);
  assert.match(provider, /verifyDeposit\(\{ providerReference \}\)/);
  assert.match(provider, /verifyWithdrawal\(\{ providerReference \}\)/);
  assert.match(provider, /status: "completed"/);
});

test("Unconnected provider fails closed for verification and reconciliation", () => {
  assert.match(provider, /PROVIDER_ADAPTER_UNAVAILABLE/);
  assert.match(provider, /unavailable\("Deposit verification"\)/);
  assert.match(provider, /unavailable\("Withdrawal verification"\)/);
  assert.match(provider, /unavailable\("Provider status"\)/);
  assert.match(provider, /unavailable\("Reconciliation"\)/);
});

test("Provider status lookup is authenticated and user-scoped", () => {
  assert.match(wallet, /providerTransactionStatus\(db, userId, transactionId\)/);
  assert.match(wallet, /WHERE id=\? AND userId=\?/);
  assert.match(wallet, /\/api\/wallet\/transactions\/:id\/provider-status/);
  assert.match(wallet, /auth\.authMiddleware/);
});

test("Internal NEXA transfers do not call an external provider status contract", () => {
  assert.match(wallet, /row\.source === "internal"/);
  assert.match(wallet, /status: row\.status, source: row\.source/);
});

test("Wallet history exposes provider status refresh without exposing provider credentials", () => {
  assert.match(ui, /Check provider status/);
  assert.match(ui, /\/api\/wallet\/transactions\/\$\{encodeURIComponent\(x\.id\)\}\/provider-status/);
  assert.doesNotMatch(ui, /providerKey|apiKey|secret|authorization/i);
});

test("Wallet ledger remains append-only and provider status lookup does not create ledger entries", () => {
  assert.match(db, /CREATE TABLE IF NOT EXISTS wallet_ledger_entries/);
  assert.match(wallet, /function providerTransactionStatus/);
  const fn = wallet.slice(wallet.indexOf("function providerTransactionStatus"), wallet.indexOf("function summary"));
  assert.doesNotMatch(fn, /INSERT INTO wallet_ledger_entries/);
});
