"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const ai = fs.readFileSync(path.join(__dirname, "aiHub.js"), "utf8");
const mall = fs.readFileSync(path.join(__dirname, "marketplaceOrders.js"), "utf8");

function route(pathName, method) {
  const e = pathName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`app\\.${method}\\([\\"']${e}[\\"'],\\s*auth\\.authMiddleware`);
}

test("28: cross-module consequential boundaries remain authenticated", () => {
  assert.match(source, /app\.post\("\/api\/mall\/checkout",\s*auth\.authMiddleware/);
  assert.match(source, /app\.get\("\/api\/notifications",\s*auth\.authMiddleware/);
  assert.match(source, /req\.body\?\.confirmed !== true/);
  assert.match(ai, /idempotency-key/);
  assert.match(mall, /buyerId=\?|v\.userId=\?/);
});

test("28: payment/notification handoff cannot become an autonomous payment action", () => {
  assert.match(source, /Never propose money transfer, payment, checkout, purchase/);
  assert.match(source, /notificationDelivery\.enqueue/);
  assert.match(source, /paymentMethod.*online/);
  assert.match(source, /payments\.matchesExpectedPayment/);
});

test("30: sensitive lookups retain explicit ownership predicates", () => {
  for (const marker of [
    /id=\? AND userId=\?/,
    /paymentRef = \? AND userId = \?/,
    /extensionId=\? AND userId=\?/,
    /notifications\.list\(db, req\.user\.id/
  ]) assert.match(source, marker);
});

test("30: malformed and untrusted navigation input remains bounded", () => {
  assert.match(source, /Invalid request ID/);
  assert.match(fs.readFileSync(path.join(__dirname, "notifications.js"), "utf8"), /ACTIONS = Object\.freeze/);
  assert.match(source, /requestId/);
  assert.match(source, /Origin not allowed by CORS/);
});
