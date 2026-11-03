"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const source = require("fs").readFileSync(require("path").join(__dirname, "index.js"), "utf8");

test("buyer cancellation re-reads payment and order-item state inside its write transaction", () => {
  const start = source.indexOf('app.post("/api/mall/orders/:orderId/cancel"');
  const end = source.indexOf('// -- Vendor side: orders containing this vendor\'s items --', start);
  assert.ok(start >= 0 && end > start);
  const route = source.slice(start, end);
  const tx = route.indexOf("db.transaction(() => {");
  assert.ok(tx >= 0);
  const body = route.slice(tx);
  assert.ok(body.includes('SELECT status, paymentMethod, paymentRef FROM mall_orders WHERE id = ? AND userId = ?'));
  assert.ok(body.includes('SELECT * FROM mall_order_items WHERE orderId = ? AND status != \'cancelled\''));
  assert.ok(body.indexOf("currentActive.some((i) => i.status !== \"placed\")") < body.indexOf("UPDATE mall_order_items SET status = 'cancelled'"));
});

test("vendor order transition re-reads current vendor lines before mutation", () => {
  const start = source.indexOf('app.patch("/api/mall/vendor/orders/:orderId/status"');
  const end = source.indexOf('// -- Online payment:', start);
  assert.ok(start >= 0 && end > start);
  const route = source.slice(start, end);
  const tx = route.indexOf("db.transaction(() => {");
  const reread = route.indexOf('SELECT * FROM mall_order_items WHERE orderId = ? AND vendorId = ?', tx);
  const mutation = route.indexOf('UPDATE mall_order_items SET status = ? WHERE id = ? AND status = ?', reread);
  assert.ok(tx >= 0 && reread > tx && mutation > reread);
  assert.ok(route.slice(reread, mutation).includes("currentBlocked"));
});

test("buyer cancellation does not notify again when a concurrent request already cancelled the order", () => {
  const start = source.indexOf('app.post("/api/mall/orders/:orderId/cancel"');
  const end = source.indexOf('// -- Vendor side: orders containing this vendor\'s items --', start);
  const route = source.slice(start, end);
  assert.ok(route.indexOf('if (!cancelled) return res.json({ order: loadOrder(order.id) });') < route.indexOf('notifyVendorsOfOrder(order.id, "Order cancelled by buyer")'));
});

test("vendor order transition does not notify again when the requested state was already reached concurrently", () => {
  const start = source.indexOf('app.patch("/api/mall/vendor/orders/:orderId/status"');
  const end = source.indexOf('// -- Online payment:', start);
  const route = source.slice(start, end);
  assert.ok(route.indexOf('if (!changed) return res.json({ ok: true, status: next });') < route.indexOf('sendPush(buyerRow.userId'));
});
