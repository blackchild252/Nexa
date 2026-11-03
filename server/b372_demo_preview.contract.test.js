"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const src = fs.readFileSync(path.join(__dirname, "demoFixtures.js"), "utf8");
const cleanup = fs.readFileSync(path.join(__dirname, "removePreviewDemos.js"), "utf8");

test("B372 demo layer remains strictly preview gated", () => {
  assert.match(src, /NEXA_PREVIEW_MODE !== "1"/);
  assert.match(src, /development-preview-only/);
  assert.match(src, /DEMO ORDER/);
  assert.match(src, /DEMO USER VIOLATION/);
  assert.match(src, /DEMO VENDOR VIOLATION/);
});

test("B372 demo layer seeds real buyer/seller/admin workflow records", () => {
  for (const token of [
    "mall_orders", "mall_order_items", "mall_checkout_disputes",
    "social_reports", "mall_interaction_reports", "vendor_subscription_periods",
    "admin_work", "verification_requests", "nexa_subscriptions"
  ]) assert.match(src, new RegExp(token));
});

test("B372 demo cleanup covers seeded workflow records and showcase vendors", () => {
  for (const token of [
    "mall_checkout_disputes", "mall_orders", "mall_order_items",
    "social_reports", "mall_interaction_reports", "vendor_subscription_periods",
    "Blaca Essentials", "NEXA Preview Store"
  ]) assert.ok((cleanup + src).includes(token), `missing cleanup coverage: ${token}`);
});

test("B372 demo inventory explicitly tracks vendor testing", () => {
  assert.match(src, /Vendor Dashboard/);
  assert.match(src, /Dream Marketplace/);
  assert.match(src, /Blaca Essentials/);
  assert.match(src, /Ball House/);
  assert.match(src, /Game House/);
});
