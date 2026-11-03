"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { isLoopbackUrl, installLocalOnlyNetworkGuard } = require("./localOnlyNetwork");

test("local-only network policy permits only loopback HTTP(S) destinations", () => {
  assert.equal(isLoopbackUrl("http://localhost:3000/api/health"), true);
  assert.equal(isLoopbackUrl("http://127.0.0.1:3000/api/health"), true);
  assert.equal(isLoopbackUrl("http://[::1]:3000/api/health"), true);
  assert.equal(isLoopbackUrl("https://api.example.test/v1"), false);
  assert.equal(isLoopbackUrl("file:///tmp/x"), false);
  assert.equal(isLoopbackUrl("not a url"), false);
});

test("local-only fetch guard rejects an external destination without making a request", async () => {
  const original = globalThis.fetch;
  try {
    installLocalOnlyNetworkGuard({ force: true });
    await assert.rejects(globalThis.fetch("https://example.test/never-contact"), { code: "LOCAL_ONLY_EXTERNAL_NETWORK_BLOCKED" });
  } finally {
    globalThis.fetch = original;
  }
});

test("NEXA server binds to loopback and outbound provider routes remain blocked", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  assert.match(index, /app\.listen\(PORT, "127\.0\.0\.1"/);
  assert.match(index, /installLocalOnlyNetworkGuard\(\)/);
});
