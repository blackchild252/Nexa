"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("App Builder pipeline contracts are present", () => {
  for (const file of [
    "PROJECT_MEMORY.json",
    "AGENTS.md",
    "docs/builder/APP_BUILDER_PIPELINE.md",
    "docs/builder/PROJECT_MEMORY_PROTOCOL.md",
    "docs/builder/RELEASE_SEAL_CONTRACT.md",
    "docs/architecture/ARCHITECTURE_DECISIONS.md",
    "scripts/builder-gate.mjs",
    "playwright.config.js",
    "e2e/nexa-smoke.spec.js"
  ]) assert.equal(fs.existsSync(path.join(root, file)), true, file);
  const memory = JSON.parse(read("PROJECT_MEMORY.json"));
  assert.equal(memory.project, "NEXA");
  assert.equal(memory.assistantIdentity, "Dami");
  assert.equal(memory.currentVersion, require(path.join(root, "package.json")).version);
  assert.match(read("package.json"), /"@playwright\/test": "1\.53\.2"/);
  assert.deepEqual(memory.deliveryPipeline, [
    "USER", "APP BUILDER CHAT", "PLANNER", "PROJECT MEMORY", "CODING AGENT", "GITHUB REPO",
    "PLAYWRIGHT", "SENTRY", "CODE REVIEW", "FIX / REFACTOR", "TEST AGAIN", "RELEASE GATE", "SEAL"
  ]);
});

test("Builder pipeline preserves the Royal Dark reference and current primary architecture", () => {
  assert.equal(fs.existsSync(path.join(root, "assets/design/NEXA_ROYAL_DARK_VISUAL_REFERENCE.png")), true);
  assert.match(read("src/theme.ts"), /#D4AF37/);
  assert.match(read("src/app/(tabs)/_layout.tsx"), /name="profile"/);
  const tabs = read("src/app/(tabs)/_layout.tsx").replace(/\/\*[\s\S]*?\*\//g, "");
  for (const name of ["index","money","zeeza","marketplace","yaayz","leisure","profile"]) assert.match(tabs, new RegExp(`name=\"${name}\"`));
  assert.doesNotMatch(tabs, /name="ai"/);
  assert.doesNotMatch(tabs, /name="chat"/);
});
