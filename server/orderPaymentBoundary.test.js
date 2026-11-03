const test = require('node:test');
const assert = require('node:assert/strict');
const source = require('fs').readFileSync(require('path').join(__dirname, 'index.js'), 'utf8');

test('vendor order cancellation checks initialized online payment before cancellation mutation', () => {
  const routeStart = source.indexOf('app.patch("/api/mall/vendor/orders/:orderId/status"');
  const routeEnd = source.indexOf('// -- Online payment:', routeStart);
  assert.ok(routeStart >= 0 && routeEnd > routeStart);
  const route = source.slice(routeStart, routeEnd);
  const paymentGuard = route.indexOf('Online payment has already been initialized for this order');
  const cancellationMutation = route.indexOf("UPDATE mall_order_items SET status = ?");
  assert.ok(paymentGuard >= 0);
  assert.ok(cancellationMutation >= 0);
  assert.ok(paymentGuard < cancellationMutation);
});

test('vendor online cancellation guard is limited to the cancellation transition', () => {
  const routeStart = source.indexOf('app.patch("/api/mall/vendor/orders/:orderId/status"');
  const routeEnd = source.indexOf('// -- Online payment:', routeStart);
  const route = source.slice(routeStart, routeEnd);
  const guard = route.indexOf('if (next === "cancelled")');
  assert.ok(guard >= 0);
  assert.ok(route.slice(guard, guard + 500).includes('paymentMethod'));
});

test('vendor cancellation re-reads online payment state inside the write transaction', () => {
  const routeStart = source.indexOf('app.patch("/api/mall/vendor/orders/:orderId/status"');
  const routeEnd = source.indexOf('// -- Online payment:', routeStart);
  const route = source.slice(routeStart, routeEnd);
  const tx = route.indexOf('db.transaction(() => {');
  const paymentRead = route.indexOf('SELECT paymentMethod, paymentRef FROM mall_orders', tx);
  const cancellationMutation = route.indexOf('UPDATE mall_order_items SET status = ?', tx);
  assert.ok(tx >= 0 && paymentRead > tx && cancellationMutation > paymentRead);
});

test('payment verification protects the cancellation race inside a transaction', () => {
  const routeStart = source.indexOf('app.post("/api/mall/payments/verify"');
  const routeEnd = source.indexOf('app.post("/api/payments/paystack/webhook"', routeStart);
  const route = source.slice(routeStart, routeEnd);
  const tx = route.indexOf('db.transaction(() => {');
  const stateRead = route.indexOf('SELECT status, paymentMethod, paymentRef FROM mall_orders', tx);
  const paidMutation = route.indexOf("UPDATE mall_order_items SET paid = 1", tx);
  assert.ok(tx >= 0 && stateRead > tx && paidMutation > stateRead);
  assert.ok(route.slice(stateRead, paidMutation).includes('cancelled'));
});

test('Paystack charge-success fulfillment re-reads cancellation/payment boundary inside a transaction', () => {
  const routeStart = source.indexOf('app.post("/api/payments/paystack/webhook"');
  const routeEnd = source.indexOf('// V3.50.3', routeStart);
  const route = source.slice(routeStart, routeEnd);
  const tx = route.indexOf('db.transaction(() => {');
  const stateRead = route.indexOf('SELECT status, paymentMethod, paymentRef FROM mall_orders', tx);
  const paidMutation = route.indexOf("UPDATE mall_order_items SET paid = 1", tx);
  assert.ok(tx >= 0 && stateRead > tx && paidMutation > stateRead);
  assert.ok(route.slice(stateRead, paidMutation).includes('cancelled'));
  assert.ok(route.slice(stateRead, paidMutation).includes('paymentRef'));
});
