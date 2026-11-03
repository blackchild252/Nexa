"use strict";
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
const U = (id, email) => ({ id, email: email || `${id}@x.test`, name: id });
const DETAILS = "I run a real shop and can show my business registration.";

function setup() {
  process.env.NEXA_ADMIN_USER_IDS = "owner"; // the same owner the stand-in check above uses
  const db = openDb();
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY, email TEXT, passwordHash TEXT, adultConfirmedAt TEXT, name TEXT, username TEXT, avatarUrl TEXT, createdAt TEXT, accountStatus TEXT NOT NULL DEFAULT 'active');
    CREATE TABLE vendors(id TEXT PRIMARY KEY, userId TEXT UNIQUE, shopName TEXT, bio TEXT, createdAt TEXT);
    CREATE TABLE friendships(userId TEXT, friendId TEXT, createdAt TEXT);
    CREATE TABLE blocks(blockerId TEXT, blockedId TEXT);`);
  for (const id of ["owner", "rev", "sup", "ann", "bob", "shopper"]) db.prepare("INSERT INTO users(id,email,name,createdAt) VALUES(?,?,?,?)").run(id, `${id}@x.test`, id, new Date().toISOString());
  db.prepare("INSERT INTO vendors(id,userId,shopName,createdAt) VALUES(?,?,?,?)").run("v1", "shopper", "Shopper Stores", new Date().toISOString());
  const admin = adminAccess.create({ db, isConfiguredAdmin: (u) => u && u.id === "owner" });
  db.prepare("INSERT INTO admin_users(userId,role,addedBy,createdAt) VALUES(?,?,?,?)").run("rev", "reviewer", "owner", "x");
  db.prepare("INSERT INTO admin_users(userId,role,addedBy,createdAt) VALUES(?,?,?,?)").run("sup", "support", "owner", "x");
  const app = makeApp();
  const pings = [];
  const auth = { authMiddleware: (_q, _s, n) => n(), hashPasswordSync: (password) => `test-hash:${password}` };
  const notify = async (...a) => { pings.push(a); };
  verification.register(app, { db, auth, admin, notify });
  adminOps.register(app, { db, auth, admin });
  const friends = {
    userRow: (id) => db.prepare("SELECT * FROM users WHERE id=?").get(id),
    publicUser: (r) => ({ id: r.id, username: r.username, name: r.name, avatarUrl: null }),
    areFriends: (a, b) => !!db.prepare("SELECT 1 FROM friendships WHERE userId=? AND friendId=?").get(a, b),
    isBlocked: () => false,
  };
  lifestyle.register(app, { db, auth, friends, notify, admin });
  return { db, app, pings, admin };
}

test("B320 roles: owner comes from the server list, added admins get smaller roles, others are refused", async () => {
  const { app } = setup();
  const me = async (u) => app.call("GET", "/api/admin/me", { user: u });
  const o = await me(U("owner")); assert.equal(o.body.role, "owner"); assert.ok(o.body.permissions.includes("users_suspend"));
  const r = await me(U("rev")); assert.equal(r.body.role, "reviewer"); assert.ok(!r.body.permissions.includes("users_suspend"));
  assert.equal((await me(U("sup"))).body.role, "support");
  assert.equal((await me(U("ann"))).status, 403);
});

test("B320 a person can ask to be verified, with checks, and admins are alerted but not the asker", async () => {
  const { app, pings } = setup();
  const post = (u, b) => app.call("POST", "/api/verification/requests", { user: u, body: b });
  assert.equal((await post(U("ann"), { kind: "robot", details: DETAILS })).status, 400);
  assert.equal((await post(U("ann"), { kind: "user", details: "short" })).status, 400);
  assert.match((await post(U("ann"), { kind: "vendor", details: DETAILS })).body.error, /Create your shop first/);
  const ok = await post(U("ann"), { kind: "user", details: DETAILS });
  assert.equal(ok.status, 201);
  assert.equal((await post(U("ann"), { kind: "user", details: DETAILS })).status, 409, "one waiting request at a time");
  assert.deepEqual(pings.map((p) => p[0]).sort(), ["owner", "rev"], "owner and reviewer alerted; support is not");
  assert.equal((await post(U("shopper"), { kind: "vendor", details: DETAILS })).status, 201);
  const mine = await app.call("GET", "/api/verification/requests/mine", { user: U("ann") });
  assert.equal(mine.body.requests[0].status, "pending");
});

test("B320 only reviewers and owners see the queue; it shows who asked and the shop", async () => {
  const { app } = setup();
  await app.call("POST", "/api/verification/requests", { user: U("shopper"), body: { kind: "vendor", details: DETAILS } });
  assert.equal((await app.call("GET", "/api/admin/verification", { user: U("sup") })).status, 403);
  assert.equal((await app.call("GET", "/api/admin/verification", { user: U("ann") })).status, 403);
  const q = await app.call("GET", "/api/admin/verification?status=pending&kind=vendor", { user: U("rev") });
  assert.equal(q.body.requests.length, 1);
  assert.equal(q.body.requests[0].shopName, "Shopper Stores");
  assert.equal(q.body.requests[0].user.email, "shopper@x.test");
});

test("B320 a decision: reject needs a reason, approve verifies, no second decision, no self-approval, user is told, audit is written", async () => {
  const { app, pings, db } = setup();
  const a = (await app.call("POST", "/api/verification/requests", { user: U("ann"), body: { kind: "user", details: DETAILS } })).body.request;
  const dec = (u, id, b) => app.call("POST", `/api/admin/verification/${id}/decision`, { user: u, body: b });
  assert.equal((await dec(U("ann"), a.id, { decision: "approve" })).status, 403, "a normal user can't decide");
  assert.equal((await dec(U("rev"), a.id, { decision: "reject" })).status, 400, "reject needs a reason");
  assert.equal((await dec(U("rev"), a.id, { decision: "maybe" })).status, 400);
  pings.length = 0;
  assert.equal((await dec(U("rev"), a.id, { decision: "reject", reason: "Details too vague" })).status, 200);
  assert.ok(pings.some((p) => p[0] === "ann" && /not approved/.test(p[1]) && /too vague/.test(p[2])));
  assert.equal((await dec(U("rev"), a.id, { decision: "approve" })).status, 409, "already decided");
  let mine = await app.call("GET", "/api/verification/requests/mine", { user: U("ann") });
  assert.equal(mine.body.requests[0].status, "rejected"); assert.equal(mine.body.requests[0].reason, "Details too vague");
  const again = (await app.call("POST", "/api/verification/requests", { user: U("ann"), body: { kind: "user", details: DETAILS } })).body.request;
  assert.equal((await dec(U("rev"), again.id, { decision: "approve" })).status, 200);
  mine = await app.call("GET", "/api/verification/requests/mine", { user: U("ann") });
  assert.equal(mine.body.verified.user, true);
  assert.equal((await app.call("POST", "/api/verification/requests", { user: U("ann"), body: { kind: "user", details: DETAILS } })).status, 409, "already verified");
  const own = (await app.call("POST", "/api/verification/requests", { user: U("rev"), body: { kind: "user", details: DETAILS } })).body.request;
  assert.equal((await dec(U("rev"), own.id, { decision: "approve" })).status, 403, "can't approve yourself");
  const log = db.prepare("SELECT action, actorRole FROM admin_audit ORDER BY createdAt").all().map((r) => `${r.actorRole}:${r.action}`);
  assert.ok(log.includes("reviewer:verification_rejected") && log.includes("reviewer:verification_approved"));
});

test("B320 users and vendors lists: support can read, search works, verified flags show", async () => {
  const { app } = setup();
  const r = (await app.call("POST", "/api/verification/requests", { user: U("shopper"), body: { kind: "vendor", details: DETAILS } })).body.request;
  await app.call("POST", `/api/admin/verification/${r.id}/decision`, { user: U("rev"), body: { decision: "approve" } });
  assert.equal((await app.call("GET", "/api/admin/users", { user: U("ann") })).status, 403);
  const all = await app.call("GET", "/api/admin/users", { user: U("sup") });
  assert.equal(all.body.users.length, 6);
  const s = (await app.call("GET", "/api/admin/users?q=shop", { user: U("sup") })).body.users;
  assert.equal(s.length, 1); assert.equal(s[0].isVendor, true); assert.equal(s[0].verified.vendor, true);
  const v = await app.call("GET", "/api/admin/vendors", { user: U("sup") });
  assert.equal(v.body.vendors[0].shopName, "Shopper Stores"); assert.equal(v.body.vendors[0].verified, true);
});

test("B320 suspend and unsuspend: owner only, with a reason, never an admin or yourself, and it is audited", async () => {
  const { app, db } = setup();
  const sus = (u, id, b) => app.call("POST", `/api/admin/users/${id}/suspend`, { user: u, body: b });
  assert.equal((await sus(U("rev"), "ann", { reason: "spam" })).status, 403);
  assert.equal((await sus(U("owner"), "ann", {})).status, 400);
  assert.equal((await sus(U("owner"), "owner", { reason: "test" })).status, 400);
  assert.equal((await sus(U("owner"), "rev", { reason: "test" })).status, 403);
  assert.equal((await sus(U("owner"), "ann", { reason: "Repeated spam" })).status, 200);
  assert.equal(db.prepare("SELECT accountStatus FROM users WHERE id='ann'").get().accountStatus, "suspended");
  assert.equal((await sus(U("owner"), "ann", { reason: "again" })).status, 409);
  const list = (await app.call("GET", "/api/admin/users?q=ann", { user: U("sup") })).body.users[0];
  assert.equal(list.status, "suspended"); assert.equal(list.suspendedReason, "Repeated spam");
  assert.equal((await app.call("POST", "/api/admin/users/ann/unsuspend", { user: U("rev") })).status, 403);
  assert.equal((await app.call("POST", "/api/admin/users/ann/unsuspend", { user: U("owner") })).status, 200);
  assert.equal(db.prepare("SELECT accountStatus FROM users WHERE id='ann'").get().accountStatus, "active");
  const a = (await app.call("GET", "/api/admin/audit", { user: U("owner") })).body.events.map((e) => e.action);
  assert.ok(a.includes("user_suspended") && a.includes("user_unsuspended"));
  assert.equal((await app.call("GET", "/api/admin/audit", { user: U("rev") })).status, 403, "audit is owner only");
});

test("B320 admin management: owner adds a reviewer by email, can't add owners, can remove; reviewers can't manage", async () => {
  const { app } = setup();
  const add = (u, b) => app.call("POST", "/api/admin/admins", { user: u, body: b });
  assert.equal((await add(U("rev"), { email: "ann@x.test", role: "support" })).status, 403);
  assert.equal((await add(U("owner"), { email: "ann@x.test", role: "owner" })).status, 400);
  const support = await add(U("owner"), { email: "nobody@x.test", role: "support", password: "StrongPass!9" });
  assert.equal(support.status, 201);
  const reviewer = await add(U("owner"), { email: "reviewer2@x.test", role: "reviewer", password: "StrongPass!9" });
  assert.equal(reviewer.status, 201);
  const admins = (await app.call("GET", "/api/admin/admins", { user: U("owner") })).body.admins;
  assert.equal(admins.find(a => a.userId === support.body.userId).role, "support");
  assert.equal(admins.find(a => a.userId === reviewer.body.userId).role, "reviewer");
  assert.equal((await app.call("DELETE", `/api/admin/admins/${support.body.userId}`, { user: U("owner") })).status, 200);
  assert.equal((await app.call("DELETE", `/api/admin/admins/${reviewer.body.userId}`, { user: U("owner") })).status, 200);
});

test("B320 summary counts pending requests, reported posts, vendors and suspended people", async () => {
  const { app } = setup();
  await app.call("POST", "/api/verification/requests", { user: U("ann"), body: { kind: "user", details: DETAILS } });
  await app.call("POST", "/api/admin/users/bob/suspend", { user: U("owner"), body: { reason: "abuse" } });
  const s = (await app.call("GET", "/api/admin/summary", { user: U("sup") })).body;
  assert.equal(s.pendingVerifications, 1); assert.equal(s.suspended, 1); assert.equal(s.vendors, 1); assert.equal(s.users, 5); assert.equal(s.reportedLifestylePosts, 0);
});

test("B320 Lifestyle report review by an admin role: list, dismiss keeps the post, removal closes reports, both are audited", async () => {
  const { app, db } = setup();
  const link = (a, b) => { db.prepare("INSERT INTO friendships VALUES(?,?,?)").run(a, b, "x"); db.prepare("INSERT INTO friendships VALUES(?,?,?)").run(b, a, "x"); };
  link("ann", "bob");
  const p1 = (await app.call("POST", "/api/lifestyle/posts", { user: U("ann"), body: { photo: PHOTO } })).body.post;
  const p2 = (await app.call("POST", "/api/lifestyle/posts", { user: U("ann"), body: { photo: PHOTO } })).body.post;
  await app.call("POST", `/api/lifestyle/posts/${p1.id}/report`, { user: U("bob"), body: { reason: "spam" } });
  await app.call("POST", `/api/lifestyle/posts/${p2.id}/report`, { user: U("bob"), body: { reason: "nudity" } });
  assert.equal((await app.call("GET", "/api/lifestyle/reports", { user: U("sup") })).status, 403, "support can't review reports");
  assert.equal((await app.call("GET", "/api/lifestyle/reports", { user: U("rev") })).body.reports.length, 2);
  assert.equal((await app.call("GET", "/api/admin/summary", { user: U("sup") })).body.reportedLifestylePosts, 2);
  assert.equal((await app.call("POST", `/api/lifestyle/reports/${p1.id}/dismiss`, { user: U("rev") })).status, 200);
  assert.equal((await app.call("POST", `/api/lifestyle/reports/${p1.id}/dismiss`, { user: U("rev") })).status, 404, "nothing left to dismiss");
  assert.equal((await app.call("DELETE", `/api/lifestyle/reports/${p2.id}/post`, { user: U("rev") })).status, 200);
  assert.equal((await app.call("GET", "/api/lifestyle/reports", { user: U("rev") })).body.reports.length, 0);
  assert.equal((await app.call("GET", "/api/lifestyle/reports?status=dismissed", { user: U("rev") })).body.reports.length, 1);
  const a = db.prepare("SELECT action FROM admin_audit").all().map((r) => r.action);
  assert.ok(a.includes("lifestyle_reports_dismissed") && a.includes("lifestyle_post_removed"));
});

test("B320 the server mounts the new modules and refuses suspended accounts at sign-in and on every request", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const idx = read("server/index.js");
  assert.match(idx, /require\("\.\/adminAccess"\)\.create\(/);
  assert.match(idx, /require\("\.\/verification"\)\.register\(/);
  assert.match(idx, /require\("\.\/adminOps"\)\.register\(/);
  const auth = read("server/auth.js");
  assert.match(auth, /row\.accountStatus === "suspended"\) return res\.status\(403\)/);
  assert.match(auth, /account\??\.accountStatus === "suspended"\) throw/);
});
