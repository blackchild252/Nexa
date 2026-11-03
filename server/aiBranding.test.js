"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("Dami is the sealed NEXA AI assistant identity", () => {
  const source = read("server/index.js");
  assert.match(source, /const AI_ASSISTANT_NAME = ['"]Dami['"]/);
  assert.match(source, /You are Dami, the AI assistant inside the NEXA platform/);
  assert.doesNotMatch(source, /const CORE_SYSTEM = `You are NEXA,/);
});

test("Dami branding is present in the assistant surface and Home entry", () => {
  const assistant = read("src/NexaAI.tsx");
  const aiScreen = read("src/app/dami.tsx");
  const home = read("src/app/(tabs)/index.tsx");
  const tabs = read("src/app/(tabs)/_layout.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
  assert.match(assistant, /NEXA_AI_NAME/);
  assert.match(aiScreen, /<NexaAI[\s\S]*embedded/);
  assert.match(aiScreen, /router\.replace/);
  assert.match(home, /HomeCommandCenter/);
  assert.doesNotMatch(tabs, /name="ai"/);
});

test("the product identity contract explicitly keeps NEXA as platform and Dami as assistant", () => {
  const brand = read("src/aiBrand.ts");
  assert.match(brand, /NEXA_AI_NAME = 'Dami'/);
  assert.match(brand, /NEXA_PLATFORM_NAME = 'NEXA'/);
  assert.match(brand, /Keep this identity stable/);
});
