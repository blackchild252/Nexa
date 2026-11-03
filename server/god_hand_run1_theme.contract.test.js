"use strict";
// Guards for God Hand run 1, group 3 (M4500 to M4504). No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { stripTypeScriptTypes } = require("node:module");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const logic = async () => { const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'nexa-theme-mode-')); const code = stripTypeScriptTypes(read('src/themeMode.ts'), { mode: 'strip' }); fs.writeFileSync(path.join(dir, 'themeMode.mjs'), code); return import(pathToFileURL(path.join(dir, 'themeMode.mjs')).href); };

test("M4500: three choices; Default is the starting choice; saved Dark or Light are kept exactly", async () => {
  const t = await logic();
  assert.deepEqual([...t.THEME_PREFERENCES], ["default", "dark", "light"]);
  assert.equal(t.DEFAULT_THEME_PREFERENCE, "default");
  assert.equal(t.normalizeThemePreference("dark"), "dark");
  assert.equal(t.normalizeThemePreference("light"), "light");
  assert.equal(t.normalizeThemePreference("default"), "default");
  for (const nothing of [undefined, null, "", "auto", 5]) assert.equal(t.normalizeThemePreference(nothing), "default");
  assert.equal(t.THEME_STORAGE_KEY, "nexa.theme.mode", "the storage key must not change, or old saved choices are lost");
});

test("M4501: Default follows the phone; Dark and Light ignore it", async () => {
  const t = await logic();
  assert.equal(t.resolveThemeMode("default", "light"), "light");
  assert.equal(t.resolveThemeMode("default", "dark"), "dark");
  assert.equal(t.resolveThemeMode("default", null), "dark");
  assert.equal(t.resolveThemeMode("default", undefined), "dark");
  for (const phone of ["light", "dark", null]) {
    assert.equal(t.resolveThemeMode("dark", phone), "dark");
    assert.equal(t.resolveThemeMode("light", phone), "light");
  }
  assert.match(read("app.json"), /"userInterfaceStyle": "automatic"/);
  const prov = read("src/ThemeProvider.tsx");
  assert.match(prov, /Appearance\.addChangeListener/);
  assert.match(prov, /AppState\.currentState === 'active'/);
  assert.match(prov, /state === 'active'\) readPhone\(\)/);
});

test("M4502: the picker has three tiles with accessibility labels and a clear selected state", () => {
  const s = read("src/ThemePicker.tsx");
  for (const id of ["'default'", "'dark'", "'light'"]) assert.ok(s.includes(`id: ${id}`), `missing tile ${id}`);
  assert.match(s, /title: 'Default'/);
  assert.match(s, /accessibilityRole="radio"/);
  assert.match(s, /accessibilityState=\{\{ selected: active \}\}/);
  assert.match(s, /follows your phone/);
  assert.match(s, /o\.id === preference/);
  assert.match(read("src/app/(tabs)/profile.tsx"), /<ThemePicker preference=\{preference\} onSelect=\{setPreference\}\/>/);
});

test("M4503: status bar follows the resolved look; start-up background and first frame use the saved choice", () => {
  const p = read("src/ThemeProvider.tsx");
  assert.match(p, /getItem\?\.\(THEME_STORAGE_KEY\)/);
  assert.match(p, /export function startupBackground/);
  assert.match(p, /SHELL_BACKGROUND\[resolveThemeMode\(preference, systemScheme\)\]/);
  const l = read("src/app/_layout.tsx");
  assert.match(l, /StatusBar style=\{mode === 'light' \? 'dark' : 'light'\}/);
  assert.match(l, /backgroundColor:startupBackground\(\)/);
});

test("M4504: the app re-resolves live when the phone changes, and only the provider decides the look", () => {
  const p = read("src/ThemeProvider.tsx");
  assert.match(p, /setActiveThemeMode\(resolveThemeMode\(preference, systemScheme\)\)/);
  assert.match(p, /\[preference, systemScheme\]/);
  assert.match(p, /await SecureStore\.setItemAsync\(THEME_STORAGE_KEY, chosen\)/);
});
