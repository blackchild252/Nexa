"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const path = require("node:path");
const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const { validateRefundRequest, validateDisputeRequest } = require("./payments");

test("consequential commerce actions remain fail-closed on malformed identifiers and state", () => {
  const bad = validateRefundRequest(null, 1, null, "refund");
  assert.equal(bad.ok, false);
  assert.equal(bad.status, 404);
  const dispute = validateDisputeRequest(null, "wrong");
  assert.equal(dispute.ok, false);
  assert.equal(dispute.status, 404);
});

test("server source retains user scoping on sensitive cross-module routes", () => {
  for (const marker of [
    /id=\? AND userId=\?/,
    /extensionId=\? AND userId=\?/,
    /paymentRef = \? AND userId = \?/,
    /notifications\.list\(db, req\.user\.id/,
    /getDamiVoicePreference\(req\.user\.id\)/,
  ]) assert.match(source, marker);
});

test("security headers and request correlation reject unsafe ambient browser behavior", () => {
  assert.match(source, /X-Content-Type-Options/);
  assert.match(source, /X-Frame-Options/);
  assert.match(source, /Referrer-Policy/);
  assert.match(source, /Permissions-Policy/);
  assert.match(source, /Cache-Control/);
  assert.match(source, /Origin not allowed by CORS/);
});

test("extension capability and API-key boundaries remain explicit", () => {
  assert.match(source, /extensionCapabilities/);
  assert.match(source, /extensionDeveloper/);
  assert.match(source, /revoked/);
  assert.match(source, /lastUsedAt/);
});
