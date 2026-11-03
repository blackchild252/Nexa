"use strict";
// Guards for the changes in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("NexaDamiRobot remains a thin customizable-avatar compatibility wrapper", () => {
  const s = read("src/NexaDamiRobot.tsx");
  assert.doesNotMatch(s, /\bambient\b/);
  assert.match(s, /const cfg = useAvatar\(\);/);
  assert.match(s, /AvatarStage cfg=\{cfg\} size=\{size\} onPress=\{onPress\}/);
  assert.doesNotMatch(s, /allows\('dami'\)|allows\('vip-spotlight'\)|PanResponder/);
});
test("the push registration the retired root app/ used to hold now lives under src (calls channel and server registration)", () => {
  const push = read("src/pushRegistration.ts");
  assert.match(push, /setNotificationChannelAsync\('calls'/);
  assert.match(push, /getExpoPushTokenAsync/);
  assert.match(push, /\/api\/push\/register/);
});
test("the root app/ folder is gone; src/app is the only route surface", () => {
  assert.ok(!fs.existsSync(path.join(root, "app")));
  assert.ok(fs.existsSync(path.join(root, "src/app/_layout.tsx")));
});
test("this guard file is registered in the release gate", () => {
  assert.match(read("scripts/release-gate.mjs"), /v5_99_33_b279_block_guards\.contract\.test\.js/);
});
