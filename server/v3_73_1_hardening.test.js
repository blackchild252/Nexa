"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");

test("dependency preflight enforces the declared Node 20.19.0 minimum", () => {
  const s = fs.readFileSync(path.join(root, "scripts/dependency-preflight.mjs"), "utf8");
  assert.match(s, /20\.19\.0/);
  assert.match(s, /nodeMeetsMinimum/);
});

test("notification delivery has a bounded provider timeout and abort path", () => {
  const s = fs.readFileSync(path.join(__dirname, "notificationDelivery.js"), "utf8");
  assert.match(s, /PROVIDER_TIMEOUT_MS\s*=\s*15_000/);
  assert.match(s, /AbortController/);
  assert.match(s, /controller\.abort\(\)/);
  assert.match(s, /provider timeout after/);
});

test("production frontend API configuration cannot silently fall back to localhost", () => {
  const s = fs.readFileSync(path.join(root, "src/api.ts"), "utf8");
  assert.match(s, /isProductionBuild/);
  assert.match(s, /EXPO_PUBLIC_API_URL must be configured for production builds/);
  assert.match(s, /must be an absolute HTTP\(S\) URL/);
});
