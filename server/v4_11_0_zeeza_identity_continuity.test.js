"use strict";
const assert = require("node:assert/strict");
const test = require("node:test");
const fs = require("node:fs");

const friendsSource = fs.readFileSync(require.resolve("./friends.js"), "utf8");
const uiSource = fs.readFileSync(require.resolve("../src/FriendsScreen.tsx"), "utf8");
const apiSource = fs.readFileSync(require.resolve("../src/friends.ts"), "utf8");

test("V4.11 PublicUser carries an optional avatar URL", () => {
  assert.match(apiSource, /avatarUrl:\s*string \| null/);
  assert.match(friendsSource, /avatarUrl: avatarVisible \? row\.avatarUrl : null/);
});

test("V4.11 search and pending requests only expose public avatars", () => {
  assert.match(friendsSource, /SELECT id, name, username, avatarUrl, profileVisibility FROM users WHERE username LIKE/);
  assert.match(friendsSource, /user: publicUser\(\{ id: r\.uid, name: r\.name, username: r\.username, avatarUrl: r\.avatarUrl, profileVisibility: r\.profileVisibility \}\)/);
  assert.match(friendsSource, /const avatarVisible = !!row\.avatarUrl && \(allowPrivateAvatar \|\| visibility === "public"\);/);
});

test("V4.11 friend and blocked lists can show avatars because the relationship is already known", () => {
  assert.match(friendsSource, /res\.json\(\{ friends: rows\.map\(\(row\) => publicUser\(row, \{ allowPrivateAvatar: true \}\)\) \}\);/);
  assert.match(friendsSource, /res\.json\(\{ blocked: rows\.map\(\(row\) => publicUser\(row, \{ allowPrivateAvatar: true \}\)\) \}\);/);
});

test("V4.11 Friends UI renders supplied profile photos with initials fallback", () => {
  assert.match(uiSource, /function Avatar\(\{ name, avatarUrl \}/);
  assert.match(uiSource, /avatarUrl \? <Image source=\{\{ uri: avatarUrl \}\}/);
  assert.doesNotMatch(uiSource, /<Avatar name=\{friend\.name\} \/>/);
  assert.doesNotMatch(uiSource, /<Avatar name=\{user\.name\} \/>/);
});
