"use strict";
// Guards for the repairs in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

// A name used in JSX or a call must be imported or defined in the same file, or the screen crashes when it renders.
test("NexaPressable is imported wherever Ball House and the Yaayz native ad use it", () => {
  for (const f of ["src/app/leisure/ball-house/index.tsx", "src/YaayzNativeAd.tsx"]) {
    const s = read(f);
    assert.match(s, /<NexaPressable/, f);
    assert.match(s, /import\s*\{[^}]*\bNexaPressable\b[^}]*\}\s*from\s*['"][./]+motion['"]/, f);
  }
});
test("MarketplaceScreen imports ratingLabel, which the seller rating line calls", () => {
  const s = read("src/MarketplaceScreen.tsx");
  assert.match(s, /ratingLabel\(shop\.ratingAvg,shop\.ratingCount\)/);
  assert.match(s, /import\s*\{[^}]*\bratingLabel\b[^}]*\}\s*from\s*['"]\.\/marketplaceStoreUtils['"]/);
});
test("MoneyDashboard imports the Subscription screen it renders", () => {
  const s = read("src/MoneyDashboard.tsx");
  assert.match(s, /<Subscription\s*\/>/);
  assert.match(s, /import\s*\{\s*Subscription\s*\}\s*from\s*['"]\.\/Subscription['"]/);
});
test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_31_b277_block_guards\.contract\.test\.js/);
});
