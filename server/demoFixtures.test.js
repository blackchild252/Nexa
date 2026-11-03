"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const src = fs.readFileSync(path.join(__dirname, "demoFixtures.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");

test("demo pack is preview-gated", () => {
  assert.match(src, /NEXA_PREVIEW_MODE !== "1"/);
  assert.match(index, /NEXA_PREVIEW_MODE === "1"/);
  assert.match(index, /NEXA_SEED_DEMO_VENDORS/);
});

test("demo pack covers the major NEXA sections", () => {
  for (const name of ["Home","Yaayz","Zeeza","Dream Marketplace","Sky Money","Subscription Centre","Lifestyle","Kitchen","Fitness","Ball House","Game House","Dami","Extensions","Verification","Admin"]) assert.match(src, new RegExp(`section: "${name.replace(/[.*+?^${}()|[\\]\\]/g,'\\$&')}"`));
});

test("demo records are visibly inert", () => {
  assert.match(src, /development-preview-only/);
  assert.match(src, /no real funds/i);
  assert.match(src, /verification review fixture/i);
  assert.match(src, /Blaca Essentials remains an existing Marketplace showcase/);
});

test("demo cleanup is implemented", () => {
  assert.match(src, /function remove\(\)/);
  assert.match(src, /DELETE FROM/);
  assert.match(src, /demo_%/);
});
