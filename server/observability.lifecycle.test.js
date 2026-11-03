"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const observability = require("./observability");

test("operational event metadata redacts credential and personal-data keys", () => {
  const event = observability.normalizeOperationalEvent({
    action: "login-failure", domain: "auth", requestId: "req-123",
    metadata: { password: "p@ss", email: "person@example.com", safeCount: 3, nested: { authorization: "Bearer abcdefghijklmnop", route: "/login" } }
  });
  assert.equal(event.metadata.password, "[REDACTED]");
  assert.equal(event.metadata.email, "[REDACTED]");
  assert.equal(event.metadata.safeCount, 3);
  assert.equal(event.metadata.nested.authorization, "[REDACTED]");
  assert.equal(event.metadata.nested.route, "/login");
});

test("operational event metadata is bounded and control characters are removed", () => {
  const huge = Object.fromEntries(Array.from({ length: 60 }, (_, i) => [`k${i}`, "x".repeat(500)]));
  const event = observability.normalizeOperationalEvent({ action: "bad\noperation", requestId: "secret token", metadata: huge });
  assert.equal(event.action.includes("\n"), false);
  assert.equal(event.requestId, null);
  assert.equal(Object.keys(event.metadata).length, 40);
  assert.equal(event.metadata.k0.length, 240);
});

test("deep metadata and secret-like values are redacted without throwing", () => {
  const value = { safe: { deeper: { deepest: { beyond: { tooDeep: "value" } } } }, key: "ghp_abcdefghijklmnopqrstuv" };
  const sanitized = observability.sanitizeMetadata(value);
  assert.equal(sanitized.key, "[REDACTED]");
  assert.equal(sanitized.safe.deeper.deepest.beyond.tooDeep, "[TRUNCATED]");
});

test("backup CLI output avoids absolute paths in success and missing-source diagnostics", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "scripts", "backup-db.mjs"), "utf8");
  assert.match(source, /destination: path\.basename\(target\)/);
  assert.match(source, /backup: path\.basename\(destination\)/);
  assert.match(source, /Configured source database does not exist\./);
  assert.doesNotMatch(source, /console\.error\(`Database does not exist: \$\{source\}`\)/);
});


test("operational event normalization accepts null and array inputs safely", () => {
  assert.deepEqual(observability.normalizeOperationalEvent(null).metadata, {});
  assert.deepEqual(observability.normalizeOperationalEvent(["unsafe"]).metadata, {});
  assert.equal(observability.normalizeOperationalEvent(null).severity, "info");
});

test("exception telemetry never forwards raw message or original stack", () => {
  const raw = new Error("email person@example.com token Bearer abcdefghijklmnop");
  raw.stack = "SECRET_STACK /home/user/private/path.js";
  const safe = observability.safeException(raw);
  assert.equal(safe.message, "Operational exception details redacted");
  assert.doesNotMatch(safe.message, /person@example|Bearer|abcdefghijklmnop/);
  assert.doesNotMatch(safe.stack, /SECRET_STACK|private\/path/);
});

test("exception telemetry bounds and normalizes error names", () => {
  const safe = observability.safeException({ name: "Bad Name", message: "sensitive" });
  assert.equal(safe.name, "Error");
  assert.equal(safe.message, "Operational exception details redacted");
  const known = observability.safeException(Object.assign(new Error("x"), { name: "TypeError" }));
  assert.equal(known.name, "TypeError");
});

test("operational event action and domain remain bounded and control-free", () => {
  const event = observability.normalizeOperationalEvent({ action: "x\r\n" + "a".repeat(200), domain: "y\u0000" + "b".repeat(100) });
  assert.equal(event.action.length, 100); assert.equal(event.domain.length, 60);
  assert.equal(/[\u0000-\u001f\u007f]/.test(event.action + event.domain), false);
});

test("metadata arrays and key counts are bounded", () => {
  const arr = Array.from({ length: 60 }, (_, i) => i);
  const sanitized = observability.sanitizeMetadata({ values: arr });
  assert.equal(sanitized.values.length, 40);
});
