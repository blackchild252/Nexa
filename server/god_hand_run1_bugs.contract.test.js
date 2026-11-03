"use strict";
// Guards for God Hand run 1, group 1 (M4490 to M4493). No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("M4490: Home menu rows have no chevron (the rail ticker chevron is a different control)", () => {
  const s = read("src/HomeCommandCenter.tsx");
  const rows = s.slice(s.indexOf("DIRECTORY.map("), s.indexOf("directoryDivider"));
  assert.ok(rows.length > 100, "directory rows block not found");
  assert.doesNotMatch(rows, /chevron-forward/);
});

test("M4491: menu rows skip only on the module's own root screen", () => {
  const nav = read("src/NexaNavKeys.tsx");
  assert.match(nav, /isOnModuleRoot\(pathname, \(target as any\)\.pathname\)/);
  assert.doesNotMatch(nav, /id === activeId && id !== 'notifications'\) return/);
  const keys = read("src/nexaNavKeys.ts");
  assert.match(keys, /export function isOnModuleRoot/);
});

test("M4492: both pressables forward unlisted props and still run their own press animation", () => {
  const s = read("src/motion.tsx");
  for (const name of ["NexaPressable", "NexaFocusPressable"]) {
    const start = s.indexOf(`export function ${name}(`);
    assert.ok(start >= 0, `${name} not found`);
    const body = s.slice(start, s.indexOf("\nexport ", start + 10));
    assert.match(body, /\.\.\.rest\}/, `${name} must collect extra props`);
    assert.match(body, /<Pressable \{\.\.\.rest\}/, `${name} must spread them onto Pressable`);
    assert.match(body, /onPressIn\?\.\(e\)/, `${name} must call the caller's onPressIn`);
    assert.match(body, /onPressOut\?\.\(e\)/, `${name} must call the caller's onPressOut`);
  }
  assert.match(s, /export type NexaPressableForwarded=Omit<PressableProps/);
});

test("M4493: Yaayz post card passes onPressIn to a pressable that forwards it", () => {
  const y = read("src/YaayzSocialFeed.tsx");
  assert.match(y, /<NexaPressable onPress=\{\(\)=>tap\(post\)\} onPressIn=/);
});
