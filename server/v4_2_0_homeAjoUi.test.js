"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("V4.2.0 Home is Dami-first and exposes immediate text and voice entry", () => {
  const home = read("src/app/(tabs)/index.tsx");
  const dami = read("src/NexaAI.tsx");
  assert.match(home, /<NexaAI[\s\S]*embedded/);
  assert.match(dami, /Start live voice/);
  assert.match(dami, /Recorded voice command/);
  assert.match(dami, /Dami is your NEXA front door/);
  assert.match(dami, /Quick Scam Check/);
  assert.doesNotMatch(dami, /\[\['Sky Money'/);
  assert.doesNotMatch(dami, /send\(prompt\)/);
});

test("V4.2.0 Store Ajo has an explicit back action when opened from Money", () => {
  const money = read("src/MoneyDashboard.tsx");
  const ajo = read("src/StoreAjo.tsx");
  assert.match(money, /<StoreAjo \/>/);
  assert.match(ajo, /Back to Sky Money/);
  assert.match(ajo, /onBack\?: \(\) => void/);
});

test("V4.2.0 hidden AI route resolves to the same Dami assistant surface", () => {
  const dami = read("src/app/dami.tsx");
  assert.match(dami, /<NexaAI[\s\S]*embedded/);
  assert.match(dami, /router\.(?:push|replace)\('\/\(tabs\)'/);
  assert.match(dami, /NexaAI/);
});
