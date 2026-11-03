"use strict";
// B321: Lifestyle server half. Report a comment (M4544), feed load more (M4546), verified mark on authors (M4547),
// and the written guide to the admin routes (M4551).
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const adminAccess = require("./adminAccess");
const verification = require("./verification");
const adminOps = require("./adminOps");
const lifestyle = require("./lifestyle");

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
  lifestyle.register(app, { db, auth, friends, notify: async () => {}, admin });
  return { db, app, admin };
}
async function postPhoto(app, who, caption) {
  const r = await app.call("POST", "/api/lifestyle/posts", { user: U(who), body: { photo: PHOTO, caption } });
  assert.equal(r.status, 201); return r.body.post;
}
async function comment(app, who, postId, body) {
  const r = await app.call("POST", `/api/lifestyle/posts/${postId}/comments`, { user: U(who), body: { body } });
  assert.equal(r.status, 201); return r.body.comment;
}

test("B321 M4544 report a comment: checks, one report per person, and the reporter no longer sees it", async () => {
  const { app } = setup();
  const p = await postPhoto(app, "ann", "hello");
  const c = await comment(app, "bob", p.id, "rude words");
  const rep = (who, id, reason) => app.call("POST", `/api/lifestyle/comments/${id}/report`, { user: U(who), body: { reason } });
  assert.equal((await rep("bob", c.id, "spam")).status, 400, "own comment");
  assert.equal((await rep("ann", c.id, "banana")).status, 400, "bad reason");
  assert.equal((await rep("cat", c.id, "spam")).status, 404, "a stranger cannot see the post, so cannot report");
  assert.equal((await rep("ann", "nope", "spam")).status, 404, "unknown comment");
  assert.equal((await rep("ann", c.id, "harassment")).body.ok, true);
  assert.equal((await rep("ann", c.id, "spam")).body.ok, true, "a second report from the same person is ignored, not an error");
  const annSees = await app.call("GET", `/api/lifestyle/posts/${p.id}/comments`, { user: U("ann") });
  assert.equal(annSees.body.comments.length, 0, "the reporter no longer sees it");
  const bobSees = await app.call("GET", `/api/lifestyle/posts/${p.id}/comments`, { user: U("bob") });
  assert.equal(bobSees.body.comments.length, 1, "the writer still sees their own comment");
  const feed = await app.call("GET", "/api/lifestyle/feed", { user: U("ann") });
  assert.equal(feed.body.posts[0].commentCount, 0, "the count agrees with what the reporter sees");
});

test("B321 M4544 admin review of reported comments: who may see, dismiss, remove, and that it is logged and counted", async () => {
  const { app, db } = setup();
  const p = await postPhoto(app, "ann", "hello");
  const c1 = await comment(app, "bob", p.id, "rude words");
  const c2 = await comment(app, "bob", p.id, "more rude words");
  await app.call("POST", `/api/lifestyle/comments/${c1.id}/report`, { user: U("ann"), body: { reason: "harassment" } });
  await app.call("POST", `/api/lifestyle/comments/${c2.id}/report`, { user: U("ann"), body: { reason: "spam" } });
  assert.equal((await app.call("GET", "/api/lifestyle/comment-reports", { user: U("sup") })).status, 403, "support may not review");
  assert.equal((await app.call("GET", "/api/lifestyle/comment-reports", { user: U("ann") })).status, 403);
  const sum = await app.call("GET", "/api/admin/summary", { user: U("rev") });
  assert.equal(sum.body.reportedLifestyleComments, 2);
  const list = await app.call("GET", "/api/lifestyle/comment-reports", { user: U("rev") });
  assert.equal(list.body.reports.length, 2);
  const row = list.body.reports.find((r) => r.commentId === c1.id);
  assert.equal(row.body, "rude words"); assert.deepEqual(row.reasons, ["harassment"]); assert.equal(row.author.id, "bob"); assert.equal(row.removed, false);
  assert.equal((await app.call("POST", `/api/lifestyle/comment-reports/${c1.id}/dismiss`, { user: U("rev") })).body.ok, true);
  assert.equal((await app.call("POST", `/api/lifestyle/comment-reports/${c1.id}/dismiss`, { user: U("rev") })).status, 404, "nothing left to dismiss");
  assert.equal((await app.call("DELETE", `/api/lifestyle/comment-reports/${c2.id}/comment`, { user: U("sup") })).status, 403);
  assert.equal((await app.call("DELETE", `/api/lifestyle/comment-reports/${c2.id}/comment`, { user: U("rev") })).body.ok, true);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lifestyle_comments WHERE id = ?").get(c2.id).n, 0, "comment is gone");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lifestyle_comments WHERE id = ?").get(c1.id).n, 1, "dismissed comment stays");
  const openLeft = await app.call("GET", "/api/lifestyle/comment-reports", { user: U("owner") });
  assert.equal(openLeft.body.reports.length, 0);
  const done = await app.call("GET", "/api/lifestyle/comment-reports?status=actioned", { user: U("owner") });
  assert.equal(done.body.reports[0].removed, true);
  const log = db.prepare("SELECT action, targetType, actorId FROM admin_audit ORDER BY createdAt").all().map((r) => `${r.action}:${r.targetType}:${r.actorId}`);
  assert.deepEqual(log, ["lifestyle_comment_reports_dismissed:lifestyle_comment:rev", "lifestyle_comment_removed:lifestyle_comment:rev"]);
});

test("B321 M4544 removing a whole post closes the open comment reports on it", async () => {
  const { app, db } = setup();
  const p = await postPhoto(app, "ann", "hello");
  const c = await comment(app, "bob", p.id, "rude words");
  await app.call("POST", `/api/lifestyle/comments/${c.id}/report`, { user: U("ann"), body: { reason: "spam" } });
  await app.call("POST", `/api/lifestyle/posts/${p.id}/report`, { user: U("bob"), body: { reason: "spam" } }).catch(() => {});
  assert.equal((await app.call("DELETE", `/api/lifestyle/reports/${p.id}/post`, { user: U("owner") })).body.ok, true);
  assert.equal(db.prepare("SELECT status FROM lifestyle_comment_reports WHERE commentId = ?").get(c.id).status, "actioned");
});

test("B321 M4546 load more: pages walk the whole feed once, in order, and stop with nextBefore null", async () => {
  const { app } = setup();
  const ids = [];
  for (let i = 0; i < 5; i++) ids.push((await postPhoto(app, i % 2 ? "bob" : "ann", `post ${i}`)).id);
  const page = (before, limit) => app.call("GET", `/api/lifestyle/feed?limit=${limit}${before ? `&before=${encodeURIComponent(before)}` : ""}`, { user: U("ann") });
  const seen = [];
  let cursor = null; let pages = 0;
  do {
    const r = await page(cursor, 2); pages += 1;
    assert.ok(r.body.posts.length <= 2);
    seen.push(...r.body.posts.map((x) => x.id));
    cursor = r.body.nextBefore;
    assert.ok(pages < 10, "no endless loop");
  } while (cursor);
  assert.equal(pages, 3);
  assert.equal(new Set(seen).size, 5, "no duplicates");
  assert.deepEqual([...seen].sort(), [...ids].sort(), "every post shows up once");
  const all = await app.call("GET", "/api/lifestyle/feed", { user: U("ann") });
  assert.equal(all.body.posts.length, 5); assert.equal(all.body.nextBefore, null, "a short feed has no next page");
  assert.deepEqual(all.body.posts.map((x) => x.id), seen, "paging keeps the same order as one big page");
  const huge = await app.call("GET", "/api/lifestyle/feed?limit=9999", { user: U("ann") });
  assert.equal(huge.status, 200, "an oversized limit is capped, not an error");
  const junk = await app.call("GET", "/api/lifestyle/feed?before=garbage", { user: U("ann") });
  assert.equal(junk.body.posts.length, 5, "a bad cursor is treated as no cursor");
});

test("B321 M4546 load more still hides blocked authors and never ends on a page of only hidden posts", async () => {
  const { app } = setup({ blocked: [["ann", "bob"]] });
  for (let i = 0; i < 4; i++) await postPhoto(app, "bob", `b${i}`);
  const mine = await postPhoto(app, "ann", "mine");
  const r = await app.call("GET", "/api/lifestyle/feed?limit=2", { user: U("ann") });
  assert.deepEqual(r.body.posts.map((x) => x.id), [mine.id]);
  assert.equal(r.body.nextBefore, null);
});

test("B321 M4546 a long run of hidden posts is skipped across rounds and the page still fills", async () => {
  const { app } = setup({ blocked: [["ann", "bob"]] });
  const mine = await postPhoto(app, "ann", "oldest, mine");
  for (let i = 0; i < 7; i++) await postPhoto(app, "bob", `b${i}`);
  const r = await app.call("GET", "/api/lifestyle/feed?limit=1", { user: U("ann") });
  assert.deepEqual(r.body.posts.map((x) => x.id), [mine.id], "my post is found even though 7 newer ones are hidden");
  if (r.body.nextBefore) {
    const end = await app.call("GET", `/api/lifestyle/feed?limit=1&before=${encodeURIComponent(r.body.nextBefore)}`, { user: U("ann") });
    assert.equal(end.body.posts.length, 0); assert.equal(end.body.nextBefore, null, "the app reaches a clean end");
  }
});

test("B321 M4547 verified mark: only an approved account verification counts, on posts and comments", async () => {
  const { app, db } = setup();
  const p = await postPhoto(app, "ann", "hello");
  await comment(app, "bob", p.id, "nice");
  const read = async () => (await app.call("GET", "/api/lifestyle/feed", { user: U("bob") })).body.posts[0].author.verified;
  assert.equal(await read(), false);
  db.prepare("INSERT INTO user_verifications(userId,kind,verifiedAt) VALUES(?,?,?)").run("ann", "vendor", "x");
  assert.equal(await read(), false, "a shop verification does not mark the person");
  db.prepare("INSERT INTO user_verifications(userId,kind,verifiedAt) VALUES(?,?,?)").run("ann", "user", "x");
  assert.equal(await read(), true);
  db.prepare("INSERT INTO user_verifications(userId,kind,verifiedAt) VALUES(?,?,?)").run("bob", "user", "x");
  const cs = await app.call("GET", `/api/lifestyle/posts/${p.id}/comments`, { user: U("ann") });
  assert.equal(cs.body.comments[0].author.verified, true);
});

test("B321 M4551 the admin routes guide lists every admin route in the code, the roles, and keeps the Android door open", () => {
  const root = path.join(__dirname, "..");
  const guide = fs.readFileSync(path.join(root, "docs", "ADMIN_ROUTES_GUIDE.md"), "utf8");
  const routesIn = (file) => [...fs.readFileSync(path.join(root, "server", file), "utf8").matchAll(/app\.(get|post|delete|put)\("([^"]+)"/g)].map((m) => `${m[1].toUpperCase()} ${m[2]}`);
  const needed = [
    ...routesIn("adminOps.js"),
    ...routesIn("verification.js").filter((r) => r.includes("/api/admin/")),
    ...routesIn("lifestyle.js").filter((r) => /\/reports|\/comment-reports/.test(r) && !r.includes("/posts/:id/report")),
  ];
  assert.ok(needed.length >= 17, "routes were read: " + needed.length);
  for (const r of needed) assert.ok(guide.includes(r), `guide is missing ${r}`);
  for (const role of ["owner", "reviewer", "support"]) assert.match(guide, new RegExp(role));
  for (const perm of Object.values(adminAccess.PERMISSIONS).flatMap((s) => [...s])) assert.ok(guide.includes(perm), `guide is missing permission ${perm}`);
  assert.match(guide, /Android/);
  assert.match(guide, /Bearer/);
  assert.match(guide, /no database of its own/);
});
