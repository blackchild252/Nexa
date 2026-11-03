"use strict";
// Guards for God Hand run 2, M4516 (one shared timing scale for animation durations). No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { stripTypeScriptTypes } = require("node:module");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const load = async (f) => { const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'nexa-pure-')); const code = stripTypeScriptTypes(read(f), { mode: 'strip' }); const out = path.join(dir, path.basename(f, '.ts') + '.mjs'); fs.writeFileSync(out, code); return import(pathToFileURL(out).href); };

test("M4516: the scale exists, is frozen, and keeps the values the app already used", async () => {
  const t = await load("src/motionTiming.ts");
  assert.ok(Object.isFrozen(t.MOTION_MS), "scale is frozen");
  assert.deepEqual({ ...t.MOTION_MS }, {
    instant: 0, blinkClose: 90, blinkOpen: 140, avatarBlinkOpen: 120,
    enterBasic: 260, enterRich: 340, enterMax: 420,
    itemBasic: 240, itemRich: 280, itemMax: 320,
    menu: 280, pulse: 850, breathe: 1500,
  });
  // Same answers as the old inline formulas, for every plan level.
  for (const level of [0, 30, 59, 60, 99, 100, 120]) {
    assert.equal(t.enterMs(level), level >= 100 ? 420 : level >= 60 ? 340 : 260, `enterMs(${level})`);
    assert.equal(t.itemEnterMs(level), level >= 100 ? 320 : level >= 60 ? 280 : 240, `itemEnterMs(${level})`);
  }
});

test("M4516: shared call sites use the scale instead of raw numbers", () => {
  const motion = read("src/motion.tsx");
  assert.match(motion, /from '\.\/motionTiming'/);
  assert.match(motion, /const duration=enterMs\(level\)\+mp\.enterMsDelta/);
  assert.match(motion, /const duration=itemEnterMs\(level\)\+mp\.enterMsDelta/);
  assert.match(motion, /export const SIDE_MENU_MS = MOTION_MS\.menu;/);
  assert.equal((motion.match(/duration:MOTION_MS\.pulse/g) || []).length, 2, "both pulse steps");
  const orb = read("src/NexaGlossyOrb.tsx");
  assert.equal((orb.match(/duration: MOTION_MS\.breathe/g) || []).length, 2, "both breathe steps");
  const avatar = read("src/NexaAvatar.tsx");
  assert.match(avatar, /from '\.\/motionTiming'/);
  assert.match(avatar, /duration: MOTION_MS\.blinkClose/);
  assert.match(avatar, /duration: MOTION_MS\.avatarBlinkOpen/);
  const compatibility = read("src/NexaDamiRobot.tsx");
  assert.match(compatibility, /AvatarStage cfg=\{cfg\} size=\{size\} onPress=\{onPress\}/);
  assert.match(compatibility, /useAvatar\(\)/);
  for (const f of ["src/motion.tsx", "src/NexaGlossyOrb.tsx", "src/NexaAvatar.tsx"]) {
    assert.ok(!/duration:\s*(90|120|140|260|340|420|240|280|320|850|1500)\b/.test(read(f)), `${f} has no raw scale value left`);
  }
});

test("M4516: ratchet. The count of raw non-zero duration numbers must not grow", () => {
  // Baseline taken when the scale was added. Lower it when more call sites move onto the scale; never raise it.
  const BASELINE = 110;
  let count = 0;
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.tsx?$/.test(e.name)) count += (fs.readFileSync(p, "utf8").match(/duration:\s*[1-9][0-9_]*/g) || []).length;
    }
  };
  walk(path.join(root, "src"));
  assert.ok(count <= BASELINE, `raw duration numbers grew to ${count} (baseline ${BASELINE}); use a step from src/motionTiming.ts`);
});

test("M4517: Wallet history debit amounts follow the theme (white was invisible on Earth Light)", () => {
  const wallet = read("src/Wallet.tsx");
  assert.match(wallet, /x\.direction==="credit"\?tc\("#9fe0b0"\):theme\.colors\.text/);
  assert.ok(!/direction==="credit"\?tc\("#9fe0b0"\):"#fff"/.test(wallet), "raw white debit colour is gone");
});
