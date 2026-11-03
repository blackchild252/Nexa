"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("V3.98.0 Kitchen fee boundary uses the shared service engine", () => {
  const server = read("server/index.js");
  const subscriptions = read("server/subscriptions.js");
  assert.match(server, /kitchenFeePreview/);
  assert.match(server, /feePreview\(db, userId, "kitchen_service"/);
  assert.match(server, /chargeServiceFee\(dbConn, userId, "kitchen_service"/);
  assert.match(subscriptions, /kitchen_service/);
});

test("Kitchen fee preview is server-priced from submitted menu items", () => {
  const server = read("server/index.js");
  assert.match(server, /leisureArena\.normalizeItems\(JSON\.parse\(String/);
  assert.match(server, /SELECT key,price FROM kitchen_menu WHERE active=1/);
  assert.match(server, /leisureArena\.orderTotal\(items,prices\)/);
  assert.match(server, /api\/leisure\/kitchen\/fee-preview/);
});

test("Kitchen orders persist provider verification and fee settlement state", () => {
  const db = read("server/db.js");
  const server = read("server/index.js");
  assert.match(db, /ALTER TABLE kitchen_orders ADD COLUMN providerVerified/);
  assert.match(db, /ALTER TABLE kitchen_orders ADD COLUMN feeStatus/);
  assert.match(db, /ALTER TABLE kitchen_orders ADD COLUMN feeChargeId/);
  assert.match(server, /providerVerified,feeStatus,feeChargeId/);
});

test("Kitchen payment verification requires provider verification before fee settlement", () => {
  const server = read("server/index.js");
  assert.match(server, /Kitchen payment must be verified before the NEXA service fee can be settled/);
  assert.match(server, /status='paid',providerVerified=1/);
  assert.match(server, /kitchen:\$\{orderId\}/);
});

test("Kitchen fee failure remains pending instead of falsely charging or rejecting provider payment", () => {
  const server = read("server/index.js");
  assert.match(server, /feePending:true/);
  assert.match(server, /feeStatus='pending',feeChargeId=NULL/);
  assert.match(server, /Fund your NEXA Wallet and try again/);
});

test("Kitchen has an authenticated fee retry boundary", () => {
  const server = read("server/index.js");
  assert.match(server, /api\/leisure\/kitchen\/orders\/:orderId\/fee-retry/);
  assert.match(server, /auth\.authMiddleware/);
  assert.match(server, /WHERE id=\? AND userId=\?/);
});

test("Kitchen webhook settlement also applies the NEXA fee boundary", () => {
  const server = read("server/index.js");
  assert.match(server, /kitchenOrder\.userId,kitchenOrder\.id\); \} catch \{/);
  assert.match(server, /providerVerified=1,updatedAt/);
  assert.match(server, /kitchen_confirmed/);
});

test("Kitchen UI requires fee preview before order confirmation", () => {
  const ui = read("src/LeisureKitchenScreen.tsx");
  assert.match(ui, /Preview NEXA service fee/);
  assert.match(ui, /feePreview/);
  assert.match(ui, /api\/leisure\/kitchen\/fee-preview/);
  assert.match(ui, /Preview the NEXA service fee before confirming/);
});

test("Kitchen UI exposes pending fee retry without exposing fee control to the client", () => {
  const ui = read("src/LeisureKitchenScreen.tsx");
  assert.match(ui, /Retry NEXA service fee/);
  assert.match(ui, /feeStatus==='pending'/);
  assert.match(ui, /api\/leisure\/kitchen\/orders\/\$\{o\.id\}\/fee-retry/);
});

test("Kitchen price and fee remain separate", () => {
  const ui = read("src/LeisureKitchenScreen.tsx");
  const subscriptions = read("server/subscriptions.js");
  assert.match(ui, /Service fee:/);
  assert.match(ui, /Total food order:/);
  assert.match(subscriptions, /label: "Kitchen service"/);
});
