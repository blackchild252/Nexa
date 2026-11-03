"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const lifestyle = require("./lifestyle");

function openDb() {
  try { const D = require("better-sqlite3"); return new D(":memory:"); } catch (_) {
    const { DatabaseSync } = require("node:sqlite"); return new DatabaseSync(":memory:");
  }
}
function makeApp() {
  const routes = [];
  const add = (method) => (p, ...handlers) => routes.push({ method, p, handlers });
  const app = { get: add("GET"), post: add("POST"), put: add("PUT"), delete: add("DELETE") };
  app.call = async (method, url, { user, body } = {}) => {
    for (const r of routes) {
      if (r.method !== method) continue;
      const names = []; const re = new RegExp("^" + r.p.replace(/:([A-Za-z]+)/g, (_, n) => { names.push(n); return "([^/]+)"; }) + "$");
      const m = re.exec(url); if (!m) continue;
      const params = {}; names.forEach((n, i) => { params[n] = decodeURIComponent(m[i + 1]); });
      const req = { user, body: body || {}, query: {}, params };
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
function setup() {
  const db = openDb();
  db.exec(`CREATE TABLE users(id TEXT PRIMARY KEY, name TEXT, username TEXT, avatarUrl TEXT, profileVisibility TEXT);
    CREATE TABLE friendships(userId TEXT, friendId TEXT, createdAt TEXT);
    CREATE TABLE blocks(blockerId TEXT, blockedId TEXT);`);
  for (const [id, name] of [["me", "Me"], ["amaka", "Amaka Obi"], ["temi", "Temi Bello"], ["stranger", "Stranger"]]) {
    db.prepare("INSERT INTO users(id,name,username) VALUES(?,?,?)").run(id, name, id);
  }
  const link = (a, b) => { db.prepare("INSERT INTO friendships VALUES(?,?,?)").run(a, b, "x"); db.prepare("INSERT INTO friendships VALUES(?,?,?)").run(b, a, "x"); };
  link("me", "amaka"); link("me", "temi");
  const friends = {
    userRow: (id) => db.prepare("SELECT * FROM users WHERE id=?").get(id),
    publicUser: (r) => ({ id: r.id, username: r.username, name: r.name, avatarUrl: null }),
    areFriends: (a, b) => !!db.prepare("SELECT 1 FROM friendships WHERE userId=? AND friendId=?").get(a, b),
    isBlocked: (a, b) => !!db.prepare("SELECT 1 FROM blocks WHERE (blockerId=? AND blockedId=?) OR (blockerId=? AND blockedId=?)").get(a, b, b, a),
  };
  const app = makeApp();
  const pings = [];
  lifestyle.register(app, { db, auth: { authMiddleware: (_q, _s, n) => n() }, friends, notify: async (...a) => { pings.push(a); }, isAdmin: (u) => u && u.id === "admin" });
  return { db, app, pings };
}
const U = (id) => ({ id });

test("a photo post is saved and shows with the author's name", async () => {
  const { app } = setup();
  const r = await app.call("POST", "/api/lifestyle/posts", { user: U("amaka"), body: { photo: PHOTO, caption: " Sunset " } });
  assert.equal(r.status, 201);
  assert.equal(r.body.post.caption, "Sunset");
  assert.equal(r.body.post.author.name, "Amaka Obi");
});

test("the feed shows my posts and my friends' posts, never a stranger's", async () => {
  const { app } = setup();
  await app.call("POST", "/api/lifestyle/posts", { user: U("amaka"), body: { photo: PHOTO } });
  await app.call("POST", "/api/lifestyle/posts", { user: U("stranger"), body: { photo: PHOTO } });
  await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: PHOTO } });
  const f = await app.call("GET", "/api/lifestyle/feed", { user: U("me") });
  const names = f.body.posts.map((p) => p.author.name).sort();
  assert.deepEqual(names, ["Amaka Obi", "Me"]);
  assert.equal(f.body.posts.find((p) => p.author.id === "me").mine, true);
});

test("a blocked friend's posts do not show", async () => {
  const { app, db } = setup();
  await app.call("POST", "/api/lifestyle/posts", { user: U("temi"), body: { photo: PHOTO } });
  db.prepare("INSERT INTO blocks VALUES(?,?)").run("me", "temi");
  const f = await app.call("GET", "/api/lifestyle/feed", { user: U("me") });
  assert.equal(f.body.posts.length, 0);
});

test("videos, empty posts, oversize and non-photo files are refused with a plain message", async () => {
  const { app } = setup();
  const video = "data:video/mp4;base64,AAAA";
  const v = await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { kind: "video", photo: video } });
  assert.equal(v.status, 201); assert.equal(v.body.post.kind, "video");
  const badVideo = await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { kind: "video", photo: "data:text/plain;base64,AAAA" } });
  assert.equal(badVideo.status, 400); assert.match(badVideo.body.error, /video file is not supported/);
  assert.equal((await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: {} })).status, 400);
  const big = "data:image/jpeg;base64," + "A".repeat(lifestyle.MAX_PHOTO_CHARS);
  assert.match((await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: big } })).body.error, /too large/);
  assert.match((await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: "data:text/html;base64,AAAA" } })).body.error, /isn't a photo/);
});

test("only the owner can delete a post", async () => {
  const { app } = setup();
  const p = (await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: PHOTO } })).body.post;
  assert.equal((await app.call("DELETE", `/api/lifestyle/posts/${p.id}`, { user: U("amaka") })).status, 404);
  assert.equal((await app.call("DELETE", `/api/lifestyle/posts/${p.id}`, { user: U("me") })).status, 200);
  assert.equal((await app.call("GET", "/api/lifestyle/feed", { user: U("me") })).body.posts.length, 0);
});

test("the server mounts the Lifestyle routes", () => {
  assert.match(fs.readFileSync(path.join(__dirname, "index.js"), "utf8"), /require\("\.\/lifestyle"\)\.register\(app,\{db,auth,friends,genRowId,notify:sendPush,admin:adminAccess\}\)/);
});

test("the Lifestyle screen loads the feed, shares photos, keeps videos local, and can delete", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const s = read("src/LifestyleScreen.tsx");
  assert.match(s, /apiLifestyleFeed\(\)/);
  assert.match(s, /apiLifestylePost\(`data:\$\{mime\};base64,\$\{a\.base64\}`/);
  assert.match(s, /base64: true/);
  assert.match(s, /Photos and videos are shared with friends through the server/); assert.doesNotMatch(s, /Videos can't be shared with friends yet/);
  assert.match(s, /accessibilityLabel="Delete your post"/);
  const api = read("src/lifestyle.ts");
  assert.match(api, /\/api\/lifestyle\/feed/);
  assert.match(api, /\/api\/lifestyle\/posts/);
});

test("friends can like (toggle) and comment; counts and names come back", async () => {
  const { app, pings } = setup();
  const p = (await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: PHOTO } })).body.post;
  let l = await app.call("POST", `/api/lifestyle/posts/${p.id}/like`, { user: U("amaka") });
  assert.deepEqual(l.body, { likeCount: 1, liked: true, commentCount: 0 });
  l = await app.call("POST", `/api/lifestyle/posts/${p.id}/like`, { user: U("amaka") });
  assert.equal(l.body.likeCount, 0); assert.equal(l.body.liked, false);
  const c = await app.call("POST", `/api/lifestyle/posts/${p.id}/comments`, { user: U("temi"), body: { body: "  Lovely  " } });
  assert.equal(c.status, 201); assert.equal(c.body.comment.body, "Lovely"); assert.equal(c.body.comment.author.name, "Temi Bello"); assert.equal(c.body.commentCount, 1);
  const list = await app.call("GET", `/api/lifestyle/posts/${p.id}/comments`, { user: U("me") });
  assert.equal(list.body.comments.length, 1);
  const feed = (await app.call("GET", "/api/lifestyle/feed", { user: U("me") })).body.posts[0];
  assert.equal(feed.commentCount, 1);
  assert.ok(pings.some((x) => x[0] === "me" && /commented/.test(x[2])), "owner is told about the comment");
});

test("strangers and blocked people cannot like or comment, and posting alerts friends only", async () => {
  const { app, db, pings } = setup();
  const p = (await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: PHOTO } })).body.post;
  assert.deepEqual(pings.map((x) => x[0]).sort(), ["amaka", "temi"], "only friends are alerted");
  assert.equal((await app.call("POST", `/api/lifestyle/posts/${p.id}/like`, { user: U("stranger") })).status, 404);
  assert.equal((await app.call("POST", `/api/lifestyle/posts/${p.id}/comments`, { user: U("stranger"), body: { body: "hi" } })).status, 404);
  db.prepare("INSERT INTO blocks VALUES(?,?)").run("me", "amaka");
  assert.equal((await app.call("POST", `/api/lifestyle/posts/${p.id}/like`, { user: U("amaka") })).status, 404);
});

test("comments are validated, rate limited, and removable by the writer or the post owner", async () => {
  const { app } = setup();
  const p = (await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: PHOTO } })).body.post;
  const url = `/api/lifestyle/posts/${p.id}/comments`;
  assert.equal((await app.call("POST", url, { user: U("amaka"), body: { body: "   " } })).status, 400);
  assert.match((await app.call("POST", url, { user: U("amaka"), body: { body: "x".repeat(lifestyle.MAX_COMMENT + 1) } })).body.error, /under/);
  const a = (await app.call("POST", url, { user: U("amaka"), body: { body: "one" } })).body.comment;
  assert.equal((await app.call("DELETE", `/api/lifestyle/comments/${a.id}`, { user: U("temi") })).status, 404);
  assert.equal((await app.call("DELETE", `/api/lifestyle/comments/${a.id}`, { user: U("me") })).status, 200, "post owner can remove it");
  for (let i = 0; i < 20; i++) await app.call("POST", url, { user: U("temi"), body: { body: "n" + i } });
  assert.equal((await app.call("POST", url, { user: U("temi"), body: { body: "too many" } })).status, 429);
});

test("deleting a post also removes its likes and comments", async () => {
  const { app, db } = setup();
  const p = (await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: PHOTO } })).body.post;
  await app.call("POST", `/api/lifestyle/posts/${p.id}/like`, { user: U("amaka") });
  await app.call("POST", `/api/lifestyle/posts/${p.id}/comments`, { user: U("amaka"), body: { body: "hi" } });
  await app.call("DELETE", `/api/lifestyle/posts/${p.id}`, { user: U("me") });
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lifestyle_likes").get().n, 0);
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM lifestyle_comments").get().n, 0);
});

test("B317 the Lifestyle screen has like, comment and caption controls with labels", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const s = read("src/LifestyleScreen.tsx");
  assert.match(s, /apiLifestyleLike\(post\.id\)/);
  assert.match(s, /apiLifestyleComment\(post\.id, body\)/);
  assert.match(s, /accessibilityLabel="Write a comment"/);
  assert.match(s, /accessibilityLabel="Send comment"/);
  assert.match(s, /accessibilityLabel="Caption for your next photo"/);
  assert.match(s, /apiLifestylePost\(`data:\$\{mime\};base64,\$\{a\.base64\}`, caption\.trim\(\) \|\| undefined, a\.type === "video" \? "video" : "photo"\)/);
  const api = read("src/lifestyle.ts");
  assert.match(api, /\/like`, "POST"/);
  assert.match(api, /\/comments`/);
  assert.match(api, /\/api\/lifestyle\/comments\//);
});

test("B318 a friend can report a post: it leaves their feed, others still see it, own posts can't be reported", async () => {
  const { app } = setup();
  const p = (await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: PHOTO } })).body.post;
  const url = `/api/lifestyle/posts/${p.id}/report`;
  assert.equal((await app.call("POST", url, { user: U("amaka"), body: { reason: "bad" } })).status, 400);
  assert.equal((await app.call("POST", url, { user: U("me"), body: { reason: "spam" } })).status, 400);
  assert.equal((await app.call("POST", url, { user: U("stranger"), body: { reason: "spam" } })).status, 404);
  assert.equal((await app.call("POST", url, { user: U("amaka"), body: { reason: "Spam" } })).status, 200);
  assert.equal((await app.call("POST", url, { user: U("amaka"), body: { reason: "spam" } })).status, 200, "reporting twice is harmless");
  assert.equal((await app.call("GET", "/api/lifestyle/feed", { user: U("amaka") })).body.posts.length, 0);
  assert.equal((await app.call("GET", "/api/lifestyle/feed", { user: U("temi") })).body.posts.length, 1);
});

test("B318 only an administrator can list reports or take a reported post down", async () => {
  const { app } = setup();
  const p = (await app.call("POST", "/api/lifestyle/posts", { user: U("me"), body: { photo: PHOTO } })).body.post;
  await app.call("POST", `/api/lifestyle/posts/${p.id}/report`, { user: U("amaka"), body: { reason: "nudity" } });
  await app.call("POST", `/api/lifestyle/posts/${p.id}/report`, { user: U("temi"), body: { reason: "spam" } });
  assert.equal((await app.call("GET", "/api/lifestyle/reports", { user: U("me") })).status, 403);
  const list = await app.call("GET", "/api/lifestyle/reports", { user: U("admin") });
  assert.equal(list.body.reports[0].reports, 2);
  assert.deepEqual(list.body.reports[0].reasons.sort(), ["nudity", "spam"]);
  assert.equal(list.body.reports[0].author.name, "Me");
  assert.equal((await app.call("DELETE", `/api/lifestyle/reports/${p.id}/post`, { user: U("amaka") })).status, 403);
  assert.equal((await app.call("DELETE", `/api/lifestyle/reports/${p.id}/post`, { user: U("admin") })).status, 200);
  assert.equal((await app.call("GET", "/api/lifestyle/feed", { user: U("temi") })).body.posts.length, 0);
});

test("B318 the Lifestyle screen lets you report a friend's post with a reason", () => {
  const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");
  const s = read("src/LifestyleScreen.tsx");
  assert.match(s, /apiLifestyleReport\(post\.id, r\.key\)/);
  assert.match(s, /accessibilityLabel=\{`Report post from \$\{post\.author\.name\}`\}/);
  assert.match(s, /onHide=\{/);
  assert.match(read("src/lifestyle.ts"), /\/report`, "POST"/);
});
