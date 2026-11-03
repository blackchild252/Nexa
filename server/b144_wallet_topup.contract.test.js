"use strict";
// B144 — source contract for Paystack wallet top-up (runs without dependencies).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
const index = read("index.js"), topup = read("walletTopup.js"), wallet = read("wallet.js"), ui = read("../src/Wallet.tsx");

test("top-up routes are no longer registered (B145)", () => {
  // The routes still exist inside the module but are intentionally NOT registered any more.
  assert.doesNotMatch(index, /require\("\.\/walletTopup"\)\.register\(/);
  assert.match(topup, /WHERE reference=\? AND userId=\?/, "legacy verify stays owner-scoped");
});

test("the wallet is credited only through settleTopup with a guarded, idempotent write", () => {
  assert.match(topup, /matchesExpectedPayment/);
  assert.match(topup, /WHERE id=\? AND status='pending'/);
  assert.match(topup, /idempotencyKey: `topup:\$\{topup\.reference\}`/);
  assert.equal((topup.match(/recordProviderTransaction\(/g) || []).length, 1, "only one place may write the credit");
});

test("the webhook handles wallet top-ups before the order lookups", () => {
  const start = index.indexOf('app.post("/api/payments/paystack/webhook"');
  assert.ok(start > 0);
  const body = index.slice(start);
  const gate = body.indexOf('event.event !== "charge.success"');
  const w = body.indexOf("FROM wallet_topups WHERE reference=?");
  const kitchen = body.indexOf("SELECT * FROM kitchen_orders WHERE paymentRef=?");
  assert.ok(gate > 0 && w > gate, "only charge.success may reach the top-up branch");
  assert.ok(kitchen > w, "top-up branch must run before the Kitchen/Yaayz/Mall lookups");
});

test("Paystack-funded money is in-app only: withdrawals are limited to the withdrawable part", () => {
  assert.match(wallet, /withdrawableMinor\(db, userId, c\)/);
  assert.match(wallet, /Insufficient\|in-app use/);
  assert.match(topup, /Math\.min\(Math\.max\(0, wallet\.balanceMinor/);
});

test("the wallet screen has no Paystack top-up flow (B145)", () => {
  assert.doesNotMatch(ui, /startTopup|\/api\/wallet\/topup\//);

  assert.doesNotMatch(ui, /providerKey|apiKey|secret|authorization/i);
});

test("the in-app-only restriction is recorded on both sides of a transfer", () => {
  assert.match(wallet, /const restrictedMinor = Math\.min\(minor, require\("\.\/walletTopup"\)\.inAppOnlyMinor\(db, userId, c\)\)/);
  assert.equal((wallet.match(/inAppOnlyMinor: restrictedMinor/g) || []).length, 2, "sender and recipient rows must both carry it");
  assert.match(topup, /json_extract\(metadata,'\$\.inAppOnlyMinor'\)/);
});
