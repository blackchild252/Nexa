const { test } = require("node:test");
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const read = (p) => fs.readFileSync(path.join(__dirname, "..", p), "utf8");

test("B32.1 Chase is the canonical Zeeza discovery surface", () => {
  const tab = read("src/app/(tabs)/zeeza.tsx");
  const friends = read("src/friends.ts");
  const server = read("server/friends.js");
  const chase = read("src/ZeezaChase.tsx");
  assert.match(tab, /ZeezaChase/);
  assert.match(tab, /section==='chase'/);
  assert.match(friends, /apiChaseUsers/);
  assert.match(friends, /apiFriendRequestByChase/);
  assert.match(server, /\/api\/social\/chase/);
  assert.match(server, /request\/chase\/:userId/);
  assert.match(chase, /ZeezaChase/);
});

test("B32.1 Explore remains only a compatibility bridge, not the product label", () => {
  const friends = read("src/friends.ts");
  const server = read("server/friends.js");
  assert.match(friends, /Backward-compatible aliases/);
  assert.match(server, /Legacy Explore endpoint kept as a compatibility bridge/);
  assert.match(server, /Legacy Explore request endpoint remains accepted/);
});
