"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { spawnSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const hash = file => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, file))).digest("hex");

test("local environment preflight is read-only and distinguishes missing build tools", () => {
  const before = ["package-lock.json", "app.json", "PROJECT_MEMORY.json"].map(hash);
  const result = spawnSync(process.execPath, ["scripts/environment-preflight.mjs"], { cwd: root, encoding: "utf8", timeout: 20000 });
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.readOnly, true);
  assert.ok(report.node && report.npm && report.java && report.android && report.browser && report.typecheck && report.nativeModule && report.ios && report.webExport);
  assert.equal(report.typecheck.tsconfigExtends, "expo/tsconfig.base");
  assert.equal(typeof report.typecheck.reactNativeInstalled, "boolean");
  assert.deepEqual(["package-lock.json", "app.json", "PROJECT_MEMORY.json"].map(hash), before, "preflight must not mutate dependency or release identity files");
});

test("dependency preflight reports remediation and does not rewrite lockfile or release identity", () => {
  const before = ["package-lock.json", "app.json", "PROJECT_MEMORY.json", "server/releaseIdentity.json"].map(hash);
  const result = spawnSync(process.execPath, ["scripts/dependency-preflight.mjs"], { cwd: root, encoding: "utf8", timeout: 12000 });
  assert.ok([0, 2].includes(result.status), result.stderr);
  const report = JSON.parse(result.stdout);
  assert.ok(Array.isArray(report.checks));
  assert.ok(Array.isArray(report.remediation));
  assert.ok(report.networkHints && typeof report.networkHints.registryHost === "string");
  assert.ok(report.missingLockEntries && Array.isArray(report.missingLockEntries.shown));
  assert.equal(typeof report.missingLockEntries.total, "number");
  assert.equal(typeof report.missingLockEntries.truncated, "boolean");
  assert.deepEqual(["package-lock.json", "app.json", "PROJECT_MEMORY.json", "server/releaseIdentity.json"].map(hash), before, "read-only preflight must not alter lockfile or release identity");
});

test("server startup reports missing dependencies concisely before loading app modules", () => {
  const result = spawnSync(process.execPath, ["server/index.js"], { cwd: root, encoding: "utf8", timeout: 8000, env: { ...process.env, NEXA_BOOTSTRAP_TEST_SECRET: "must-not-print" } });
  assert.equal(result.status, 1);
  const output = `${result.stdout}\n${result.stderr}`;
  assert.match(output, /NEXA server cannot start: required dependencies are missing or not resolvable\./);
  assert.match(output, /Missing packages \(\d+\):/);
  assert.match(output, /npm ci/);
  assert.doesNotMatch(output, /must-not-print|Error: Cannot find module|MODULE_NOT_FOUND/);
});

test("dependency preflight detects an invalid lock without network requests or mutation", () => {
  const os = require("node:os");
  const { mkdtempSync, writeFileSync, rmSync } = fs;
  const temp = mkdtempSync(path.join(os.tmpdir(), "nexa-lock-preflight-"));
  try {
    const write = (name, value) => writeFileSync(path.join(temp, name), JSON.stringify(value, null, 2));
    write("package.json", { name: "fixture", version: "1.2.3", packageManager: "npm@10.9.2", engines: { node: ">=20.19.0" }, dependencies: { "fixture-dep": "1.0.0" } });
    fs.mkdirSync(path.join(temp, "server"), { recursive: true });
    write("server/package.json", { name: "fixture-server", version: "1.2.3", dependencies: { "fixture-dep": "1.0.0" } });
    write("package-lock.json", { name: "fixture", version: "1.2.3", lockfileVersion: 3, packages: { "": { name: "fixture", version: "9.9.9", packageManager: "npm@1.0.0" } } });
    const before = crypto.createHash("sha256").update(fs.readFileSync(path.join(temp, "package-lock.json"))).digest("hex");
    const result = spawnSync(process.execPath, ["scripts/dependency-preflight.mjs"], { cwd: root, encoding: "utf8", timeout: 12000, env: { ...process.env, NEXA_ROOT: temp, npm_config_offline: "true" } });
    assert.equal(result.status, 2);
    const report = JSON.parse(result.stdout);
    assert.ok(report.blockers.some(x => /lockfile root version/.test(x)));
    assert.ok(report.blockers.some(x => /lockfile root packageManager/.test(x)));
    assert.equal(report.networkHints.offlineMode, true);
    assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(temp, "package-lock.json"))).digest("hex"), before);
    const source = fs.readFileSync(path.join(root, "scripts/dependency-preflight.mjs"), "utf8");
    assert.doesNotMatch(source, /fetch\s*\(|https?\.request|spawnSync\([^\n]*(?:install|ci)/, "preflight must not make network requests or install dependencies");
  } finally { rmSync(temp, { recursive: true, force: true }); }
});

test("server test runner declares bounded per-test and whole-suite timeouts with grouped dependency failures", () => {
  const source = fs.readFileSync(path.join(root, "scripts/run-server-suite.mjs"), "utf8");
  assert.match(source, /NEXA_TEST_TIMEOUT_MS/);
  assert.match(source, /NEXA_TEST_SUITE_TIMEOUT_MS/);
  assert.ok(source.includes("terminate('SIGTERM')"));
  assert.ok(source.includes("terminate('SIGKILL')"));
  assert.ok(source.includes("process.kill(-child.pid, signal)"));
  assert.match(source, /Missing-module failure summary/);
  assert.match(source, /Dependency-related skipped tests/);
});
