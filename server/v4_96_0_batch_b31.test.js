"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("B31 keeps wallet reconciliation behind the existing authenticated user boundary", () => {
  const wallet = read("server/wallet.js");
  assert.match(wallet, /app\.post\("\/api\/wallet\/transactions\/:id\/reconcile", auth\.authMiddleware/);
  assert.match(wallet, /reconcileProviderStatus\(db, req\.user\.id, req\.params\.id\)/);
  assert.match(wallet, /WHERE id=\? AND userId=\?/);
});

test("B31 wallet reconciliation remains provider-safe and does not create ledger entries", () => {
  const wallet = read("server/wallet.js");
  const fn = wallet.slice(wallet.indexOf("function reconcileProviderStatus"), wallet.indexOf("function providerTransactionStatus"));
  assert.match(fn, /provider\.verifyDeposit|provider\.verifyWithdrawal/);
  assert.match(fn, /status\s*(?:=|===)\s*["']pending["']/);
  assert.doesNotMatch(fn, /INSERT INTO wallet_ledger_entries/);
});

test("B31 Wallet history exposes both provider status and reconciliation actions", () => {
  const ui = read("src/Wallet.tsx");
  assert.match(ui, /\/api\/wallet\/transactions\/\$\{encodeURIComponent\(x\.id\)\}\/provider-status/);
  assert.match(ui, /\/api\/wallet\/transactions\/\$\{encodeURIComponent\(x\.id\)\}\/reconcile/);
  assert.match(ui, /Reconcile/);
});

test("B31 keeps internal NEXA transfers outside provider reconciliation", () => {
  const wallet = read("server/wallet.js");
  const fn = wallet.slice(wallet.indexOf("function reconcileProviderStatus"), wallet.indexOf("function providerTransactionStatus"));
  assert.match(fn, /row\.source === "internal"/);
  assert.match(fn, /reason: "internal_transaction"/);
});

test("B31 does not introduce a second financial ledger", () => {
  const settlement = read("server/walletSettlement.js");
  const operations = read("server/walletOperations.js");
  assert.match(settlement, /reconciliationDecision/);
  assert.match(operations, /summarize/);
  assert.match(operations, /providerHealth/);
});
