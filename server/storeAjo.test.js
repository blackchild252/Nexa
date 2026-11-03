const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const router = fs.readFileSync(path.join(__dirname, 'storeAjo.js'), 'utf8');
const db = fs.readFileSync(path.join(__dirname, 'db.js'), 'utf8');
const ui = fs.readFileSync(path.join(__dirname, '..', 'src', 'StoreAjo.tsx'), 'utf8');
const money = fs.readFileSync(path.join(__dirname, '..', 'src', 'MoneyDashboard.tsx'), 'utf8');

test('Store Ajo locks an item price, reserves one unit, zero interest and zero discount', () => {
  // B144 WIP9: the guarded one-unit decrement now lives in server/productStock.js
  assert.match(router, /productStock\.reserve\(db, \{ productId, variantId, qty: 1/);
  assert.match(fs.readFileSync(path.join(__dirname, 'productStock.js'), 'utf8'), /UPDATE mall_products SET stock = stock - \?, updatedAt = \? WHERE id = \? AND stock >= \?/);
  assert.match(router, /interestRate/);
  assert.match(router, /discountRate/);
  assert.match(db, /discountRate REAL NOT NULL DEFAULT 0 CHECK \(discountRate = 0\)/);
});

test('Store Ajo term is strictly 2 to 6 months', () => {
  assert.match(router, /termMonths.*2.*termMonths.*6/);
  assert.match(db, /termMonths INTEGER NOT NULL DEFAULT 2 CHECK \(termMonths BETWEEN 2 AND 6\)/);
  assert.match(ui, /\[2,3,4,5,6\]/);
});

test('Store Ajo only unlocks pickup after full contribution', () => {
  assert.match(router, /status !== "ready_for_pickup"/);
  assert.match(router, /status='ready_for_pickup'/);
  assert.match(router, /total \+ 0\.00001 < Number\(ajo\.targetAmount\)/);
});

test('Store Ajo contribution verifies reference, currency and exact amount', () => {
  assert.match(router, /result\.reference.*=== reference/);
  assert.match(router, /result\.currency.*contribution\.currency/);
  assert.match(router, /Number\(result\.amount\) === Math\.round\(Number\(contribution\.amount\) \* 100\)/);
});

test('Store Ajo is exposed from Money UI and preserves existing group Ajo', () => {
  assert.match(money, /Sky Store Savings/);
  assert.match(money, /<StoreAjo \/>/);
  assert.match(ui, /Create Sky Store Savings/);
  assert.match(ui, /Pick up order/);
});


test('Store Ajo contribution exposes the same server-authoritative fee preview and Wallet-backed fee boundary', () => {
  assert.match(router, /assertFeePreview\(db, req\.user\.id, feePreviewId, "ajo_contribution"/);
  assert.match(router, /chargeServiceFee\(db, req\.user\.id, "ajo_contribution"/);
  assert.match(router, /providerVerified/);
  assert.match(router, /feeStatus/);
  assert.match(router, /ajo-contribution:/);
  assert.match(ui, /api\/subscription\/fee-preview\?serviceCode=ajo_contribution/);
  assert.match(ui, /NEXA service fee/);
});

test('Store Ajo does not silently bundle the service fee into the item price', () => {
  assert.match(ui, /Wallet fee payment required/);
  assert.match(router, /Add enough funds to your NEXA Wallet/);
  assert.match(router, /feeChargeId/);
});
