"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const serverPkg = JSON.parse(fs.readFileSync(path.join(__dirname, "package.json"), "utf8"));
const expo = JSON.parse(fs.readFileSync(path.join(root, "app.json"), "utf8"));
const versionDoc = fs.readFileSync(path.join(root, "VERSION.md"), "utf8");

test("release metadata stays synchronized across package, server, Expo, and VERSION.md", () => {
  assert.equal(pkg.version, serverPkg.version);
  assert.equal(expo.expo.version, pkg.version);
  assert.ok(versionDoc.includes(`**Current Version:** V${pkg.version}`));
});


test("server health and boot diagnostics do not carry stale hard-coded release versions", () => {
  const source = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
  assert.match(source, /version:\s*require\(["']\.\/package\.json["']\)\.version/);
  assert.match(source, /\$\{require\(["']\.\/package\.json["']\)\.version\} server listening/);
  assert.doesNotMatch(source, /version:\s*["']3\.\d+\.\d+["']/);
  assert.doesNotMatch(source, /V3\.\d+\.\d+ server listening/);
});


test("Expo Router is the active UI architecture and legacy root shell is explicitly quarantined", () => {
  const routerLayout = fs.readFileSync(path.join(root, "src/app/_layout.tsx"), "utf8");
  const tabsLayout = fs.readFileSync(path.join(root, "src/app/(tabs)/_layout.tsx"), "utf8");
  const reconciliation = fs.readFileSync(path.join(root, "ARCHITECTURE_RECONCILIATION_V3_60_37.md"), "utf8");
  assert.match(routerLayout, /from ['"]expo-router['"]/);
  assert.match(routerLayout, /Stack\.Screen name=['"]\(tabs\)['"]/);
  for (const route of ["index", "money", "zeeza", "marketplace", "yaayz", "profile"]) {
    assert.match(tabsLayout, new RegExp(`Tabs\\.Screen name=['\\"]${route}['\\"]`));
  }
  assert.match(reconciliation, /Expo Router tree under `src\/app\/` is the active navigation surface/);
  assert.match(reconciliation, /root `app\/` state-based shell remains.*recoverable legacy surface/);
});
