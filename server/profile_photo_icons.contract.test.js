"use strict";
// Guards: the person's own photo shows in every profile icon. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("one shared photo store: loads once from the profile route, and uploads/saves update it", () => {
  const m = read("src/myAvatar.tsx");
  assert.match(m, /apiMyProfile/);
  assert.match(m, /export function setMyAvatar/);
  assert.match(m, /export function clearMyAvatar/);
  assert.match(m, /export function ProfilePhotoIcon/);
  assert.match(m, /<Image[^>]*uri: url/);
  assert.ok((read("src/ZeezaProfile.tsx").match(/setMyAvatar\(p\.avatarUrl\)/g) || []).length >= 3);
});

test("the photo is not added to sign-in data (it can be up to 800 KB)", () => {
  assert.doesNotMatch(read("server/auth.js"), /avatarUrl/);
});

test("Zeeza header icon, Zeeza Profile tab and both menus use the photo icon", () => {
  const z = read("src/app/(tabs)/zeeza.tsx");
  assert.ok((z.match(/<ProfilePhotoIcon/g) || []).length >= 2);
  assert.match(read("src/NexaNavKeys.tsx"), /id === 'profile' \? <ProfilePhotoIcon/);
  assert.match(read("src/HomeCommandCenter.tsx"), /id==='profile'\?<ProfilePhotoIcon/);
});

test("every sign-in and sign-out path clears the shared photo so one person never sees another's", () => {
  const a = read("src/auth.tsx");
  assert.ok((a.match(/clearMyAvatar\(\)/g) || []).length >= 4);
  assert.match(read("src/app/(tabs)/profile.tsx"), /clearMyAvatar\(\)/);
});

test("the fallback icon stays when there is no photo", () => {
  assert.match(read("src/myAvatar.tsx"), /if \(!url\) return <Ionicons/);
});
