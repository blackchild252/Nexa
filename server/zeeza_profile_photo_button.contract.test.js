"use strict";
// Guards the Zeeza profile photo button. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const src = fs.readFileSync(path.join(__dirname, "..", "src", "ZeezaProfile.tsx"), "utf8");

test("the photo picker button sits on the main avatar, outside the Edit panel", () => {
  const hero = src.slice(src.indexOf("local.heroCard"), src.indexOf("local.infoCard"));
  assert.match(hero, /onPress=\{chooseAvatar\}/);
  assert.match(hero, /Add Zeeza profile picture|Change Zeeza profile picture/);
});

test("the photo button is a named, disableable button and shows a spinner while uploading", () => {
  const hero = src.slice(src.indexOf("local.heroCard"), src.indexOf("local.infoCard"));
  assert.match(hero, /accessibilityRole="button"/);
  assert.match(hero, /disabled=\{avatarBusy\}/);
  assert.match(hero, /ActivityIndicator/);
});

test("a text link under the avatar offers the same action, and the Edit panel picker is kept", () => {
  assert.match(src, /Add profile photo/);
  assert.match(src, /Change photo/);
  assert.ok((src.match(/onPress=\{chooseAvatar\}/g) || []).length >= 3);
});
