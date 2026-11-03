"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");
test("internal master roadmap is the single permanent execution authority", () => {
  const master = read("MASTER_ROADMAP.md");
  assert.match(master, /^# NEXA MAIN — PERMANENT INTERNAL MASTER ROADMAP/m);
  assert.match(read("AGENTS.md"), /`MASTER_ROADMAP\.md` is the sole active, permanent NEXA Main roadmap/);
  assert.match(read("scripts/roadmap-check.mjs"), /MASTER_ROADMAP\.md/);
  assert.equal(fs.existsSync(path.join(root, "PRIORITY_ROADMAP.md")), false);
  assert.equal(fs.existsSync(path.join(root, "TEMPORARY_ROADMAP.md")), false);
});
test("forward roadmap contains ten ordered 25-milestone blocks from the current active pointer", () => {
  const master = read("MASTER_ROADMAP.md");
  const active = master.match(/^## CURRENT ACTIVE MAIN BLOCK — M(\d+)[–-]M(\d+) —/m);
  assert.ok(active, "current active pointer must exist");
  const firstActive = Number(active[1]);
  assert.equal(Number(active[2]), firstActive + 24);
  const start = master.indexOf(`## REGISTERED FUTURE MAIN APP BLOCK — M${firstActive}–M${firstActive + 24}`);
  assert.notEqual(start, -1);
  const tail = master.slice(start);
  for (let b = 0; b < 10; b++) {
    const first = firstActive + b * 25; const last = first + 24;
    const heading = new RegExp(`^## REGISTERED FUTURE MAIN APP BLOCK — M${first}[–-]M${last} — .+$`, "m");
    const index = tail.search(heading); assert.notEqual(index, -1, `missing block ${first}-${last}`);
    const sectionStart = tail.slice(index); const next = sectionStart.slice(1).search(/^## /m);
    const section = sectionStart.slice(0, next < 0 ? undefined : next + 1);
    const ids = [...section.matchAll(/^\d+\. M(\d+) —/gm)].map(m => Number(m[1]));
    assert.deepEqual(ids, Array.from({length:25}, (_,i)=>first+i), `block ${first}-${last}`);
  }
});
