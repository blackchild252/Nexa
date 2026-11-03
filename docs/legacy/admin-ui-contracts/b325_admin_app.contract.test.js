"use strict";
// B325: admin web app, moderation and hand-off (M4566 to M4577). Serving it from the server is M4572.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const adminApp = require("./v5_99_79_admin_app");
const repo = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(repo, f), "utf8");

function call(h, { method = "GET", url = "/admin-app/", reqPath } = {}) {
  const out = { status: 200, headers: {}, body: null, redirected: null, ended: false };
  const res = {
    status(c) { out.status = c; return this; }, set(k, v) { if (typeof k === "object") Object.assign(out.headers, k); else out.headers[k] = v; return this; },
    type(t) { out.headers["Content-Type"] = t; return this; }, send(b) { out.body = b; return this; }, end() { out.ended = true; return this; },
    redirect(c, to) { out.status = c; out.redirected = to; return this; },
  };
  const path = reqPath !== undefined ? reqPath : (url.split("?")[0].replace(/^\/admin-app/, "") || "/");
  h({ method, originalUrl: url, url: path, path }, res, () => { out.nexted = true; });
  return out;
}

test("B325 M4572 /admin-app serves the app's own files with a strict header and no caching", () => {
  const h = adminApp.handler();
  for (const [p, type] of [["/", /text\/html/], ["/index.html", /text\/html/], ["/config.js", /javascript/], ["/style.css", /text\/css/], ["/src/app.js", /javascript/], ["/src/views/reports.js", /javascript/]]) {
    const r = call(h, { url: "/admin-app" + p });
    assert.equal(r.status, 200, p); assert.match(r.headers["Content-Type"], type, p);
    assert.equal(r.headers["Cache-Control"], "no-store"); assert.equal(r.headers["X-Content-Type-Options"], "nosniff");
    assert.equal(r.headers["Content-Security-Policy"], adminApp.CSP);
    assert.ok(Buffer.isBuffer(r.body) && r.body.length > 0, p);
  }
  assert.doesNotMatch(adminApp.CSP, /unsafe-inline|unsafe-eval|\*/);
  assert.match(adminApp.CSP, /script-src 'self'/); assert.match(adminApp.CSP, /frame-ancestors 'none'/); assert.match(adminApp.CSP, /connect-src 'self'/);
});

test("B325 M4572 /admin-app without the slash goes to /admin-app/ so the page's relative links work", () => {
  const r = call(adminApp.handler(), { url: "/admin-app", reqPath: "/" });
  assert.equal(r.status, 301); assert.equal(r.redirected, "/admin-app/");
  assert.equal(call(adminApp.handler(), { url: "/admin-app?x=1", reqPath: "/" }).redirected, "/admin-app/");
});

test("B325 M4572 only the app's files are served: never the README, tests, package.json or anything outside", () => {
  const h = adminApp.handler();
  for (const p of ["/README.md", "/EXTRACT.md", "/package.json", "/test/api.test.js", "/test/fakeDom.js", "/src/", "/src", "/../package.json", "/src/../../package.json", "/%2e%2e/package.json", "/src/%2e%2e/%2e%2e/server/index.js", "/..%2fpackage.json", "/src\\app.js", "/src/app.js%00.css", "/src/app.txt", "/.env", "/src/.hidden.js"]) {
    const r = call(h, { url: "/admin-app" + p, reqPath: p });
    assert.equal(r.status, 404, p); assert.equal(r.body, "Not found", p);
  }
  assert.equal(adminApp.resolveFile("/src/app.js").startsWith(adminApp.ROOT), true);
  assert.equal(adminApp.resolveFile("/%E0%A4%A"), null, "a broken encoding is refused");
});

test("B325 M4572 it can be switched off, and only reading is allowed", () => {
  for (const v of ["false", "FALSE", "0", "off", "no"]) { assert.equal(adminApp.enabled({ ADMIN_APP_ENABLED: v }), false, v); assert.equal(call(adminApp.handler({ env: { ADMIN_APP_ENABLED: v } })).status, 404); }
  for (const v of [undefined, "", "true", "1", "on"]) assert.equal(adminApp.enabled({ ADMIN_APP_ENABLED: v }), true, String(v));
  const post = call(adminApp.handler(), { method: "POST" }); assert.equal(post.status, 405); assert.equal(post.headers.Allow, "GET, HEAD");
  const head = call(adminApp.handler(), { method: "HEAD" }); assert.equal(head.status, 200); assert.equal(head.body, null); assert.equal(head.ended, true);
});

test("B325 M4572 the app's own address is accepted by CORS only while the app is on", () => {
  assert.equal(adminApp.isOwnOrigin("https://api.nexa.test", "api.nexa.test", {}), true);
  assert.equal(adminApp.isOwnOrigin("https://API.nexa.test", "api.nexa.test", {}), true);
  assert.equal(adminApp.isOwnOrigin("https://evil.test", "api.nexa.test", {}), false);
  assert.equal(adminApp.isOwnOrigin("https://api.nexa.test.evil.test", "api.nexa.test", {}), false);
  assert.equal(adminApp.isOwnOrigin("not a url", "api.nexa.test", {}), false);
  assert.equal(adminApp.isOwnOrigin("", "api.nexa.test", {}), false);
  assert.equal(adminApp.isOwnOrigin("https://api.nexa.test", "api.nexa.test", { ADMIN_APP_ENABLED: "false" }), false);
});

test("B325 M4572 the server mounts it before CORS, keeps the CORS list for other addresses, and the image ships the folder", () => {
  const idx = read("server/index.js");
  const mount = idx.indexOf("app.use(adminApp.MOUNT, adminApp.handler())"); const cors = idx.indexOf("app.use(cors(");
  assert.ok(mount > 0 && cors > mount, "mounted before CORS");
  assert.ok(idx.indexOf("Content-Security-Policy", 0) < mount, "after the global header middleware, so its own header replaces the default");
  assert.match(idx, /allowedOrigins\.includes\(origin\)/); assert.match(idx, /CORS_ORIGIN_DENIED/); assert.match(idx, /isOwnOrigin\(origin, req\.headers\.host\)/);
  assert.match(read("Dockerfile"), /COPY admin-web \.\/admin-web/);
  assert.match(read("server/.env.example"), /ADMIN_APP_ENABLED/);
  const ignore = read(".dockerignore"); assert.doesNotMatch(ignore, /admin-web/);
});

test("B325 M4566-M4571 the screens exist, are on the page list with the right permission, and only use guide routes", () => {
  const app = read("admin-web/src/app.js");
  for (const [key, perm] of [["reported-posts", "reports"], ["reported-comments", "reports"], ["audit", "audit"], ["admins", "admins"]]) assert.match(app, new RegExp(`key: "${key}", label: "[^"]+", permission: "${perm}"`), key);
  const guide = read("docs/ADMIN_ROUTES_GUIDE.md");
  for (const r of ["/api/lifestyle/reports", "/api/lifestyle/comment-reports", "/api/admin/audit", "/api/admin/admins"]) assert.ok(guide.includes(r), r);
});

test("B325 M4573 the extraction guide names every step, and the self-contained and guide-sync tests run with the app's own suite", () => {
  const g = read("admin-web/EXTRACT.md");
  for (const w of ["apiBase", "CORS_ORIGINS", "Content-Security-Policy", "ADMIN_ROUTES_GUIDE.md", "ADMIN_APP_ENABLED", "node --test"]) assert.ok(g.includes(w), w);
  for (const f of ["selfcontained.test.js", "guide-sync.test.js", "phone.test.js", "moderation.test.js"]) assert.ok(fs.existsSync(path.join(repo, "admin-web/test", f)), f);
});

test("B325 the whole admin-web suite passes from here too", () => {
  const dir = path.join(repo, "admin-web");
  const files = fs.readdirSync(path.join(dir, "test")).filter((f) => f.endsWith(".test.js")).map((f) => path.join("test", f));
  const r = spawnSync(process.execPath, ["--test", ...files], { cwd: dir, encoding: "utf8", timeout: 120000, env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  assert.equal(r.status, 0, (r.stdout || "") + (r.stderr || "")); assert.match(r.stdout, /# fail 0/);
});
