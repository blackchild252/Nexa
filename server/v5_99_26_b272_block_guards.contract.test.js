"use strict";
// Guards for the repairs in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("Gemini timeout timers are always cleared (no 30 s process hold after a call)", () => {
  const src = read("server/geminiProvider.js");
  assert.doesNotMatch(src, /new Promise\(\(_, reject\) => setTimeout\(/, "an un-cleared race timer is back");
  const races = (src.match(/Promise\.race\(/g) || []).length;
  const clears = (src.match(/clearTimeout\(timer\)/g) || []).length;
  assert.ok(clears >= races, `${races} Promise.race calls but only ${clears} clearTimeout(timer)`);
});
test("the release gate keeps historical contracts as evidence only (not required in the gate)", () => {
  const gate = read("scripts/release-gate.mjs");
  assert.match(gate, /historicalContracts: 'RETAINED_AS_IMMUTABLE_EVIDENCE'/);
  const listed = (gate.match(/'server\/[^']+\.test\.js'/g) || []).map((x) => x.slice(1, -1));
  for (const p of listed) assert.ok(fs.existsSync(path.join(root, p)), p + " is listed in the gate but missing");
});
test("every retired historical identity check says so and is skipped, not passed", () => {
  const files = fs.readdirSync(__dirname).filter((n) => /\.test\.js$/.test(n) && n !== path.basename(__filename));
  for (const n of files) {
    const s = read("server/" + n);
    if (/__retired|RETIRED/.test(s)) assert.match(s, /retired|Retired/);
    if (/const __retired = new Set/.test(s)) assert.match(s, /__nodeTest\.skip\(/);
  }
});
test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_26_b272_block_guards\.contract\.test\.js/);
});
