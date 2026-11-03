"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const root = require("node:path").join(__dirname, "..");
const friends = fs.readFileSync(require.resolve("./friends.js"), "utf8");
const db = fs.readFileSync(require.resolve("./db.js"), "utf8");
const api = fs.readFileSync(require.resolve("../src/friends.ts"), "utf8");
const explore = fs.readFileSync(require.resolve("../src/ZeezaChase.tsx"), "utf8");
const legacyExplore = fs.readFileSync(require.resolve("../src/ZeezaExplore.tsx"), "utf8");
const profile = fs.readFileSync(require.resolve("../src/ZeezaProfile.tsx"), "utf8");
const zeeza = fs.readFileSync(require.resolve("../src/app/(tabs)/zeeza.tsx"), "utf8");

test("V4.13 Explore requires explicit opt-in and terms version", () => {
  assert.match(db, /zeezaExploreOptIn/);
  assert.match(db, /zeezaExploreCountry/);
  assert.match(db, /zeezaExploreCity/);
  assert.match(friends, /zeezaExploreOptIn = 1/);
  assert.match(friends, /zeezaExploreTermsVersion = \?/);
  assert.match(friends, /const ZEEZA_CHASE_TERMS_VERSION = "1\.1"/);
  assert.match(profile, /I agree — show me on Chase/);
});

test("V4.13 Explore never requires exact location", () => {
  assert.match(friends, /function cleanArea/);
  assert.match(friends, /Choose a city or area/);
  assert.doesNotMatch(friends, /latitude|longitude|gps|geolocation/i);
  assert.match(explore, /never asks for or displays an exact address/i);
});

test("V4.13 Explore is block-aware and account-scoped", () => {
  assert.match(friends, /accountStatus = 'active'/);
  assert.match(friends, /isBlocked\(req\.user\.id, r\.id\)/);
  assert.match(friends, /target\.zeezaExploreOptIn/);
  assert.match(friends, /isBlocked\(req\.user\.id, target\.id\)/);
});

test("V4.13 stranger requests use location-aware server limits", () => {
  assert.match(friends, /const CHASE_LIMITS = \{ local: 5, country: 2, international: 1 \}/);
  assert.match(friends, /const CHASE_PENDING_MAX = 5/);
  assert.match(friends, /source = 'explore'/);
  assert.match(friends, /request\/explore\/:userId/);
  assert.match(friends, /source, createdAt/);
});

test("V4.13 Explore has a first-class Zeeza navigation surface", () => {
  assert.match(zeeza, /ZeezaChase/);
  assert.doesNotMatch(zeeza, /params\.section === 'explore'/);
  assert.match(zeeza, />Chase<\/Text>/);
  assert.match(api, /apiExploreUsers/);
  assert.match(api, /apiFriendRequestByExplore/);
});


test("V4.14 Chase renames the user-facing discovery surface and adds subscription reach", () => {
  const subscriptions = fs.readFileSync(require.resolve("./subscriptions.js"), "utf8");
  assert.match(zeeza, />Chase<\/Text>/);
  assert.match(explore, /You are in Chase mode/);
  assert.match(legacyExplore, /ZeezaChase/);
  assert.match(subscriptions, /chaseReach/);
  assert.match(subscriptions, /Nearby Chase/);
  assert.match(subscriptions, /Country Chase/);
  assert.match(subscriptions, /Global Chase/);
  assert.match(subscriptions, /Royal Global Chase/);
  assert.match(friends, /plan\.chaseReach/);
});

test("V4.14 Chase keeps location changes on a safety cooldown", () => {
  assert.match(db, /zeezaExploreLocationChangedAt/);
  assert.match(friends, /CHASE_LOCATION_COOLDOWN_MS = 72/);
  assert.match(friends, /current\.zeezaExploreLocationChangedAt/);
});
