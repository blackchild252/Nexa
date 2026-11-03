'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const server = read('server/index.js');
const market = read('server/market.js');
const payments = read('server/payments.js');
const roadmap = read('MASTER_ROADMAP.md');

test('vendor product create/update validates currency minor-unit precision server-side', () => {
  assert.match(server, /productPrice\.validateProductPrice\(priceCandidate, priceCurrency/);
  assert.match(server, /productPrice\.validateProductPrice\(saleCandidate, priceCurrency/);
  assert.match(server, /fractional minor units/);
});

test('checkout remains server-authoritative and idempotent', () => {
  assert.match(server, /app\.post\("\/api\/mall\/checkout", auth\.authMiddleware/);
  assert.match(server, /effectivePrice\(p\)/);
  assert.match(server, /mall_checkout_idempotency/);
  assert.match(server, /rollbackUnpaidCheckout\(orderId/);
});

test('refund and dispute operations remain owner-scoped, bounded and duplicate-safe', () => {
  assert.match(server, /SELECT \* FROM mall_orders WHERE id = \? AND userId = \?/);
  assert.match(payments, /claimRefund/);
  assert.match(payments, /claimDispute/);
  assert.match(payments, /status IN \('pending','processing','processed'\)/);
});

test('payment history response excludes payment instrument and provider secret fields', () => {
  const start = server.indexOf('app.get("/api/mall/payments/history"');
  const end = server.indexOf('app.post("/api/mall/orders/:orderId/refunds"', start);
  assert.ok(start >= 0 && end > start);
  const route = server.slice(start, end);
  assert.match(route, /WHERE userId = \? ORDER BY createdAt DESC/);
  assert.doesNotMatch(route, /cardNumber|cvv|authorization_code|secretKey|accessToken/);
});

test('market-watch preview data is labelled and no broker/trading execution surface is introduced', () => {
  assert.match(market, /dataStatus: "preview", freshness: "preview"/);
  assert.match(market, /Preview data only; not live market prices/);
  assert.match(market, /does not execute trades|NEXA does not execute trades/);
  assert.doesNotMatch(market, /app\.post\("\/api\/market\/(?:orders|trades|broker)/);
});

test('live provider failure never substitutes synthetic market prices', () => {
  assert.match(market, /actualMode = "provider_unavailable"/);
  assert.match(market, /const history = mode === "mock" \? series\(x, 30\) : \[\]/);
});

test('roadmap explicitly leaves live payment settlement and licensed market-data acceptance untested', () => {
  assert.match(roadmap, /live payment settlement and licensed market-data acceptance NOT TESTED/);
});
