"use strict";
// B328: the author is told when an admin removes their post or comment (M4593),
// report lists page past 100 (M4595), and the action log shows the admin's name (M4596).
const test = require("node:test");
const assert = require("node:assert/strict");
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
  const pings = [];
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
  lifestyle.register(app, { db, auth, friends, notify: async (...a) => { pings.push(a); }, admin });
  return { db, app, admin, pings };
}
async function postPhoto(app, who, caption) {
  const r = await app.call("POST", "/api/lifestyle/posts", { user: U(who), body: { photo: PHOTO, caption } });
  assert.equal(r.status, 201); return r.body.post;
}
async function comment(app, who, postId, body) {
  const r = await app.call("POST", `/api/lifestyle/posts/${postId}/comments`, { user: U(who), body: { body } });
  assert.equal(r.status, 201); return r.body.comment;
}


test("B328 M4593 removing a reported post or comment tells the author, and only the author", async () => {
  const { app, pings } = setup();
  const p = await postPhoto(app, "ann", "hello");
  const c = await comment(app, "bob", p.id, "rude words");
  await app.call("POST", `/api/lifestyle/comments/${c.id}/report`, { user: U("ann"), body: { reason: "harassment" } });
  await app.call("POST", `/api/lifestyle/posts/${p.id}/report`, { user: U("bob"), body: { reason: "spam" } });
  const before = pings.length;
  assert.equal((await app.call("DELETE", `/api/lifestyle/comment-reports/${c.id}/comment`, { user: U("rev") })).body.ok, true);
  const afterComment = pings.slice(before);
  assert.equal(afterComment.length, 2);
  const commentNotice = afterComment.find((x) => /comment/i.test(x[1] || ""));
  const commentFeedback = afterComment.find((x) => /moderation feedback/i.test(x[1] || ""));
  assert.ok(commentNotice); assert.equal(commentNotice[0], "bob");
  assert.equal(commentNotice[3].screen, "leisure_lifestyle"); assert.equal(commentNotice[3].postId, undefined, "no post id: it opens Lifestyle");
  assert.ok(commentFeedback, "confirmed violation feedback is also delivered");
  const postBefore = pings.length;
  assert.equal((await app.call("DELETE", `/api/lifestyle/reports/${p.id}/post`, { user: U("rev") })).body.ok, true);
  const afterPost = pings.slice(postBefore);
  assert.equal(afterPost.length, 2);
  const postNotice = afterPost.find((x) => /post/i.test(x[1] || ""));
  const postFeedback = afterPost.find((x) => /moderation feedback/i.test(x[1] || ""));
  assert.ok(postNotice); assert.equal(postNotice[0], "ann");
  assert.equal(postNotice[3].postId, undefined);
  assert.ok(postFeedback, "confirmed violation feedback is also delivered");
});

test("B328 M4593 dismissing reports sends no notice, and a refused removal sends none", async () => {
  const { app, pings } = setup();
  const p = await postPhoto(app, "ann", "hello");
  await app.call("POST", `/api/lifestyle/posts/${p.id}/report`, { user: U("bob"), body: { reason: "spam" } });
  const before = pings.length;
  await app.call("POST", `/api/lifestyle/reports/${p.id}/dismiss`, { user: U("rev") });
  assert.equal((await app.call("DELETE", `/api/lifestyle/reports/${p.id}/post`, { user: U("sup") })).status, 403);
  assert.equal(pings.length, before);
});

test("B328 M4595 report lists page: default 100, limit and offset, hasMore, stable order", async () => {
  const { app, db } = setup();
  const p = await postPhoto(app, "ann", "hello");
  const ids = [];
  for (let i = 0; i < 130; i++) { const c = { id: `cm${i}` }; db.prepare("INSERT INTO lifestyle_comments(id,postId,userId,body,createdAt) VALUES(?,?,?,?,?)").run(c.id, p.id, "bob", `c${i}`, "2026-01-01T00:00:00Z"); ids.push(c.id); db.prepare("INSERT INTO lifestyle_comment_reports(id,commentId,postId,reporterId,reason,createdAt) VALUES(?,?,?,?,?,?)").run(`rr${i}`, c.id, p.id, "ann", "spam", `2026-01-01T00:00:${String(i % 60).padStart(2, "0")}Z`); }
  const first = (await app.call("GET", "/api/lifestyle/comment-reports", { user: U("rev") })).body;
  assert.equal(first.reports.length, 100); assert.equal(first.hasMore, true); assert.equal(first.limit, 100);
  const second = (await app.call("GET", "/api/lifestyle/comment-reports?offset=100", { user: U("rev") })).body;
  assert.equal(second.reports.length, 30); assert.equal(second.hasMore, false);
  const all = [...first.reports, ...second.reports].map((r) => r.commentId);
  assert.equal(new Set(all).size, 130, "no comment appears twice or is skipped");
  const small = (await app.call("GET", "/api/lifestyle/comment-reports?limit=10&offset=5", { user: U("rev") })).body;
  assert.equal(small.reports.length, 10); assert.equal(small.offset, 5);
  const clamped = (await app.call("GET", "/api/lifestyle/comment-reports?limit=9999&offset=-4", { user: U("rev") })).body;
  assert.equal(clamped.limit, 100); assert.equal(clamped.offset, 0);
  const posts = (await app.call("GET", "/api/lifestyle/reports", { user: U("rev") })).body;
  assert.equal(posts.hasMore, false); assert.ok(Array.isArray(posts.reports));
});

test("B328 M4596 the action log shows the admin's name next to the id, and still works if the person is gone", async () => {
  const { app, db } = setup();
  const p = await postPhoto(app, "ann", "hello");
  await app.call("POST", `/api/lifestyle/posts/${p.id}/report`, { user: U("bob"), body: { reason: "spam" } });
  await app.call("POST", `/api/lifestyle/reports/${p.id}/dismiss`, { user: U("rev") });
  let ev = (await app.call("GET", "/api/admin/audit", { user: U("owner") })).body.events;
  assert.equal(ev[0].actorId, "rev"); assert.equal(ev[0].actorName, "rev");
  db.prepare("DELETE FROM users WHERE id = 'rev'").run();
  ev = (await app.call("GET", "/api/admin/audit", { user: U("owner") })).body.events;
  assert.equal(ev[0].actorId, "rev"); assert.equal(ev[0].actorName, null);
});
