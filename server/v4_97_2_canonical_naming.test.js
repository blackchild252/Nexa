const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (p) => fs.readFileSync(require.resolve("../" + p), "utf8");

test("B32.2 active user-facing product names are canonical", () => {
  const brand = read("src/brand.ts");
  const notifications = read("src/NotificationCenter.tsx");
  const search = read("server/search.js");
  assert.match(brand, /money: 'Sky Money'/);
  assert.match(brand, /marketplace: 'Dream Marketplace'/);
  assert.match(notifications, /type === "money".*Sky Money/);
  assert.match(notifications, /type === "social".*Zeeza/);
  assert.match(notifications, /type === "chat".*Inbox/);
  assert.match(search, /Dami plan/);
  assert.match(search, /Dami note/);
});

test("B32.2 Chase is canonical in active client profile state", () => {
  const profile = read("src/ZeezaProfile.tsx");
  const friends = read("src/friends.ts");
  const server = read("server/friends.js");
  assert.match(profile, /chaseOptIn/);
  assert.match(profile, /chaseCountry/);
  assert.match(profile, /chaseCity/);
  assert.match(friends, /export type ZeezaProfile/);
  assert.match(server, /req\.body\?\.chaseOptIn/);
  assert.match(server, /chaseOptIn:/);
});
