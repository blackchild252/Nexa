"use strict";
// B324: the admin web app (admin-web/) core. Its own tests live in admin-web/test and run here too, so one command covers everything.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const root = path.join(__dirname, "..", "admin-web");

test("B324 the admin web app's own tests pass", () => {
  const files = fs.readdirSync(path.join(root, "test")).filter((f) => f.endsWith(".test.js")).map((f) => path.join("test", f));
  assert.ok(files.length >= 2);
  const r = spawnSync(process.execPath, ["--test", ...files], { cwd: root, encoding: "utf8", timeout: 120000, env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, (r.stdout || "") + (r.stderr || ""));
  assert.match(r.stdout, /# fail 0/);
});

test("B324 M4557 admin-web is a self-contained folder with one setting and no inline scripts or styles", () => {
  for (const f of ["index.html", "config.js", "style.css", "README.md", "package.json", "src/app.js", "src/api.js"]) assert.ok(fs.existsSync(path.join(root, f)), f);
  const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
  assert.doesNotMatch(html, /<script(?![^>]*\bsrc=)[^>]*>/i, "no inline script");
  assert.doesNotMatch(html, /\sstyle=|<style/i, "no inline style");
  assert.match(fs.readFileSync(path.join(root, "config.js"), "utf8"), /apiBase: ""/);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).private, true);
});

test("B324 M4558 admin-web never builds HTML from text and sends the sign-in the way the guide says", () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));
  for (const f of walk(path.join(root, "src"))) {
    const s = fs.readFileSync(f, "utf8");
    assert.doesNotMatch(s, /innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\(/, f);
    assert.doesNotMatch(s, /require\(/, f);
    for (const m of s.matchAll(/(?:from\s+|import\s*\()\s*["']([^"']+)["']/g)) {
      assert.ok(m[1].startsWith("."), `${f}: only relative imports (${m[1]})`);
      const target = path.resolve(path.dirname(f), m[1]);
      assert.ok(target === root || target.startsWith(root + path.sep), `${f} must import only inside admin-web (${m[1]})`);
    }
  }
  const api = fs.readFileSync(path.join(root, "src/api.js"), "utf8");
  assert.match(api, /\/api\/auth\/login/); assert.match(api, /Bearer \$\{token\}/); assert.match(api, /\/api\/admin\/me/);
});
