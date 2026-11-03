"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("B155 app.json carries one version-code authority and the iOS tracking disclosure", () => {
  const app = JSON.parse(read("app.json"));
  assert.equal(app.expo.versionCode, undefined, "expo.versionCode is not a valid Expo field and must stay removed");
  assert.equal(app.versionCode, app.expo.android.versionCode, "locked rule: root versionCode equals the build code");
  assert.equal(app.versionName, undefined);
  assert.ok(Number.isInteger(app.expo.android.versionCode) && app.expo.android.versionCode >= 5981);
  const ads = app.expo.plugins.find((p) => Array.isArray(p) && p[0] === "react-native-google-mobile-ads");
  assert.match(String(ads[1].userTrackingPermission), /ads/i);
});

test("B155 EAS builds use the Node version the repository pins", () => {
  const eas = JSON.parse(read("eas.json"));
  assert.equal(eas.build.base.node, read(".nvmrc").trim());
});

test("B155 Profile exposes Privacy Policy and Terms through the safe external-link policy", () => {
  const legal = read("src/legalLinks.ts");
  assert.match(legal, /process\.env\.EXPO_PUBLIC_PRIVACY_POLICY_URL/);
  assert.match(legal, /process\.env\.EXPO_PUBLIC_TERMS_URL/);
  assert.match(legal, /validateExternalUrl/);
  const profile = read("src/app/(tabs)/profile.tsx");
  assert.match(profile, /LEGAL_LINKS/);
  assert.match(profile, /openExternalUrl/);
  assert.match(profile, /Close NEXA account/, "account closure must remain in Profile");
});

test("B155 launch preflight script and docs are present and honest", () => {
  assert.match(read("package.json"), /"launch:preflight": "node scripts\/launch-preflight\.mjs"/);
  assert.match(read("scripts/launch-preflight.mjs"), /never invents values/);
  assert.match(read("README.md"), /^# NEXA — Current status \(V\d+\.\d+\.\d+ B\d+\)/);
  assert.match(read("LAUNCH_HANDOFF.md"), /(NOT TESTED|excluded|launch)/i);
});
