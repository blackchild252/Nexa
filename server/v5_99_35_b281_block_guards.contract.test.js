"use strict";
// Guards for the changes in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const exists = (f) => fs.existsSync(path.join(root, f));

test("push taps: the live layout mounts PushTaps, which listens for taps, handles a launch tap and sets the foreground handler", () => {
  assert.match(read("src/app/_layout.tsx"), /<PushTaps\/>/);
  const s = read("src/pushTaps.tsx");
  assert.match(s, /addNotificationResponseReceivedListener/);
  assert.match(s, /getLastNotificationResponseAsync/);
  assert.match(s, /setNotificationHandler/);
  assert.match(s, /DEFAULT_ACTION_IDENTIFIER/);
  assert.match(s, /status === 'authenticated'/);
});

test("push taps: every screen the server sends a push for maps to a route that exists under src/app", () => {
  const map = read("src/pushTapRouting.ts");
  for (const screen of ["money_group","vendor_staff","mall_vendor","mall_orders","friend_requests","friends","chat","dm_thread","chat_room","call","yaayz","leisure","leisure_kitchen"]) {
    assert.match(map, new RegExp(`case '${screen}'`), `missing ${screen}`);
  }
  assert.match(map, /\/zeeza\/group-call/);
  for (const f of ["src/app/staff.tsx","src/app/marketplace/vendor.tsx","src/app/leisure/kitchen/index.tsx","src/app/zeeza/call.tsx","src/app/zeeza/group-call.tsx","src/app/(tabs)/zeeza.tsx","src/app/(tabs)/money.tsx","src/app/(tabs)/marketplace.tsx","src/app/(tabs)/yaayz.tsx","src/app/(tabs)/leisure.tsx"]) assert.ok(exists(f), f);
});

test("push taps: the params the router sends are the params the destination screens read", () => {
  assert.match(read("src/app/(tabs)/zeeza.tsx"), /section\?:string;resultId\?:string\|string\[\];threadId\?:string\|string\[\];roomId/);
  assert.match(read("src/app/(tabs)/money.tsx"), /view\?:string;groupId\?:string/);
  assert.match(read("src/app/(tabs)/marketplace.tsx"), /orderId\?:string;tab\?:string/);
  assert.match(read("src/app/zeeza/call.tsx"), /callId\?:string;media\?:string/);
});

test("Devil's Walk and God Hand scripts exist, are registered, and never write version, Batch, build or archive names", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.equal(pkg.scripts.walk, "node scripts/devils-walk.mjs");
  assert.equal(pkg.scripts.godhand, "node scripts/god-hand.mjs");
  for (const f of ["scripts/devils-walk.mjs", "scripts/god-hand.mjs"]) {
    const s = read(f);
    assert.doesNotMatch(s, /writeFileSync\([^)]*(package\.json|app\.json|PROJECT_MEMORY|AGENTS\.md|VERSION\.md|RELEASE_SEAL)/);
    assert.doesNotMatch(s, /\.zip['"`]\s*\)\s*;?\s*$/m);
  }
  assert.match(read("scripts/god-hand.mjs"), /const SIZE = 25;/);
  assert.match(read("scripts/god-hand.mjs"), /npm run release:bump/);
  assert.match(read("scripts/god-hand.mjs"), /never edits files, versions, Batch/i);
});

test("the ship step runs the Devil's Walk quick sweep before sealing", () => {
  const s = read("scripts/release-ship.mjs");
  assert.ok(s.indexOf("devils-walk.mjs") > -1);
  assert.ok(s.indexOf("devils-walk.mjs") < s.indexOf("release-seal.mjs"));
});

test("the Devil's Walk quick sweep is clean on the real source", () => {
  const { spawnSync } = require("node:child_process");
  const r = spawnSync(process.execPath, [path.join(root, "scripts", "devils-walk.mjs"), "--fast"], { cwd: root, encoding: "utf8", env: { ...process.env, NEXA_ROOT: root } });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test("the Devil's Walk definition document exists and the locked naming section is untouched in meaning", () => {
  const d = read("docs/architecture/DEVILS_WALK_AND_GOD_HAND.md");
  assert.match(d, /Devil's Walk/);
  assert.match(d, /God Hand/);
  assert.match(d, /25/);
  assert.match(read("AGENTS.md"), /## Naming and versioning \(PERMANENT NEXA RULE — LOCKED\)/);
  assert.doesNotMatch(d, /V\d+\.\d+\.\d+/);
});

test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_35_b281_block_guards\.contract\.test\.js/);
});
