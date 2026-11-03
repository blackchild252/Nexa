"use strict";
// Guards for the repairs in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("the two marketplace tests that compile with tsc work with TypeScript 5 and 6", () => {
  for (const f of ["server/v5_98_45_marketplace_storefront_completion.contract.test.js", "server/v5_99_0_marketplace_storefront.contract.test.js"]) {
    assert.match(read(f), /--ignoreConfig/, f);
  }
});
test("the active route surface is src/app and it does not import expo-splash-screen", () => {
  assert.match(read("package.json"), /"main":\s*"expo-router\/entry"/);
  assert.ok(fs.existsSync(path.join(root, "src/app/_layout.tsx")));
  assert.doesNotMatch(read("src/app/_layout.tsx"), /expo-splash-screen/);
});
test("the legacy app/ shell is retired, so no splash import is left anywhere in a root layout", () => {
  assert.ok(!fs.existsSync(path.join(root, "app")));
  assert.match(read("ARCHITECTURE_RECONCILIATION_V3_60_41.md"), /not an active route surface/);
});
test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_28_b274_block_guards\.contract\.test\.js/);
});
