"use strict";
// Guards for God Hand run 1, group 4, second part (M4510 to M4514). No release number is hard-coded.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { stripTypeScriptTypes } = require("node:module");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const load = async (f) => { const dir = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'nexa-pure-')); const code = stripTypeScriptTypes(read(f), { mode: 'strip' }); const out = path.join(dir, path.basename(f, '.ts') + '.mjs'); fs.writeFileSync(out, code); return import(pathToFileURL(out).href); };

test("M4510: menu moves replace the previous menu hop; signup has a Back button", async () => {
  const nk = await load("src/nexaNavKeys.ts");
  assert.equal(nk.menuMoveMode("/(tabs)/money", null), "push", "first menu move from a normal screen pushes");
  assert.equal(nk.menuMoveMode("/wallet", "/wallet"), "replace", "still on the last menu hop: replace it");
  assert.equal(nk.menuMoveMode("/(tabs)/marketplace", "/marketplace"), "replace", "tab group is ignored");
  assert.equal(nk.menuMoveMode("/zeeza", "/wallet"), "push", "user left that hop: push again");
  const nav = read("src/NexaNavKeys.tsx");
  assert.match(nav, /menuMoveMode\(pathname, lastMenuHop\)/);
  assert.match(nav, /if \(mode === 'replace'\) router\.replace/);
  assert.match(nav, /lastMenuHop = null; router\.replace/, "Home and Notifications reset the hop");
  const signup = read("src/app/auth/signup.tsx");
  assert.match(signup, /accessibilityLabel="Back to sign in"/);
  assert.match(signup, /router\.canGoBack\(\)\)router\.back\(\);else router\.replace\('\/auth\/login'/);
  assert.match(signup, /minHeight:44,minWidth:44/);
});

test("M4511: nav bar gives the title room; menu labels are 14", () => {
  const nav = read("src/NexaNavKeys.tsx");
  const bar = nav.match(/bar: \{[^}]*\}/)[0];
  assert.match(bar, /gap: 2, paddingHorizontal: 4/);
  const title = nav.match(/title: \{[^}]*\}/)[0];
  assert.match(title, /flexShrink: 1/);
  assert.match(title, /fontSize: 17/);
  assert.match(title, /paddingHorizontal: 3/);
  assert.match(nav, /rowLabel: \{ flex: 1, color: theme\.colors\.ivoryText, fontSize: 16,/);
  assert.match(nav, /key: \{ width: theme\.accessibility\.minTouchTarget, height: theme\.accessibility\.minTouchTarget/, "keys stay 44");
});

test("M4512: loops pause in the background, resume with a fresh loop, and stop cleanly", async () => {
  const { createLoopRegistry, appStateToActive } = await load("src/nexaLoopRegistry.ts");
  const made = [];
  const makeLoop = (anim) => {
    const l = { anim, started: 0, stopped: 0, cb: null, start(cb) { l.started++; l.cb = cb; }, stop() { l.stopped++; if (l.cb) l.cb({ finished: false }); }, reset() {} };
    made.push(l); return l;
  };
  const reg = createLoopRegistry(makeLoop);
  const a = reg.create("A"); a.start();
  assert.equal(made[0].started, 1);
  reg.setActive(false);
  assert.equal(made[0].stopped, 1, "background stops the loop");
  reg.setActive(false); assert.equal(made[0].stopped, 1, "no double stop");
  reg.setActive(true);
  assert.equal(made.length, 2, "a fresh loop is built on return");
  assert.equal(made[1].anim, "A");
  assert.equal(made[1].started, 1);
  a.stop();
  assert.equal(reg.size(), 0, "stop removes it");
  reg.setActive(false); reg.setActive(true);
  assert.equal(made.length, 2, "a stopped loop is never resurrected");
  // started while backgrounded: waits, then runs on return
  reg.setActive(false);
  const b = reg.create("B"); b.start();
  assert.equal(made[2].started, 0);
  reg.setActive(true);
  assert.equal(made[3].started, 1);
  // finishing naturally calls the caller's callback once
  let done = 0; const c = reg.create("C"); c.start(() => done++);
  made[made.length - 1].cb({ finished: true });
  assert.equal(done, 1);
  assert.equal(appStateToActive("background", true), false);
  assert.equal(appStateToActive("active", false), true);
  assert.equal(appStateToActive("inactive", true), true, "brief inactive changes nothing");
  assert.equal(appStateToActive("inactive", false), false);
  assert.equal(appStateToActive(undefined, true), true);
});

test("M4512: the pause is installed once at the app root and listens to AppState", () => {
  assert.match(read("src/app/_layout.tsx"), /import '\.\.\/nexaAppStatePause';/);
  const glue = read("src/nexaAppStatePause.ts");
  assert.match(glue, /AppState\.addEventListener\('change'/);
  assert.match(glue, /Animated as any\)\.loop = /);
  assert.match(glue, /catch/);
});

test("M4513: audited; the named style files are fully theme-wrapped and no new raw colours sneak in", () => {
  for (const f of ["src/groupStyles.ts", "src/socialStyles.ts", "src/styles.ts"]) {
    const src = read(f);
    const all = (src.match(/#[0-9A-Fa-f]{3,8}\b|rgba?\([^)]*\)/g) || []).length;
    const wrapped = (src.match(/tc\(["'][^"']*["']\)/g) || []).length;
    assert.equal(all, wrapped, `${f}: every colour literal goes through tc()`);
  }
});

test("M4514: unread-dot text stays readable", () => {
  const dot = read("src/socialStyles.ts").match(/unreadDotText: \{[^}]*\}/)[0];
  assert.match(dot, /fontSize: 14/);
  assert.doesNotMatch(dot, /fontSize: 11/);
});
