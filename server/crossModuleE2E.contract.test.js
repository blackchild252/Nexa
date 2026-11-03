"use strict";

const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

function route(pathName, method = "get") {
  const escaped = pathName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`app\\.${method}\\([\\"']${escaped}[\\"']`);
}

function authRoute(pathName, method = "get") {
  const escaped = pathName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`app\\.${method}\\([\\"']${escaped}[\\"'],\\s*auth\\.authMiddleware`);
}

test("cross-module authenticated journey has the expected application boundaries", () => {
  const required = [
    ["/api/dami", "post"],
    ["/api/notifications", "get"],
    ["/api/notifications/:id/read", "post"],
    ["/api/mall/products", "get"],
    ["/api/mall/checkout", "post"],
    ["/api/mall/payments/verify", "post"],
    ["/api/ai/voice-preferences", "get"],
    ["/api/ai/voice-preferences", "patch"],
    ["/api/extensions", "get"],
    ["/api/platform/contracts", "get"],
  ];
  for (const [pathName, method] of required) assert.match(source, route(pathName, method), `${method.toUpperCase()} ${pathName} must remain wired`);
});

test("user data entry points remain server-authenticated", () => {
  const protectedRoutes = [
    ["/api/dami", "post"],
    ["/api/notifications", "get"],
    ["/api/mall/payments/verify", "post"],
    ["/api/ai/voice-preferences", "get"],
    ["/api/ai/voice-preferences", "patch"],
    ["/api/extensions", "get"],
  ];
  for (const [pathName, method] of protectedRoutes) assert.match(source, authRoute(pathName, method), `${method.toUpperCase()} ${pathName} must require auth middleware`);
});

test("Dami-to-Mall routing retains the read-only tool and navigation boundary", () => {
  assert.match(source, /mall_orders/);
  assert.match(source, /navigation.*marketplace/);
  assert.match(source, /NEXA_READ_TOOLS/);
  assert.match(source, /Never propose money transfer, payment, checkout, purchase/);
});

test("payment-to-order flow keeps ownership and provider verification checks", () => {
  assert.match(source, /paymentRef = \? AND userId = \?/);
  assert.match(source, /payments\.matchesExpectedPayment/);
  assert.match(source, /paymentMethod.*online/);
  assert.match(source, /mall_payment_events/);
});
