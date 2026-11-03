"use strict";
// Guards for the changes in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("a vendor order push carries the order id to the vendor route", () => {
  assert.match(read("src/pushTapRouting.ts"), /case 'mall_vendor': return withParams\('\/marketplace\/vendor', \{ tab: t\.orderId \? 'orders' : undefined, orderId: t\.orderId \}\)/);
  const r = read("src/app/marketplace/vendor.tsx");
  assert.match(r, /orderId\?:string\|string\[\]/);
  assert.match(r, /initialOrderId=\{orderId\}/);
});

test("the vendor Orders tab highlights the opened order and lists it first", () => {
  const v = read("src/VendorDashboard.tsx");
  assert.match(v, /initialOrderId\?:string/);
  assert.match(v, /Number\(b\.orderId===initialOrderId\)-Number\(a\.orderId===initialOrderId\)/);
  assert.match(v, /borderWidth:2,borderColor:theme\.colors\.royalGold/);
  assert.match(v, /opened from notification/);
});

test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_37_b283_block_guards\.contract\.test\.js/);
});
