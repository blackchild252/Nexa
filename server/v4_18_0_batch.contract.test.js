const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');
const marketplaceOrders = require('./marketplaceOrders');

test('V4.18 dependency reproducibility keeps the lockfile blocker explicit', () => {
  const preflight = read('../scripts/dependency-preflight.mjs');
  const pkg = JSON.parse(read('../package.json'));
  assert.equal(pkg.packageManager, 'npm@10.9.2');
  assert.match(preflight, /package-lock\.json present/);
  assert.match(preflight, /workspaceDependenciesInstalled/);
  assert.match(preflight, /blockers/);
  assert.match(preflight, /reproducible: blockers\.length === 0/);
});

test('V4.18 notifications expose user preferences and durable deduplication', () => {
  const db = read('db.js');
  const index = read('index.js');
  const prefs = read('notificationPreferences.js');
  assert.match(db, /CREATE TABLE IF NOT EXISTS notification_preferences/);
  assert.match(db, /idx_notifications_user_dedupe/);
  assert.match(index, /\/api\/notifications\/preferences/);
  assert.match(index, /notificationPreferences\.allows/);
  assert.match(index, /dedupeKey/);
  assert.match(prefs, /pushEnabled/);
});

test('V4.18 notification routing recognizes Yaayz and Leisure deep-link categories', () => {
  const notifications = read('notifications.js');
  const routing = read('../src/pushRouting.ts');
  const home = routing + read('../src/nexaNavigation.ts');
  assert.match(notifications, /yaayz/);
  assert.match(notifications, /leisure/);
  assert.match(routing, /mall_orders/);
  assert.match(home, /yaayz/);
  assert.match(home, /leisure_kitchen/);
});

test('V4.18 Marketplace keeps server-owned order idempotency, stock guards and lifecycle transitions', () => {
  const orders = read('marketplaceOrders.js');
  const payments = read('index.js');
  assert.match(orders, /mall_order_idempotency/);
  assert.match(orders, /productStock\.reserve\(/); // B144 WIP9: the stock>=qty guard lives in productStock.js
  assert.match(read('productStock.js'), /stock >= \?/);
  assert.match(orders, /Invalid order status transition/);
  assert.equal(marketplaceOrders.canTransition('placed', 'accepted'), true);
  assert.equal(marketplaceOrders.canTransition('accepted', 'completed'), false);
  assert.match(payments, /mall_payment_events/);
  assert.match(payments, /mall_refunds/);
  assert.match(payments, /mall_checkout_disputes/);
});

test('V4.18 Group entry writes support authenticated request idempotency', () => {
  const db = read('db.js');
  const groups = read('groups.js');
  assert.match(db, /idx_moneyentries_request/);
  assert.match(groups, /requestKey must be 8 to 120/);
  assert.match(groups, /money_group_entries .*requestKey/s);
  assert.match(groups, /requestKey/);
});

test('V4.18 Market Watch refuses synthetic historical charts for provider quotes', () => {
  const market = read('market.js');
  const ui = read('../src/MarketWatch.tsx');
  assert.match(market, /provider_unavailable/);
  assert.match(market, /mode === "mock" \? series/);
  assert.match(market, /not substituting synthetic prices/);
  assert.match(ui, /historical chart unavailable/);
});
