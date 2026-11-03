"use strict";
// Guards for the sidebar trim, search repair and Yaayz hero colours. No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const search = require("./search");

test("sidebar no longer repeats Kitchen, Ball House, Game House or Fitness; L.A. stays", () => {
  const ids = [...read("src/homeDesign.ts").matchAll(/\['([a-z]+)','[^']+','[a-z-]+-outline'/g)].map((m) => m[1]);
  for (const id of ["ball", "kitchen", "game", "fitness"]) assert.ok(!ids.includes(id), id);
  assert.ok(ids.includes("leisure"));
});

test("the four activities stay reachable from L.A., push taps and search", () => {
  const nav = read("src/nexaNavigation.ts");
  for (const p of ["/leisure/ball-house", "/leisure/kitchen", "/leisure/game-house", "/leisure/fitness"]) {
    assert.ok(nav.includes(`pathname: '${p}'`), p);
    const file = path.join(root, "src/app", ...p.split("/").filter(Boolean), "index.tsx");
    assert.ok(fs.existsSync(file), "screen file for " + p);
  }
  assert.match(nav, /case 'section': return navigationForLeisureActivity\(id\) \|\| navigationForDirectoryItem\(id\)/);
  assert.match(read("src/LeisureArenaScreen.tsx"), /\/leisure\/game-house/);
});

test("search finds app sections even when the user has no data, and never leaks other types", () => {
  const stub = { prepare: () => ({ all: () => [] }) };
  const ids = (q, types = "") => search.searchAll(stub, "u1", q, types, 30).results.map((r) => `${r.type}:${r.id}`);
  assert.deepEqual(ids("fitness"), ["section:fitness"]);
  assert.ok(ids("kitchen").includes("section:kitchen"));
  assert.ok(ids("game").includes("section:game"));
  assert.ok(ids("ball house").includes("section:ball"));
  assert.ok(ids("wallet").includes("section:money"));
  assert.deepEqual(ids("zzzzqq"), []);
  assert.deepEqual(ids("fitness", "money"), []);
});

test("search screen: filter row cannot stretch into tall pills, and sections get a label", () => {
  const s = read("src/UnifiedSearch.tsx");
  assert.match(s, /accessibilityLabel="NEXA search filters" style=\{ds\(\{flexGrow:0,flexShrink:0\}\)\}/);
  assert.match(s, /section:'APP SECTIONS'/);
});

test("Yaayz hero title and description use fixed light colours on the always-dark banner", () => {
  const lines = read("src/YaayzHomeFeed.tsx").split("\n");
  const title = lines.find((l) => l.includes("{hero.title}"));
  const copy = lines.find((l) => l.includes("{hero.copy}"));
  assert.ok(title && title.includes("color:'#FFF8E7'"));
  assert.ok(copy && copy.includes("color:'#E8E0CF'"));
});
