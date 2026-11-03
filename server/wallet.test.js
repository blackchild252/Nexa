"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const wallet = fs.readFileSync(path.join(__dirname, "wallet.js"), "utf8");
const provider = fs.readFileSync(path.join(__dirname, "walletProvider.js"), "utf8");
const db = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const ui = fs.readFileSync(path.join(__dirname, "..", "src", "Wallet.tsx"), "utf8");
const money = fs.readFileSync(path.join(__dirname, "..", "src", "MoneyDashboard.tsx"), "utf8");
const layout = fs.readFileSync(path.join(__dirname, "..", "src", "app", "_layout.tsx"), "utf8");

test("Wallet uses an append-only ledger rather than a mutable balance field", () => {
  assert.match(db, /CREATE TABLE IF NOT EXISTS wallet_ledger_entries/);
  assert.match(db, /CREATE INDEX IF NOT EXISTS idx_wallet_ledger_user_currency/);
  const accountBlock = db.slice(db.indexOf("CREATE TABLE IF NOT EXISTS wallet_accounts"), db.indexOf("CREATE TABLE IF NOT EXISTS wallet_transactions"));
  assert.equal(accountBlock.includes("balanceMinor"), false);
  assert.match(wallet, /SUM\(amountMinor\).*AS balanceMinor/);
});

test("Wallet transactions are authenticated, idempotent and user-scoped", () => {
  assert.match(index, /createWalletRouter\(\{ app, auth, db, rateLimit, sendPush \}\)/);
  assert.match(wallet, /auth\.authMiddleware/);
  assert.match(db, /idx_wallet_tx_idempotency/);
  assert.match(wallet, /userId=\? AND idempotencyKey=\?/);
});

test("Wallet transfers are restricted to accepted Zeeza friends and are atomic", () => {
  assert.match(wallet, /FROM friendships WHERE userId=\? AND friendId=\?/);
  assert.match(wallet, /db\.transaction\(\(\) => \{/);
  assert.match(wallet, /senderId.*recipientId/);
  assert.match(wallet, /-minor/);
  assert.match(wallet, /minor,c,createdAt/);
});

test("Sandbox wallet clearly separates simulated funds from provider-backed money", () => {
  assert.match(wallet, /NEXA_WALLET_MODE/);
  assert.match(provider, /sandboxProvider/);
  assert.match(provider, /createDeposit/);
  assert.match(provider, /createWithdrawal/);
  assert.match(wallet, /providerStatus.*sandbox/);
  assert.match(ui, /Sandbox funds are simulated and are not bank deposits/);
  assert.match(ui, /does not move real bank funds/);
});

test("Wallet is a dedicated route linked from Money without replacing Money", () => {
  assert.match(layout, /name="wallet"/);
  assert.match(money, /Open \{BRAND\.wallet\}/);
  assert.match(money, /<StoreAjo \/>/);
});

test("Wallet transfer and withdrawal expose a server-calculated fee preview before confirmation", () => {
  const subscriptions = fs.readFileSync(path.join(__dirname, "subscriptions.js"), "utf8");
  assert.match(subscriptions, /\/api\/subscription\/fee-preview/);
  assert.match(subscriptions, /function feePreview\(/);
  assert.match(wallet, /assertFeePreview\(db, userId, feePreviewId, "wallet_transfer"/);
  assert.match(wallet, /assertFeePreview\(db, userId, feePreviewId, "wallet_withdrawal"/);
});

test("Wallet fee integration is atomic and idempotency-scoped", () => {
  assert.match(wallet, /withinTransaction:true/);
  assert.match(wallet, /wallet-transfer:\$\{idempotencyKey/);
  assert.match(wallet, /wallet-withdrawal:\$\{idempotencyKey/);
  assert.match(wallet, /minor \+ Math\.round\(preview\.fee\.amount \* 100\)/);
});

test("Wallet UI requires a fee preview before confirming metered transfers or withdrawals", () => {
  assert.match(ui, /Preview NEXA service fee/);
  assert.match(ui, /Before you confirm/);
  assert.match(ui, /Total Sky Wallet debit/);
  assert.match(ui, /!feePreview/);
});
