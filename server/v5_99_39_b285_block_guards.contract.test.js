"use strict";
// Guards for the changes in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const app = () => JSON.parse(read("app.json"));

test("app.json has no versionName fields that Expo's schema rejects", () => {
  const e = app().expo;
  assert.equal(e.versionName, undefined);
  assert.equal(e.android.versionName, undefined);
  assert.equal(e.ios.versionName, undefined);
});

test("the build code fields the locked rule names are still all present and equal", () => {
  const a = app(), e = a.expo;
  const code = e.android.versionCode;
  assert.ok(Number.isInteger(code));
  assert.deepStrictEqual([Number(e.ios.buildNumber), e.extra.versionCode, a.versionCode], Array(3).fill(code));
});

test("the identity script no longer checks the removed fields, and still writes the locked ones", () => {
  const s = read("scripts/release-identity.mjs");
  assert.doesNotMatch(s, /e\.versionName|e\.android\?\.versionName|e\.ios\?\.versionName/);
  assert.match(s, /e\.extra\.versionCode = next\.buildCode/);
});

test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_39_b285_block_guards\.contract\.test\.js/);
});
