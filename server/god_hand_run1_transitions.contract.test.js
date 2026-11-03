"use strict";
// Guards for God Hand run 1, group 2 (M4494 to M4499). No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("M4494: Free accounts get the basic motion level; richer effects stay tiered", () => {
  const m = read("src/motion.tsx");
  assert.match(m, /export const BASIC_MOTION_LEVEL = 30/);
  assert.match(m, /free:BASIC_MOTION_LEVEL/);
  assert.match(m, /'world-ambient':60/);
  assert.match(m, /'vip-spotlight':100/);
});

test("M4495: the default motion context already has basic motion (no flip after the plan loads)", () => {
  const m = read("src/motion.tsx");
  assert.match(m, /createContext<MotionContextValue>\(\{tier:'free', level:BASIC_MOTION_LEVEL/);
  assert.doesNotMatch(m, /level:0, loading:true/);
});

test("M4496: bottom tabs use one short fade, none under reduced motion", () => {
  const t = read("src/app/(tabs)/_layout.tsx");
  assert.match(t, /tabAnimation = reducedMotion \|\| !allows\('navigation'\) \? 'none' : 'fade'/);
  assert.match(t, /animation:tabAnimation/);
});

test("M4497: every Modal uses the shared rule; side menus share one duration", () => {
  const rule = read("src/motion.tsx");
  assert.match(rule, /export function modalAnimationType/);
  assert.match(rule, /if \(reducedMotion\) return 'none'/);
  // M4516: the one side-menu duration now comes from the shared timing scale; its value is still 280.
  assert.match(rule, /export const SIDE_MENU_MS = MOTION_MS\.menu;/);
  assert.match(read("src/motionTiming.ts"), /menu: 280,/);
  for (const f of ["src/NexaNavKeys.tsx", "src/HomeCommandCenter.tsx", "src/VendorPhotos.tsx", "src/app/(tabs)/profile.tsx"]) {
    const s = read(f);
    assert.doesNotMatch(s, /animationType="(fade|slide)"/, `${f} still hard-codes a Modal animation`);
  }
  assert.doesNotMatch(read("src/NexaNavKeys.tsx"), /\? 280 : 0/);
  assert.doesNotMatch(read("src/HomeCommandCenter.tsx"), /\?280:0/);
});

test("M4498: reduced motion is asked at import time and held off until the phone answers", () => {
  const m = read("src/motion.tsx");
  assert.match(m, /let reducedMotionCache: boolean \| null = null/);
  assert.match(m, /useState<boolean>\(reducedMotionCache===null\?true:reducedMotionCache\)/);
  assert.match(m, /try \{ AccessibilityInfo\.isReduceMotionEnabled/);
});

test("M4499 (partial): the rebuild only restores the route when the screen was really lost", () => {
  const l = read("src/app/_layout.tsx");
  assert.match(l, /if \(livePath\.current !== target\) router\.replace/);
});
