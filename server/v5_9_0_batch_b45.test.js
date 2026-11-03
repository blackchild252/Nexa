"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const wallet = fs.readFileSync(path.join(__dirname, "wallet.js"), "utf8");
const db = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
const provider = fs.readFileSync(path.join(__dirname, "walletProvider.js"), "utf8");

test("B45 provider outcomes cannot credit the ledger before provider completion", () => {
  assert.match(wallet, /normalizeProviderStatus\(/);
  assert.match(wallet, /recordProviderTransaction\(/);
  assert.match(wallet, /normalizedStatus = normalizeProviderStatus/);
  assert.match(wallet, /if \(normalizedStatus === "completed"\)/);
  assert.doesNotMatch(wallet, /recordCompleted\(db, \{ userId, type: "deposit"/);
  assert.doesNotMatch(wallet, /recordCompleted\(db, \{ userId, type: "withdrawal"/);
});

test("B45 pending provider transactions settle exactly once when reconciliation completes", () => {
  assert.match(wallet, /settleProviderTransaction\(db, row\.id, mapped\)/);
  assert.match(wallet, /SELECT 1 FROM wallet_ledger_entries WHERE transactionId=\?/);
  assert.match(wallet, /INSERT INTO wallet_ledger_entries/);
  assert.match(wallet, /status='pending'/);
});

test("B45 provider failure/reversal does not create a wallet ledger entry", () => {
  assert.match(wallet, /if \(next === "completed"\)/);
  assert.match(wallet, /else if \(next === "failed" \|\| next === "reversed"\)/);
  assert.match(wallet, /UPDATE wallet_transactions SET status=/);
});

test("B45 preserves provider boundary and sandbox separation", () => {
  assert.match(provider, /sandboxProvider/);
  assert.match(provider, /unconnectedProvider/);
  assert.match(wallet, /getWalletProvider\(\)/);
  assert.match(wallet, /providerReference/);
  assert.match(db, /status TEXT NOT NULL CHECK \(status IN \('pending','completed','failed','reversed'\)\)/);
});

test("B45 keeps user-scoped reconciliation and idempotency boundaries", () => {
  assert.match(wallet, /WHERE id=\? AND userId=\?/);
  assert.match(db, /idx_wallet_tx_idempotency/);
  assert.match(wallet, /getIdempotent\(db, userId, idempotencyKey\)/);
});
