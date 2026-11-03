"use strict";
// Guards: the name typed at signup is the NEXA username. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const m = require("./signupUsername");

test("a signup name becomes a valid lowercase username", () => {
  assert.equal(m.baseFromName("dapo"), "dapo");
  assert.equal(m.baseFromName("Ade Ola"), "adeola");
  assert.equal(m.baseFromName("Ṣọla é"), "solae");
  for (const n of ["dapo", "12", "", "ab", "A very long name with many many words in it", "admin"]) {
    const b = m.baseFromName(n);
    assert.match(b, m.USERNAME_RE, `base for "${n}"`);
  }
});

test("friends.js uses the same username rule instead of its own copy", () => {
  assert.match(read("server/friends.js"), /require\("\.\/signupUsername"\)/);
  assert.doesNotMatch(read("server/friends.js"), /const USERNAME_RE =/);
});

test("email signup, Google signup and the startup backfill all assign the username", () => {
  assert.match(read("server/auth.js"), /assignSignupUsername\(db,id,name\)/);
  assert.match(read("server/googleAuth.js"), /assignSignupUsername\(db, id, name\)/);
  assert.match(read("server/db.js"), /backfillUsernames\(db\)/);
});

test("an existing username is never overwritten, and taken names get a number", () => {
  const src = read("server/signupUsername.js");
  assert.match(src, /if \(!row \|\| row\.username\) return/);
  assert.match(src, /AND username IS NULL/);
  assert.match(src, /for \(let n = 2;/);
});

test("the signup screen asks for a Username", () => {
  const s = read("src/app/auth/signup.tsx");
  assert.match(s, /accessibilityLabel="Username"/);
  assert.match(s, /Choose a username/);
});
