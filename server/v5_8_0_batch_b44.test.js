"use strict";
const test = require("node:test");
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("B44 release metadata is synchronized", () => {
  const pkg = JSON.parse(read("package.json"));
  const server = JSON.parse(read("server/package.json"));
  const expo = JSON.parse(read("app.json"));
  assert.ok(atLeast(pkg.version,'5.8.0'),'version must be at least 5.8.0');
  assert.equal(server.version, pkg.version);
  assert.equal(expo.version, pkg.version);
  assert.equal(expo.expo.version, pkg.version);
  assert.equal(expo.expo.android.version, pkg.version);
  assert.equal(expo.expo.ios.version, pkg.version);
  assert.equal(expo.expo.ios.version, pkg.version);
  assert.ok(atLeast(currentVersionMd(read("VERSION.md")), "5.8.0"));
});

test("B44 platform events persist bounded severity", () => {
  const s = read("server/eventCorrelation.js");
  assert.match(s, /SEVERITIES = Object\.freeze/);
  assert.match(s, /severity: SEVERITIES\.includes/);
  assert.match(s, /platform_event_log\(id,requestId,userId,action,entityType,entityId,metadata,createdAt,severity\)/);
});

test("B44 platform event schema migrates severity safely", () => {
  const s = read("server/db.js");
  assert.match(s, /ALTER TABLE platform_event_log ADD COLUMN severity TEXT NOT NULL DEFAULT 'info'/);
  assert.match(s, /idx_platform_event_severity/);
});

test("B44 operational summary exposes recent severity counts", () => {
  const s = read("server/operationsConsole.js");
  assert.match(s, /recentEventSummary/);
  assert.match(s, /recent: recentEventSummary/);
});

test("B44 admin diagnostics is authenticated and admin-scoped", () => {
  const s = read("server/index.js");
  assert.match(s, /\/api\/admin\/operations\/diagnostics.*auth\.authMiddleware/);
  assert.match(s, /if \(!isConfiguredAdmin\(req\.user\)\)/);
  assert.match(s, /operational\.inspectDiagnostics/);
});

test("B44 admin event view is authenticated and bounded", () => {
  const s = read("server/index.js");
  assert.match(s, /\/api\/admin\/operations\/events.*auth\.authMiddleware/);
  assert.match(s, /Math\.min\(Math\.max\(Number\(req\.query\?\.limit\)/);
  assert.match(s, /offset/); assert.match(s, /limit/);
  assert.match(s, /operationsConsole\.recentEvents/);
});

test("B44 admin event filtering only accepts known severities", () => {
  const s = read("server/operationsConsole.js");
  assert.match(s, /\["info", "warning", "error", "critical"\]\.includes/);
});

test("B44 operational metadata remains credential-safe", () => {
  const s = read("server/eventCorrelation.js");
  assert.match(s, /password\|secret\|token\|authorization\|cookie\|keyhash/i);
  assert.match(s, /MAX_METADATA = 4096/);
});

test("B44 release audit derives the active version from package metadata", () => {
  const s = read("scripts/release-audit.mjs");
  assert.match(s, /const requiredVersion = pkg\.version/);
  assert.match(s, /serverPkg\.version !== requiredVersion/);
});

test("B44 deep-audit contract follows the repaired Group Call effect and current release", () => {
  const s = read("VERSION.md");
  assert.match(read("src/GroupCallScreen.tsx"), /return\(\)=>\{pollRequest\.current\+\+;clearInterval\(timer\)\}\},\[call,callId,connectPeer\]\);/);
  assert.ok(atLeast(currentVersionMd(s), "5.8.0"));
});
