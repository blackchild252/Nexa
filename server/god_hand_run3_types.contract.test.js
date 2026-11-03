"use strict";
// Guards for God Hand run 3, M4526 (real TypeScript errors found by the stand-in strict check). No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("M4526: Ajo contribution button names the member, not a missing field or a raw id", () => {
  const s = read("src/GroupScreen.tsx");
  assert.match(s, /Record contribution for \$\{label\(m\)\}/);
  assert.ok(!/r\.name \|\| r\.memberId/.test(s), "r.name never existed on an Ajo member row");
});

test("M4526: Zeeza inbox row label reads the other person from t.with", () => {
  const s = read("src/ZeezaInbox.tsx");
  assert.match(s, /Open Zeeza conversation \$\{t\.with\?\.name \|\| t\.with\?\.username \|\| t\.id\}/);
  assert.ok(!/\$\{t\.name \|\| t\.username/.test(s), "DmThread has no name or username of its own");
});

test("M4526: Add panel has no dead duplicate accessibilityLabel (modalA11y supplies it); the group label stays", () => {
  const s = read("src/NexaNavKeys.tsx");
  assert.ok(!/accessibilityLabel="NEXA Add actions" \{\.\.\.modalA11y/.test(s));
  assert.match(s, /<View ref=\{panelRef\} tabIndex=\{-1 as any\} \{\.\.\.modalA11y\('NEXA Add', 'NEXA creation actions'\)\}/);
  assert.match(s, /accessibilityGroup\('NEXA Add actions'\)/);
});

test("M4526: form helpers are typed and error is optional", () => {
  const s = read("src/formAccessibility.ts");
  assert.match(s, /export function fieldA11y\(label: string, error\?: unknown\)/);
  assert.match(s, /export function errorA11y\(label: string, message: string\)/);
  assert.match(s, /export function formSubmitA11y\(label: string, busy = false\)/);
  assert.match(s, /function slug\(value: unknown\)/);
});
