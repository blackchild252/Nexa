const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("web build has a consent stand-in and never bundles the native ads module", () => {
  const web = read("src/adConsent.web.ts");
  for (const fn of ["prepareAdConsent", "getAdConsentInfo", "showAdPrivacyOptions"]) assert.match(web, new RegExp(`export async function ${fn}`));
  assert.doesNotMatch(web, /(from|require\()\s*['"]react-native-google-mobile-ads['"]/);
  assert.match(read("src/adConsent.ts"), /from 'react-native-google-mobile-ads'/);
});

test("web export is configured and the static host ships a single-page fallback", () => {
  assert.equal(JSON.parse(read("app.json")).expo.web.bundler, "metro");
  assert.equal(JSON.parse(read("package.json")).scripts["build:web"], "expo export --platform web");
  assert.match(read("public/_redirects"), /\/\*\s+\/index\.html\s+200/);
  assert.match(read("public/_headers"), /X-Content-Type-Options: nosniff/);
});
