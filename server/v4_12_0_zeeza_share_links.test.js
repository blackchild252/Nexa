"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const friendsSource = fs.readFileSync(require.resolve("./friends.js"), "utf8");
const dbSource = fs.readFileSync(require.resolve("./db.js"), "utf8");
const profileSource = fs.readFileSync(require.resolve("../src/ZeezaProfile.tsx"), "utf8");
const apiSource = fs.readFileSync(require.resolve("../src/friends.ts"), "utf8");
const apiBaseSource = fs.readFileSync(require.resolve("../src/api.ts"), "utf8");
const routeSource = fs.readFileSync(require.resolve("../src/app/zeeza/share/[token].tsx"), "utf8");


test("V4.12 creates a unique opaque Zeeza share token", () => {
  assert.match(dbSource, /zeezaShareToken/);
  assert.match(dbSource, /idx_users_zeeza_share_token/);
  const integrity = fs.readFileSync(require.resolve('./v5_80_0_zeeza_share_integrity.js'), 'utf8');
  assert.match(integrity, /randomBytes\(24\)/);
  assert.match(integrity, /TOKEN_RE = \/\^\[A-Za-z0-9_-\]\{32\}\$\/;/);
  assert.match(integrity, /TOKEN_LENGTH = 32/);
});

test("V4.12 shared profile preview is token-scoped and does not require auth", () => {
  const integrity = fs.readFileSync(require.resolve("./v5_80_0_zeeza_share_integrity.js"), "utf8");
  assert.match(friendsSource, /app\.get\("\/api\/social\/profile\/share\/:token", \.\.\.limited, handle/);
  assert.match(integrity, /WHERE zeezaShareToken = \?/);
  assert.match(friendsSource, /Profile link not found\./);
});

test("V4.12 adding from a shared link still requires authenticated friend-request boundary", () => {
  assert.match(friendsSource, /app\.post\("\/api\/social\/friends\/request\/share\/:token", A/);
  assert.match(friendsSource, /if \(isBlocked\(req\.user\.id, target\.id\)\)/);
  assert.match(friendsSource, /if \(areFriends\(req\.user\.id, target\.id\)\)/);
});

test("V4.12 profile UI creates and shares a native NEXA app link", () => {
  assert.match(profileSource, /Share\.share/);
  assert.match(profileSource, /apiCreateZeezaShareLink/);
  assert.match(profileSource, /nexa:\/\/zeeza\/share\/\$\{token\}/);
  assert.match(profileSource, /Share your Zeeza profile/);
});

test("V4.12 client has public preview and authenticated add-from-link APIs", () => {
  assert.match(apiBaseSource, /export async function publicFetch/);
  assert.match(apiSource, /apiSharedZeezaProfile/);
  assert.match(apiSource, /apiFriendRequestByZeezaShare/);
});

test("V4.12 Expo Router contains the shared-profile destination", () => {
  assert.match(routeSource, /apiSharedZeezaProfile/);
  assert.match(routeSource, /apiFriendRequestByZeezaShare/);
  assert.match(routeSource, /Add on Zeeza/);
});
