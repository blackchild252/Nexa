"use strict";
// B323: open the exact Lifestyle post from an alert (M4553 to M4556).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const adminAccess = require("./adminAccess");
const verification = require("./verification");
const adminOps = require("./adminOps");
const lifestyle = require("./lifestyle");
const notifications = require("./notifications");
const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

function openDb() {
  try { const D = require("better-sqlite3"); return new D(":memory:"); } catch (_) {
    const { DatabaseSync } = require("node:sqlite");
    const raw = new DatabaseSync(":memory:");
    return { exec: (s) => raw.exec(s), prepare: (s) => raw.prepare(s), transaction: (fn) => (...a) => { raw.exec("BEGIN"); try { const r = fn(...a); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; } } };
  }
}
function makeApp() {
  const routes = [];
  const add = (method) => (p, ...handlers) => routes.push({ method, p, handlers });
  const app = { get: add("GET"), post: add("POST"), put: add("PUT"), delete: add("DELETE") };
  app.call = async (method, url, { user, body } = {}) => {
    const [pathname, qs] = url.split("?");
    const query = Object.fromEntries(new URLSearchParams(qs || ""));
    for (const r of routes) {
      if (r.method !== method) continue;
      const names = []; const re = new RegExp("^" + r.p.replace(/:([A-Za-z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "$");
      const m = re.exec(pathname); if (!m) continue;
      const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      const req = { user, body: body || {}, query, params };
      const out = { status: 200, body: null };
      const res = { status(c) { out.status = c; return this; }, json(b) { out.body = b; return this; } };
      let i = 0; const next = () => { const h = r.handlers[i++]; if (h) return h(req, res, next); };
      await next(); return out;
    }
    throw new Error("no route " + method + " " + url);
  };
  return app;
}
const PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==";
const U = (id) => ({ id, email: `${id}@x.test`, name: id });

function setup({ blocked = [] } = {}) {
  process.env.NEXA_ADMIN_USER_IDS = "owner";
  const db = openDb();
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY, email TEXT, name TEXT, username TEXT, avatarUrl TEXT, createdAt TEXT, accountStatus TEXT NOT NULL DEFAULT 'active');
    CREATE TABLE vendors(id TEXT PRIMARY KEY, userId TEXT UNIQUE, shopName TEXT, bio TEXT, createdAt TEXT);
    CREATE TABLE friendships(userId TEXT, friendId TEXT, createdAt TEXT);
    CREATE TABLE blocks(blockerId TEXT, blockedId TEXT);`);
  for (const id of ["owner", "rev", "sup", "ann", "bob", "cat"]) db.prepare("INSERT INTO users(id,email,name,createdAt) VALUES(?,?,?,?)").run(id, `${id}@x.test`, id, new Date().toISOString());
  for (const [a, b] of [["ann", "bob"], ["bob", "ann"]]) db.prepare("INSERT INTO friendships(userId,friendId,createdAt) VALUES(?,?,?)").run(a, b, "x");
  const admin = adminAccess.create({ db, isConfiguredAdmin: (u) => u && u.id === "owner" });
  db.prepare("INSERT INTO admin_users(userId,role,addedBy,createdAt) VALUES(?,?,?,?)").run("rev", "reviewer", "owner", "x");
  db.prepare("INSERT INTO admin_users(userId,role,addedBy,createdAt) VALUES(?,?,?,?)").run("sup", "support", "owner", "x");
  const app = makeApp();
  const auth = { authMiddleware: (_q, _s, n) => n() };
  verification.register(app, { db, auth, admin, notify: async () => {} });
  adminOps.register(app, { db, auth, admin });
  const friends = {
    userRow: (id) => db.prepare("SELECT * FROM users WHERE id=?").get(id),
    publicUser: (r) => ({ id: r.id, username: r.username, name: r.name, avatarUrl: null }),
    areFriends: (a, b) => !!db.prepare("SELECT 1 FROM friendships WHERE userId=? AND friendId=?").get(a, b),
    isBlocked: (a, b) => blocked.some(([x, y]) => (x === a && y === b) || (x === b && y === a)),
  };
  const alerts = [];
  lifestyle.register(app, { db, auth, friends, notify: async (uid, title, body, data) => { alerts.push({ uid, title, body, data }); }, admin });
  return { db, app, admin, alerts };
}
async function postPhoto(app, who, caption) {
  const r = await app.call("POST", "/api/lifestyle/posts", { user: U(who), body: { photo: PHOTO, caption } });
  assert.equal(r.status, 201); return r.body.post;
}
async function comment(app, who, postId, body) {
  const r = await app.call("POST", `/api/lifestyle/posts/${postId}/comments`, { user: U(who), body: { body } });
  assert.equal(r.status, 201); return r.body.comment;
}


const tick = () => new Promise((r) => setImmediate(r));

test("B323 M4553 every Lifestyle alert carries the post it is about", async () => {
  const { app, alerts } = setup();
  const p = await postPhoto(app, "ann", "hi");
  await tick();
  assert.equal(alerts.length, 1, "bob (a friend) is told about the new photo");
  assert.equal(alerts[0].uid, "bob"); assert.equal(alerts[0].data.postId, p.id); assert.equal(alerts[0].data.screen, "leisure_lifestyle");
  await app.call("POST", `/api/lifestyle/posts/${p.id}/like`, { user: U("bob") });
  await comment(app, "bob", p.id, "nice");
  await tick();
  const toAnn = alerts.filter((a) => a.uid === "ann");
  assert.equal(toAnn.length, 2, "a like and a comment");
  for (const a of toAnn) assert.equal(a.data.postId, p.id);
});

test("B323 M4553 the stored alert keeps the post id and offers it as the id the app reads", () => {
  const ev = notifications.createEvent("u1", "Lifestyle", "x", { type: "leisure", screen: "leisure_lifestyle", action: "leisure_lifestyle", postId: "p-123" });
  assert.equal(ev.data.postId, "p-123"); assert.equal(ev.data.id, "p-123"); assert.equal(ev.data.action, "leisure_lifestyle");
  const old = notifications.createEvent("u1", "Lifestyle", "x", { type: "leisure", screen: "leisure_lifestyle", action: "leisure_lifestyle" });
  assert.equal(old.data.action, "leisure_lifestyle"); assert.equal(old.data.id, undefined, "an older alert without a post still works");
});

test("B323 M4554 one post can be fetched by who may see it, and only them", async () => {
  const { app } = setup({ blocked: [] });
  const p = await postPhoto(app, "ann", "hi");
  const get = (who, id) => app.call("GET", `/api/lifestyle/posts/${id}`, { user: U(who) });
  const mine = await get("ann", p.id); assert.equal(mine.status, 200); assert.equal(mine.body.post.id, p.id); assert.equal(mine.body.post.mine, true);
  const friend = await get("bob", p.id); assert.equal(friend.status, 200); assert.equal(friend.body.post.mine, false); assert.equal(friend.body.post.author.name, "ann");
  assert.equal((await get("cat", p.id)).status, 404, "a stranger");
  const gone = await get("ann", "nope"); assert.equal(gone.status, 404); assert.equal(gone.body.error, "That post is no longer available.");
});

test("B323 M4555 a blocked, reported or deleted post is reported as no longer available", async () => {
  const blocked = setup({ blocked: [["bob", "ann"]] });
  const p = await postPhoto(blocked.app, "ann", "hi");
  assert.equal((await blocked.app.call("GET", `/api/lifestyle/posts/${p.id}`, { user: U("bob") })).status, 404, "blocked");
  const { app } = setup();
  const q = await postPhoto(app, "ann", "hi");
  await app.call("POST", `/api/lifestyle/posts/${q.id}/report`, { user: U("bob"), body: { reason: "spam" } });
  assert.equal((await app.call("GET", `/api/lifestyle/posts/${q.id}`, { user: U("bob") })).status, 404, "reported by me");
  assert.equal((await app.call("GET", `/api/lifestyle/posts/${q.id}`, { user: U("ann") })).status, 200, "the owner still has it");
  await app.call("DELETE", `/api/lifestyle/posts/${q.id}`, { user: U("ann") });
  assert.equal((await app.call("GET", `/api/lifestyle/posts/${q.id}`, { user: U("ann") })).status, 404, "deleted");
});

test("B323 M4554 the app opens the exact post from a push tap and from the in-app list", () => {
  const tap = read("src/pushTapRouting.ts");
  assert.match(tap, /data\.screen === 'leisure_lifestyle'/);
  assert.match(tap, /safeRouteIdentifier\(data\.postId\)/);
  assert.match(tap, /withParams\('\/lifestyle', \{ postId \}\)/);
  assert.match(tap, /case 'leisure_lifestyle': return '\/lifestyle';/, "an alert with no post still opens Lifestyle");
  const nav = read("src/nexaNavigation.ts");
  assert.match(nav, /pathname: '\/lifestyle', params: \{ postId: String\(data\.postId \|\| id\) \}/);
  assert.match(nav, /case 'leisure_lifestyle': return validateNavigationTarget\(\{ pathname: '\/lifestyle' \}\)/);
  assert.match(read("src/app/lifestyle.tsx"), /Redirect[\s\S]*postId/);
  assert.match(read("src/app/(tabs)/zeeza.tsx"), /<LifestyleScreen postId=\{requestedPostId\} \/>/);
  assert.match(read("src/lifestyle.ts"), /\/api\/lifestyle\/posts\/\$\{encodeURIComponent\(id\)\}`, "GET"/);
});

test("B323 M4555 the screen shows the alert's post first, once, with a friendly message when it is gone", () => {
  const s = read("src/LifestyleScreen.tsx");
  assert.match(s, /export function LifestyleScreen\(\{ postId \}/);
  assert.match(s, /apiLifestyleGetPost\(postId\)/);
  assert.match(s, /isSafePostId\(postId\)/);
  assert.match(s, /posts\.filter\(\(p\) => p\.id !== focus\?\.id\)/, "never shown twice");
  assert.match(s, /That post is no longer available\./);
  const api = read("src/lifestyle.ts");
  const fn = new Function("return " + api.slice(api.indexOf("(v: unknown)") ? api.indexOf("export const isSafePostId") : 0).replace("export const isSafePostId = (v: unknown): v is string =>", "(v) =>").split(";")[0])();
  assert.equal(fn("abc-123"), true); assert.equal(fn("../x"), false); assert.equal(fn(""), false); assert.equal(fn(undefined), false); assert.equal(fn("a b"), false);
});
