const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const root = require('node:path').join(__dirname, '..');

function read(path) { return fs.readFileSync(require('node:path').join(root, path), 'utf8'); }

test('V4.3.0 Sky Money is the public financial destination', () => {
  const layout = read('src/app/(tabs)/_layout.tsx');
  const money = read('src/MoneyDashboard.tsx');
  assert.match(layout, /name="money" options=\{\{title:BRAND\.money\}\}/);
  assert.match(money, /<Text style=\{s\.heading\}>\{BRAND\.money\}<\/Text>/);
  assert.match(money, /BRAND\.wallet/);
  assert.match(money, /BRAND\.storeSavings/);
  assert.match(money, /BRAND\.groupSavings/);
});

test('V4.3.0 savings and market surfaces use Sky public names while preserving existing routes', () => {
  const store = read('src/StoreAjo.tsx');
  const groups = read('src/GroupsTab.tsx');
  const market = read('src/MarketWatch.tsx');
  const insights = read('src/MarketInsights.tsx');
  assert.match(store, /Sky Store Savings/);
  assert.match(store, /api\/money\/ajo\/store/);
  assert.match(groups, /Sky Group Savings/);
  assert.match(groups, /"ajo"/);
  assert.match(market, /Sky Market Watch/);
  assert.match(insights, /Sky Market Watch/);
});

test('V4.3.0 financial architecture remains server/API compatible', () => {
  const store = read('src/StoreAjo.tsx');
  const wallet = read('src/Wallet.tsx');
  assert.match(store, /api\/money\/ajo\/store/);
  assert.match(wallet, /Sky Wallet/);
});
