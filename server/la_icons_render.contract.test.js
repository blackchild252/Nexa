"use strict";
// Guards: Kitchen and Fitness icons must draw on Android. Emoji written with the "VS16" selector (U+FE0F)
// on a text-style base (the plate and the weightlifter) show blank on many phones. No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("L.A. cards: every icon is a plain emoji (no U+FE0F selector, none missing)", () => {
  const s = read("src/LeisureArenaScreen.tsx");
  const icons = [...s.matchAll(/icon:'([^']*)'/g)].map((m) => m[1]);
  assert.equal(icons.length, 4);
  for (const i of icons) { assert.ok(i.length > 0); assert.ok(!i.includes("\uFE0F"), `icon ${i} uses U+FE0F`); }
  assert.match(s, /title:'The Kitchen',icon:'\u{1F374}'/u);
  assert.match(s, /title:'Fitness',icon:'\u{1F4AA}'/u);
});

test("Fitness page title and the Sports & fitness department no longer use the weightlifter emoji", () => {
  assert.doesNotMatch(read("src/app/leisure/fitness/index.tsx"), /\u{1F3CB}/u);
  assert.doesNotMatch(read("src/marketplaceStoreUtils.ts"), /\u{1F3CB}/u);
});
