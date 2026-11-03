"use strict";
// M7541-M7565: environment and dependency preflight, fail-closed and no-disclosure behavior.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.join(__dirname, "..");
const run = (env) => spawnSync(process.execPath, ["scripts/dependency-preflight.mjs"], { cwd: root, encoding: "utf8", timeout: 12000, env: { ...process.env, ...env } });
const fixture = (files) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexa-preflight-fc-"));
  fs.mkdirSync(path.join(dir, "server"));
  for (const [name, body] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), body);
  return dir;
};

test("malformed or non-object manifests fail closed with a short report and no stack trace", () => {
  for (const bad of ["{bad", "[]", "null", ""]) {
    const dir = fixture({ "package.json": bad, "server/package.json": "{}" });
    try {
      const r = run({ NEXA_ROOT: dir });
      assert.equal(r.status, 2);
      const report = JSON.parse(r.stdout);
      assert.equal(report.reproducible, false);
      assert.ok(report.blockers.some(b => /package\.json is missing, unreadable/.test(b)));
      assert.doesNotMatch(`${r.stdout}${r.stderr}`, /SyntaxError|at \w|node:internal|Unexpected token/);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test("missing server manifest is a blocker, not a crash", () => {
  const dir = fixture({ "package.json": JSON.stringify({ name: "f", version: "1.0.0" }) });
  try {
    const r = run({ NEXA_ROOT: dir });
    assert.equal(r.status, 2);
    assert.ok(JSON.parse(r.stdout).blockers.some(b => /server\/package\.json/.test(b)));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("unreadable lockfile is reported as a blocker and is never rewritten", () => {
  const pkg = JSON.stringify({ name: "f", version: "1.0.0", packageManager: "npm@10.9.2", dependencies: {} });
  const dir = fixture({ "package.json": pkg, "server/package.json": JSON.stringify({ name: "s", dependencies: {} }), "package-lock.json": "{not json" });
  try {
    const r = run({ NEXA_ROOT: dir });
    assert.equal(r.status, 2);
    assert.ok(JSON.parse(r.stdout).blockers.some(b => /package-lock\.json present and readable/.test(b)));
    assert.equal(fs.readFileSync(path.join(dir, "package-lock.json"), "utf8"), "{not json");
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("proxy and registry credentials are never printed", () => {
  const r = run({ https_proxy: "http://user:PROXY-SECRET-123@proxy.invalid:8080", npm_config_registry: "https://tok:REGISTRY-SECRET-456@registry.invalid/" });
  const out = `${r.stdout}${r.stderr}`;
  assert.doesNotMatch(out, /PROXY-SECRET-123|REGISTRY-SECRET-456|user:|tok:/);
  assert.equal(JSON.parse(r.stdout).networkHints.proxyConfigured, true);
});

test("report stays bounded and the script never installs or makes network calls", () => {
  const r = run({});
  assert.ok(r.stdout.length < 20000, "preflight output must stay bounded");
  const src = fs.readFileSync(path.join(root, "scripts/dependency-preflight.mjs"), "utf8");
  assert.doesNotMatch(src, /fetch\s*\(|https?\.request|\b(?:npm|npm\.cmd)\b[^\n]*\[\s*'(?:install|ci)'/);
});

test("dependency preflight bounds oversized dependency-name diagnostics while preserving exact totals", () => {
  const names = Array.from({ length: 120 }, (_, i) => `missing-package-${String(i).padStart(3, "0")}`);
  const dependencies = Object.fromEntries(names.map(name => [name, "1.0.0"]));
  const dir = fixture({
    "package.json": JSON.stringify({ name: "fixture", version: "1.0.0", packageManager: "npm@10.9.2", dependencies }),
    "server/package.json": JSON.stringify({ name: "server-fixture", dependencies: {} }),
    "package-lock.json": JSON.stringify({ lockfileVersion: 3, packages: { "": { version: "1.0.0", packageManager: "npm@10.9.2" } } }),
  });
  try {
    const r = run({ NEXA_ROOT: dir });
    assert.equal(r.status, 2);
    const report = JSON.parse(r.stdout);
    assert.equal(report.missingRootDependencies.total, 120);
    assert.equal(report.missingRootDependencies.shown.length, 40);
    assert.equal(report.missingRootDependencies.truncated, true);
    assert.ok(r.stdout.length < 20000);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("dependency preflight is deterministic across repeated runs with unchanged inputs", () => {
  const pkg = JSON.stringify({ name: "fixture", version: "1.0.0", packageManager: "npm@10.9.2", dependencies: {} });
  const server = JSON.stringify({ name: "server-fixture", dependencies: {} });
  const lock = JSON.stringify({ lockfileVersion: 3, packages: { "": { version: "1.0.0", packageManager: "npm@10.9.2" } } });
  const dir = fixture({ "package.json": pkg, "server/package.json": server, "package-lock.json": lock });
  try {
    const env = { NEXA_ROOT: dir, npm_config_registry: "https://registry.example.invalid/" };
    const first = run(env);
    const second = run(env);
    assert.equal(first.status, second.status);
    assert.equal(first.stdout, second.stdout);
    assert.equal(first.stderr, second.stderr);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
