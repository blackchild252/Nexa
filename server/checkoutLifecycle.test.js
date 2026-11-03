const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

test('online checkout publishes deferred vendor notifications only after payment initialization succeeds', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const routeStart = source.indexOf('app.post("/api/mall/checkout"');
  const start = source.indexOf('if (paymentMethod === "online") {', routeStart);
  const end = source.indexOf('app.get("/api/mall/orders/:orderId/disputes"', start);
  assert.ok(start >= 0 && end > start, 'online checkout block should exist');
  const block = source.slice(start, end);
  const onlineBlock = block;
  const successCall = onlineBlock.indexOf('notifyCheckoutVendors(orderIds, lowStockHits);');
  const response = onlineBlock.indexOf('return res.json({ orders: [loadOrder(orderId)], payment: pay });');
  const catchIndex = onlineBlock.indexOf('} catch (e) {');
  assert.ok(successCall >= 0, 'online checkout must notify vendors after successful initialization');
  assert.ok(response > successCall, 'success notifications must be published before the success response');
  assert.ok(catchIndex >= 0 && successCall > catchIndex, 'success notifications must occur after the payment initialization catch block begins');
  const catchBody = onlineBlock.slice(catchIndex, successCall);
  assert.equal(catchBody.includes('notifyCheckoutVendors(orderIds, lowStockHits);'), false, 'payment initialization failure must not notify vendors');
});


test('charge.success webhook must not fulfill a cancelled online order', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const start = source.indexOf('app.post("/api/payments/paystack/webhook"');
  const end = source.indexOf('app.get("/api/mall/orders/:orderId/disputes"', start);
  assert.ok(start >= 0 && end > start, 'Paystack webhook route should exist');
  const block = source.slice(start, end);
  const cancelledGuard = block.indexOf('String(order.status || "").toLowerCase() === "cancelled"');
  const fulfillment = block.indexOf('UPDATE mall_order_items SET paid = 1');
  assert.ok(cancelledGuard >= 0, 'webhook must explicitly reject cancelled orders');
  assert.ok(cancelledGuard < fulfillment, 'cancelled-order guard must precede payment fulfillment');
});


test('online orders cannot be cancelled after payment initialization has assigned a provider reference', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const start = source.indexOf('app.post("/api/mall/orders/:orderId/cancel"');
  const end = source.indexOf('app.get("/api/mall/vendor/orders"', start);
  assert.ok(start >= 0 && end > start, 'buyer cancellation route should exist');
  const block = source.slice(start, end);
  const paymentGuard = block.indexOf('paymentRef');
  const cancellationMutation = block.indexOf("UPDATE mall_orders SET status = 'cancelled'");
  assert.ok(paymentGuard >= 0, 'buyer cancellation must inspect initialized online payment state');
  assert.ok(paymentGuard < cancellationMutation, 'payment initialization guard must precede cancellation mutation');
});

test('AI-confirmed order cancellation uses the same online payment initialization guard', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const start = source.indexOf('if (action.type === "cancel_order")');
  const end = source.indexOf('if (action.type === "settle_debt")', start);
  assert.ok(start >= 0 && end > start, 'AI cancel action should exist');
  const block = source.slice(start, end);
  const paymentGuard = block.indexOf('paymentRef');
  const cancellationMutation = block.indexOf("UPDATE mall_orders SET status = 'cancelled'");
  assert.ok(paymentGuard >= 0, 'AI cancellation must inspect initialized online payment state');
  assert.ok(paymentGuard < cancellationMutation, 'AI payment guard must precede cancellation mutation');
});

test('AI-confirmed cancellation re-reads authoritative order and item state inside its write transaction', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const start = source.indexOf('app.post("/api/ai/actions/confirm"');
  const actionStart = source.indexOf('if (action.type === "cancel_order")', start);
  const end = source.indexOf('if (action.type === "settle_debt")', actionStart);
  assert.ok(actionStart >= 0 && end > actionStart, 'AI cancel action should exist');
  const block = source.slice(actionStart, end);
  const tx = block.indexOf('db.transaction(() => {');
  const paymentRead = block.indexOf('SELECT status, paymentMethod, paymentRef', tx);
  const itemRead = block.indexOf('SELECT * FROM mall_order_items', tx);
  const itemMutation = block.indexOf("UPDATE mall_order_items SET status = 'cancelled'", tx);
  assert.ok(tx >= 0 && paymentRead > tx && itemRead > paymentRead && itemMutation > itemRead);
  assert.ok(block.includes('status = \'placed\' AND paid = 0'));
});

test('AI-confirmed cancellation converts stale concurrent changes into a safe conflict', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const start = source.indexOf('app.post("/api/ai/actions/confirm"');
  const actionStart = source.indexOf('if (action.type === "cancel_order")', start);
  const end = source.indexOf('if (action.type === "settle_debt")', actionStart);
  const block = source.slice(actionStart, end);
  assert.ok(block.includes('This order changed before the cancellation was completed. Please refresh and try again.'));
  assert.ok(block.includes('e.statusCode = 409'));
});

test('buyer cancellation conditionally mutates only still-placed unpaid items', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const start = source.indexOf('app.post("/api/mall/orders/:orderId/cancel"');
  const end = source.indexOf('app.get("/api/mall/vendor/orders"', start);
  const block = source.slice(start, end);
  assert.ok(block.includes("UPDATE mall_order_items SET status = 'cancelled' WHERE id = ? AND status = 'placed' AND paid = 0"));
  assert.ok(block.includes("UPDATE mall_orders SET status = 'cancelled' WHERE id = ? AND userId = ? AND status != 'cancelled'"));
});

test('AI friend-request action checks block/friendship state atomically before inserting', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const start = source.indexOf('if (action.type === "send_friend_request")');
  const end = source.indexOf('return res.status(400).json({ error: "Unsupported action." });', start);
  const block = source.slice(start, end);
  const tx = block.indexOf('db.transaction(() => {');
  const blockedRead = block.indexOf('SELECT 1 FROM blocks', tx);
  const friendshipRead = block.indexOf('SELECT 1 FROM friendships', tx);
  const insert = block.indexOf('INSERT OR IGNORE INTO friend_requests', tx);
  assert.ok(tx >= 0 && blockedRead > tx && friendshipRead > blockedRead && insert > friendshipRead);
});

test('AI friend-request action returns a conflict instead of leaking a duplicate-insert error', () => {
  const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  const start = source.indexOf('if (action.type === "send_friend_request")');
  const end = source.indexOf('return res.status(400).json({ error: "Unsupported action." });', start);
  const block = source.slice(start, end);
  assert.ok(block.includes('e.statusCode = 409'));
  assert.ok(block.includes('You already sent a request to this person.'));
});
