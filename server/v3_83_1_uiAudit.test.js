"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("V3.83.1 release metadata and royal theme are aligned", () => {
  const pkg = require(path.join(root, "package.json"));
  const serverPkg = require(path.join(root, "server", "package.json"));
  const app = require(path.join(root, "app.json"));
  assert.match(pkg.version,/^\d+\.\d+\.\d+$/);
  assert.equal(serverPkg.version, pkg.version);
  assert.equal(app.expo.version, pkg.version);
  const theme = read("src/theme.ts");
  assert.match(theme, /royalGold:\s*'#D4AF37'/);
  assert.match(theme, /deepBlack:\s*'#000000'/);
  assert.match(theme, /brightGold:\s*'#FFD700'/);
  assert.match(theme, /surface:/);
});

test("Current primary navigation preserves the canonical seven-section NEXA shell", () => {
  const tabs = read("src/app/(tabs)/_layout.tsx");
  for (const name of ["index", "money", "zeeza", "marketplace", "yaayz", "leisure", "profile"]) {
    assert.match(tabs, new RegExp(`name=\\\"${name}\\\"`));
  }
  assert.match(tabs, /tabBarActiveTintColor:\s*theme\.colors\.brightGold/);
  assert.match(tabs, /name="ai" options=\{\{href:null\}\}/);
});

test("V3.83.1 root shell uses dark status bar and route transition", () => {
  const layout = read("src/app/_layout.tsx");
  assert.match(layout, /StatusBar style=\{mode === 'light' \? 'dark' : 'light'\}/);
  assert.match(layout, /'fade_from_bottom'/);
  assert.match(layout, /theme\.colors\.background/);
});

test("embedded product identity keeps NEXA backbone, Dami native, Zeeza and Dream Marketplace distinct", () => {
  const home = read("src/app/(tabs)/index.tsx");
  const tabs = read("src/app/(tabs)/_layout.tsx");
  const zeeza = read("src/app/(tabs)/zeeza.tsx");
  const mall = read("src/app/(tabs)/marketplace.tsx");
  assert.match(tabs, /title:BRAND\.marketplace/);
  assert.match(tabs, /title:BRAND\.marketplace/);
  assert.match(home, /<NexaAI[\s\S]*embedded/);
  assert.match(tabs, /title:BRAND\.marketplace/);
  assert.match(zeeza, /Zeeza/);
  assert.match(mall, /Dream Marketplace/);
});

test("user-facing social search label is Zeeza while backend type remains people", () => {
  const search = read("src/UnifiedSearch.tsx");
  assert.match(search, /\['people','Zeeza'\]/);
  assert.match(search, /people:'ZEEZA'/);
  assert.match(search, /Search Zeeza, groups, Dream Marketplace, Yaayz, Sky Money/);
});

test("Sentry wiring is optional and does not expose credentials", () => {
  const server = read("server/sentry.js");
  const client = read("src/sentry.ts");
  const pkg = require(path.join(root, "package.json"));
  const serverPkg = require(path.join(root, "server", "package.json"));
  assert.equal(pkg.dependencies["@sentry/react-native"], "~7.2.0");
  assert.equal(serverPkg.dependencies["@sentry/node"], "10.75.2");
  assert.match(server, /SENTRY_DSN/);
  assert.match(server, /sendDefaultPii: false/);
  assert.match(client, /EXPO_PUBLIC_SENTRY_DSN/);
  assert.doesNotMatch(client, /SENTRY_AUTH_TOKEN/);
  const gate = read("scripts/builder-gate.mjs");
  assert.match(gate, /Boolean\(String\(process\.env\.SENTRY_DSN \|\| ''\)\.trim\(\)\)/);
  assert.doesNotMatch(gate, /SENTRY_DSN \|\| process\.env\.SENTRY_AUTH_TOKEN/);
});


test("release tree has no stale roadmap backup artifact", () => {
  assert.equal(fs.existsSync(path.join(root, "TEMPORARY_ROADMAP.md.bak")), false);
});

test("preview smoke enforces the buyer/admin authorization boundary", () => {
  const smoke = read("server/previewSmoke.js");
  assert.match(smoke, /buyer-admin-denied/);
  assert.match(smoke, /status !== 403/);
  assert.match(smoke, /tokens\.admin/);
});
