"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

test("Royal Dark is the canonical permanent visual system", () => {
  const theme = read("src/theme.ts");
  for (const token of [
    "royalGold: '#D4AF37'", "brightGold: '#FFD700'", "ivoryText: '#F8F5E9'",
    "graphite: '#1A1A1A'", "charcoal: '#2A2A2A'", "deepBlack: '#000000'",
    "success: '#2ECC71'", "info: '#3498DB'", "warning: '#F5A623'", "error: '#E74C3C'"
  ]) assert.match(theme, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(theme, /gold:\s*\['#FFD700', '#D4AF37'\]/);
  assert.match(theme, /app:\s*\['#000000', '#1A1A1A'\]/);
});

test("Royal Dark primary navigation preserves the canonical seven-section shell", () => {
  const tabs = read("src/app/(tabs)/_layout.tsx");
  for (const name of ["index", "money", "zeeza", "marketplace", "yaayz", "leisure", "profile"]) {
    assert.match(tabs, new RegExp(`name=\"${name}\" options=\{\{title`));
  }
  assert.match(tabs, /name=\"ai\" options=\{\{href:null\}\}/);
  assert.match(tabs, /backgroundColor:focused\?theme\.colors\.brightGold/);
  assert.match(tabs, /borderTopColor:tc\('rgba\(212,175,55,0\.45\)'\)/);
});

test("Royal Dark gradient primitive is present", () => {
  const primitive = read("src/RoyalBackground.tsx");
  assert.match(primitive, /LinearGradient/);
  assert.match(primitive, /theme\.gradients\.app/);
});
