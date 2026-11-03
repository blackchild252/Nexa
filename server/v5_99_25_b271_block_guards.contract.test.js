"use strict";
// Guards for the repairs in this block. No release number is hard-coded (see scripts/release-identity.mjs).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const walk = (d, out = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (/\.tsx$/.test(e.name)) out.push(p); } return out; };

test("no screen uses 11px text (readable typography baseline)", () => {
  const bad = walk(path.join(root, "src")).filter((p) => /fontSize:\s*11\b/.test(fs.readFileSync(p, "utf8"))).map((p) => path.relative(root, p));
  assert.deepEqual(bad, []);
});
test("quick-access labels come from one constants file and the nav keys use them", () => {
  const a = read("src/nexaAccessibility.ts"), k = read("src/NexaNavKeys.tsx");
  for (const x of ["Search NEXA", "Open NEXA Add actions", "NEXA Home", "Open NEXA directory"]) assert.ok(a.includes(x), x);
  assert.match(k, /NEXA_QUICK_ACCESS_LABELS\.search/);
  assert.match(k, /NEXA_QUICK_ACCESS_LABELS\.menu/);
});
test("Subscription Centre opens one canonical Money target and keeps the compatibility route", () => {
  assert.match(read("src/subscriptionCentre.ts"), /SUBSCRIPTION_CENTRE_CANONICAL_TARGET/);
  assert.match(read("src/homeDesign.ts"), /compatibilityRoute: '\/subscription'/);
});
test("Yaayz save and interest switches expose checked state", () => {
  const s = read("src/YaayzHomeFeed.tsx");
  assert.match(s, /accessibilityState=\{\{checked:isSaved\}\}/);
  assert.match(s, /accessibilityState=\{\{checked:interestFor\(/);
});
