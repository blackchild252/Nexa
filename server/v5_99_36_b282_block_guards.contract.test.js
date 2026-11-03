"use strict";
// Guards for the changes in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("a Yaayz ticket push opens the Yaayz tab with the ticket order id the screen already reads", () => {
  assert.match(read("src/pushTapRouting.ts"), /case 'yaayz': return withParams\('\/\(tabs\)\/yaayz', \{ ticketOrderId: t\.ticketOrderId \}\)/);
  assert.match(read("src/YaayzScreen.tsx"), /ticketOrderId\?:string/);
});

test("a vendor order push opens the Vendor Center on its Orders tab; an invalid tab falls back to Overview", () => {
  assert.match(read("src/pushTapRouting.ts"), /case 'mall_vendor': return withParams\('\/marketplace\/vendor', \{ tab: t\.orderId \? 'orders' : undefined(?:, orderId: t\.orderId)? \}\)/);
  const v = read("src/VendorDashboard.tsx");
  assert.match(v, /initialTab\?:string/);
  assert.match(v, /VENDOR_TABS\.includes\(initialTab as VendorTab\)\?\(initialTab as VendorTab\):'overview'/);
  assert.match(read("src/app/marketplace/vendor.tsx"), /useLocalSearchParams/);
  assert.match(read("src/app/marketplace/vendor.tsx"), /initialTab=\{tab\}/);
});

test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_36_b282_block_guards\.contract\.test\.js/);
});
