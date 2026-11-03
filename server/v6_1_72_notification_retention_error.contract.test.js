"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

test("notification retention HTTP route maps storage failures to a generic response", () => {
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  const start = source.indexOf('app.delete("/api/notifications"');
  assert.notEqual(start, -1, "retention route exists");
  const end = source.indexOf('app.post("/api/notifications/read-all"', start);
  assert.ok(end > start, "route body is bounded");
  const route = source.slice(start, end);

  // Authorization must run before the handler can access retention storage.
  assert.match(route, /app\.delete\("\/api\/notifications",\s*auth\.authMiddleware,\s*\(req,\s*res\)\s*=>\s*\{/);
  assert.match(route, /try\s*\{/);
  assert.match(route, /dataRetention\.purgeUserNotifications\(db,\s*req\.user\.id,\s*days\)/);
  assert.match(route, /catch\s*\(_\)\s*\{/);
  assert.match(route, /status\(503\)\.json\(\{ error: "Notification retention is temporarily unavailable\." \}\)/);

  const catchStart = route.indexOf("catch (_)");
  const catchBody = route.slice(catchStart);
  assert.doesNotMatch(catchBody, /console\.(?:log|error|warn)|logger\.|\.message|stack|JSON\.stringify/);
  assert.doesNotMatch(route, /res\.status\(503\)\.json\([^\n]*(?:err|error)\.message/);
  assert.doesNotMatch(route, /res\.json\([^\n]*(?:db|database|sqlite|token)/i);
});
