"use strict";
// Guards for the repairs in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("ZeezaProfile avatar label uses profile?.name, not an undeclared global name", () => {
  const s = read("src/ZeezaProfile.tsx");
  assert.match(s, /accessibilityLabel=\{`\$\{profile\?\.name \|\| 'Profile'\} avatar`\}/);
  assert.doesNotMatch(s, /\$\{name \|\| /);
});
test("Yaayz discovery sort group keeps the tablist role after the group helper spread", () => {
  assert.match(read("src/YaayzHomeFeed.tsx"), /\{\.\.\.accessibilityGroup\("Yaayz discovery sorting"\)\} accessibilityRole="tablist"/);
});
test("push-alerts switch carries one accessibilityState, with checked and disabled", () => {
  const s = read("src/NotificationCenter.tsx");
  assert.match(s, /accessibilityRole="switch" accessibilityLabel="Enable NEXA push notifications" accessibilityState=\{\{checked:pushEnabled,disabled:savingPrefs\}\}/);
  assert.doesNotMatch(s, /disabled=\{savingPrefs\} accessibilityState=\{\{disabled:savingPrefs\}\}/);
});
test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_32_b278_block_guards\.contract\.test\.js/);
});
