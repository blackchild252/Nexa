const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const subscriptions = fs.readFileSync(path.join(__dirname, "subscriptions.js"), "utf8");
const wallet = fs.readFileSync(path.join(__dirname, "wallet.js"), "utf8");
const storeAjo = fs.readFileSync(path.join(__dirname, "storeAjo.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const db = fs.readFileSync(path.join(__dirname, "db.js"), "utf8");
const kitchen = fs.readFileSync(path.join(__dirname, "..", "src", "LeisureKitchenScreen.tsx"), "utf8");
const marketplace = fs.readFileSync(path.join(__dirname, "..", "src", "marketplace.ts"), "utf8");
const marketplaceHook = fs.readFileSync(path.join(__dirname, "..", "src", "useMarketplace.ts"), "utf8");
const walletUi = fs.readFileSync(path.join(__dirname, "..", "src", "Wallet.tsx"), "utf8");
const ajoUi = fs.readFileSync(path.join(__dirname, "..", "src", "StoreAjo.tsx"), "utf8");
const yaayzUi = fs.readFileSync(path.join(__dirname, "..", "src", "YaayzScreen.tsx"), "utf8");

test("V3.99 fee previews are server-issued, time-bound, user-scoped and exact-action bound", () => {
  assert.match(subscriptions, /CREATE TABLE IF NOT EXISTS nexa_fee_previews/);
  assert.match(subscriptions, /expiresAt TEXT NOT NULL/);
  assert.match(subscriptions, /function assertFeePreview\(/);
  assert.match(subscriptions, /row\.serviceCode !== String\(serviceCode\)/);
  assert.match(subscriptions, /row\.actionAmountMinor\) !== expectedAmount/);
  assert.match(subscriptions, /row\.consumedAt/);
});

test("Metered fee settlement cannot proceed without a matching preview", () => {
  assert.match(subscriptions, /assertFeePreview\(db, userId, previewId, serviceCode/);
  assert.match(subscriptions, /previewId:preview\.id/);
  assert.match(subscriptions, /SET consumedAt=\?/);
});

test("Wallet actions carry the exact preview into server settlement", () => {
  assert.match(wallet, /feePreviewId/);
  assert.match(wallet, /assertFeePreview\(db, userId, feePreviewId, "wallet_transfer"/);
  assert.match(wallet, /assertFeePreview\(db, userId, feePreviewId, "wallet_withdrawal"/);
});

test("Marketplace, Yaayz, Kitchen and Store Ajo persist the preview boundary", () => {
  assert.match(db, /ALTER TABLE mall_orders ADD COLUMN feePreviewId TEXT/);
  assert.match(db, /ALTER TABLE yaayz_ticket_orders ADD COLUMN feePreviewId TEXT/);
  assert.match(db, /ALTER TABLE kitchen_orders ADD COLUMN feePreviewId TEXT/);
  assert.match(storeAjo, /ALTER TABLE money_store_ajo_contributions ADD COLUMN feePreviewId TEXT/);
  assert.match(index, /previewId: order\.feePreviewId/);
  assert.match(index, /feePreviewId\);/);
});

test("Client confirmation sends the server-issued preview identifier", () => {
  assert.match(walletUi, /body\.feePreviewId = feePreview\?\.previewId/);
  assert.match(marketplace, /feePreviewId\?:string/);
  assert.match(marketplaceHook, /feePreview\?\.previewId/);
  assert.match(yaayzUi, /feePreviewId:preview\?\.previewId/);
  assert.match(kitchen, /feePreviewId:feePreview\?\.previewId/);
  assert.match(ajoUi, /feePreviewId: feePreview\[account\.id\]\?\.previewId/);
});
