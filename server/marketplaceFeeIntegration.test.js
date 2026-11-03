const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const db = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
const ui = fs.readFileSync(path.join(__dirname, "..", "src", "MarketplaceScreen.tsx"), "utf8");
const hook = fs.readFileSync(path.join(__dirname, "..", "src", "useMarketplace.ts"), "utf8");
const api = fs.readFileSync(path.join(__dirname, "..", "src", "marketplace.ts"), "utf8");

test("Marketplace exposes a preview-before-confirmation service-fee flow", () => {
  assert.match(api, /previewMarketplaceFee/);
  assert.match(hook, /previewFee/);
  assert.match(ui, /NEXA Marketplace service fee/);
  assert.match(ui, /!m\.feePreview/);
});

test("Marketplace checkout recalculates the server-owned fee and settles direct-seller fees atomically", () => {
  const start = index.indexOf('app.post("/api/mall/checkout"');
  const end = index.indexOf('// -- Online payment:', start);
  const route = index.slice(start, end);
  assert.ok(start >= 0 && end > start);
  assert.match(route, /assertFeePreview/);
  assert.match(route, /marketplaceFeeWalletReady/);
  assert.match(route, /settleMarketplaceFee\(db, req\.user\.id, orderId\)/);
  assert.match(route, /paymentMethod === "pay_seller"/);
});

test("Online Marketplace payment keeps provider verification separate from Wallet fee settlement", () => {
  const start = index.indexOf('app.post("/api/mall/payments/verify"');
  const end = index.indexOf('app.post("/api/payments/paystack/webhook"', start);
  const route = index.slice(start, end);
  assert.match(route, /providerVerified/);
  assert.match(route, /settleMarketplaceFee\(db, req\.user\.id, order\.id\)/);
  assert.match(route, /feePending/);
  assert.match(route, /Fund your Wallet and verify again/);
});

test("Mall orders persist provider and fee settlement state", () => {
  assert.match(db, /providerVerified/);
  assert.match(db, /feeStatus/);
  assert.match(db, /feeChargeId/);
});

test("Marketplace fee state remains user-scoped in payment verification", () => {
  const start = index.indexOf('app.post("/api/mall/payments/verify"');
  const end = index.indexOf('app.post("/api/payments/paystack/webhook"', start);
  const route = index.slice(start, end);
  assert.match(route, /paymentRef = \? AND userId = \?/);
  assert.match(route, /WHERE id = \? AND userId = \?/);
  assert.match(index, /marketplace:\$\{orderId\}/);
});
