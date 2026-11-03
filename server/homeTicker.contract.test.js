"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const src = fs.readFileSync(path.join(__dirname, "..", "src", "HomeCommandCenter.tsx"), "utf8");

test("Home rails enter at the right edge and crawl right-to-left as a measured news ticker", () => {
  assert.match(src, /new Animated\.Value\(viewportW\),\[viewportW,contentW\]/, "value is born at the bar's right edge");
  assert.match(src, /toValue:-contentW/, "ends past the left edge");
  assert.doesNotMatch(src, /copies/, "a single copy: nothing may appear mid-bar");
  assert.match(src, /Animated\.loop\(Animated\.timing\(x/);
  assert.match(src, /Easing\.linear/);
  assert.match(src, /setContentW\(/);
});

test("both Home rails use the ticker (no per-rail animated flag)", () => {
  assert.doesNotMatch(src, /\banimated\b/);
  assert.equal((src.match(/<Rail /g) || []).length, 3);
});

test("reduced motion gets a swipeable static strip instead of animation", () => {
  assert.match(src, /reducedMotion\s*\?\s*<ScrollView horizontal/);
});
