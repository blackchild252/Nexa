"use strict";
// Guards: Chase sign-up needs a nationality, and the country field is called "Nearby country". No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("Chase form: nationality is no longer marked optional and is checked before saving", () => {
  const s = read("src/ZeezaProfile.tsx");
  assert.doesNotMatch(s, /Nationality \(optional\)/);
  assert.doesNotMatch(s, /Optional nationality/);
  assert.match(s, /<Text style=\{local\.label\}>Nationality<\/Text>/);
  assert.match(s, /if \(chaseOptIn && !chaseNationality\.trim\(\)\)/);
});

test("Chase server: opting in without a nationality is refused", () => {
  const f = read("server/friends.js");
  assert.match(f, /if \(chaseOptIn && !nationality\) throw new FriendsError\(400/);
});

test("Chase form: the country field says Neighbouring country, not Approximate country", () => {
  const s = read("src/ZeezaProfile.tsx");
  assert.match(s, /<CountryPicker label="Neighbouring country"/);
  assert.doesNotMatch(s, /Approximate country/);
  assert.doesNotMatch(s, /Chase nearby country/);
});
