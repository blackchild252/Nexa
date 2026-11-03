"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const fixtureSource = fs.readFileSync(path.join(__dirname, "previewFixtures.js"), "utf8");
const indexSource = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

test("preview fixtures are explicitly gated and never seed deterministic credentials by default", () => {
  assert.match(fixtureSource, /NEXA_PREVIEW_MODE !== "1"/);
  assert.match(fixtureSource, /throw new Error\("Preview fixtures require/);
  assert.match(indexSource, /NEXA_PREVIEW_MODE === "1"/);
  assert.match(indexSource, /crypto\.randomBytes\(16\)\.toString\("hex"\)/);
});

test("preview fixture identities are isolated to the nexa.local development domain", () => {
  assert.match(fixtureSource, /preview\.buyer@nexa\.local/);
  assert.match(fixtureSource, /preview\.vendor@nexa\.local/);
  assert.match(fixtureSource, /preview\.admin@nexa\.local/);
  assert.doesNotMatch(fixtureSource, /@gmail\.com|@outlook\.com|@yahoo\.com/);
});
