"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("extension runtime rejects closed owners even when an API identity was previously issued", () => {
  const s = read("server/index.js");
  assert.match(s, /SELECT id,email,name,username,accountStatus FROM users WHERE id=\?/);
  assert.match(s, /String\(u\.accountStatus \|\| "active"\) !== "active"/);
  assert.match(s, /authUserForExtension\(identity\.userId\)/);
});

test("extension capability availability requires at least one granted requested scope", () => {
  const { capabilityAvailability } = require("./extensions");
  const extension = { status: "enabled", requestedScopes: ["profile.read"], minNexaVersion: "3.58.0" };
  assert.deepEqual(capabilityAvailability(extension, [], "3.82.1"), { enabled: false, reason: "consent-required", scopes: [] });
  assert.deepEqual(capabilityAvailability(extension, ["profile.read"], "3.82.1"), { enabled: true, reason: "enabled", scopes: ["profile.read"] });
});

test("vendor manual payment mutation is transactionally bounded by current order state", () => {
  const s = read("server/index.js");
  const start = s.indexOf('app.patch("/api/mall/vendor/orders/:orderId/payment"');
  const end = s.indexOf('// -- Vendor business summary', start);
  assert.ok(start >= 0 && end > start);
  const block = s.slice(start, end);
  assert.match(block, /db\.transaction\(\(\) => \{/);
  assert.match(block, /SELECT paymentMethod, paymentRef, status FROM mall_orders/);
  assert.match(block, /status.*cancelled/);
  assert.match(block, /UPDATE mall_order_items SET paid = \?, paidAt = \? WHERE orderId = \? AND vendorId = \? AND status != 'cancelled' AND paid != \?/);
  assert.ok(block.indexOf("db.transaction(() => {") < block.indexOf("UPDATE mall_order_items SET paid"));
});
