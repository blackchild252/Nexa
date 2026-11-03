"use strict";
// B145 run 2: ring timeout -> missed call, calls push channel, group-call push, ringtone wiring.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const { createCallSignaling, RING_TIMEOUT_MS } = require("./callSignaling");
const read = (...p) => fs.readFileSync(path.join(__dirname, ...p), "utf8");

function harness() {
  const raw = new DatabaseSync(":memory:");
  raw.exec(`CREATE TABLE call_sessions (id TEXT PRIMARY KEY, callerId TEXT, calleeId TEXT, media TEXT, status TEXT, createdAt TEXT, startedAt TEXT, endedAt TEXT);
    CREATE TABLE call_participants (id TEXT PRIMARY KEY, callId TEXT, userId TEXT, role TEXT, joinedAt TEXT);
    CREATE TABLE call_signals (id TEXT PRIMARY KEY, callId TEXT, senderId TEXT, type TEXT, payload TEXT, createdAt TEXT);`);
  const db = { prepare: (sql) => raw.prepare(sql), transaction: (fn) => () => fn() };
  const pushes = []; let n = 0;
  const sig = createCallSignaling({
    db, auth: { authMiddleware: (q, r, nx) => nx() },
    friends: { areFriends: () => true, isBlocked: () => false, publicUser: (u) => u, userRow: (id) => ({ id, name: id === "u1" ? "Ada" : "Bayo" }) },
    sendPush: async (...a) => { pushes.push(a); }, genRowId: (p) => `${p}_${++n}`,
  });
  const routes = {}; const app = { post: (p, ...h) => { routes["POST " + p] = h[h.length - 1]; }, get: (p, ...h) => { routes["GET " + p] = h[h.length - 1]; } };
  sig.register(app);
  const call = (key, user, params = {}, body = {}) => { let out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(b) { out.body = b; return this; } }; routes[key]({ user: { id: user }, params, body, query: {} }, res); return out; };
  return { raw, pushes, sig, call };
}

test("an unanswered call becomes missed after the ring timeout and the callee gets a missed-call push", async () => {
  const h = harness();
  const started = h.call("POST /api/zeeza/calls", "u1", {}, { userId: "u2", media: "audio" });
  assert.equal(started.code, 201);
  const id = started.body.call.id;
  assert.equal(h.call("GET /api/zeeza/calls/:callId", "u2", { callId: id }).body.call.status, "ringing");
  h.raw.prepare("UPDATE call_sessions SET createdAt=? WHERE id=?").run(new Date(Date.now() - RING_TIMEOUT_MS - 1000).toISOString(), id);
  assert.equal(h.call("GET /api/zeeza/calls/:callId", "u1", { callId: id }).body.call.status, "missed");
  await new Promise((r) => setImmediate(r));
  const missed = h.pushes.filter((p) => p[3] && p[3].type === "missed_call");
  assert.equal(missed.length, 1);
  assert.equal(missed[0][0], "u2");
  assert.equal(h.call("GET /api/zeeza/calls/:callId", "u1", { callId: id }).body.call.status, "missed");
  assert.equal(h.pushes.filter((p) => p[3] && p[3].type === "missed_call").length, 1, "missed push is sent once");
});

test("a late accept after the timeout is refused", () => {
  const h = harness();
  const id = h.call("POST /api/zeeza/calls", "u1", {}, { userId: "u2" }).body.call.id;
  h.raw.prepare("UPDATE call_sessions SET createdAt=? WHERE id=?").run(new Date(Date.now() - RING_TIMEOUT_MS - 1000).toISOString(), id);
  const r = h.call("POST /api/zeeza/calls/:callId/accept", "u2", { callId: id });
  assert.equal(r.code, 409);
});

test("an answered call inside the window stays active and the sweeper leaves it alone", () => {
  const h = harness();
  const id = h.call("POST /api/zeeza/calls", "u1", {}, { userId: "u2" }).body.call.id;
  assert.equal(h.call("POST /api/zeeza/calls/:callId/accept", "u2", { callId: id }).body.call.status, "active");
  assert.equal(h.sig.sweepRinging(), 0);
});

test("the sweeper marks stale ringing calls missed even when nobody polls", () => {
  const h = harness();
  const id = h.call("POST /api/zeeza/calls", "u1", {}, { userId: "u2" }).body.call.id;
  h.raw.prepare("UPDATE call_sessions SET createdAt=? WHERE id=?").run(new Date(Date.now() - RING_TIMEOUT_MS - 1000).toISOString(), id);
  assert.equal(h.sig.sweepRinging(), 1);
  assert.equal(h.raw.prepare("SELECT status FROM call_sessions WHERE id=?").get(id).status, "missed");
});

test("call pushes use the high-importance calls channel and group calls push every other member", () => {
  const nd = read("notificationDelivery.js");
  assert.match(nd, /channelId: "calls", priority: "high", ttl: 45/);
  assert.match(nd, /data\.screen === "call" \|\| data\.type === "group_call"/);
  const gc = read("groupCallSignaling.js");
  assert.match(gc, /Incoming group call/);
  assert.match(gc, /if\(m\.userId===req\.user\.id\) continue;/);
  assert.match(read("index.js"), /createGroupCallSignaling\(\{ app, auth, db, genRowId, sendPush \}\)/);
});

test("the app registers a calls channel and the call screen plays a ringtone and a ringback", () => {
  assert.match(read("..", "src", "pushRegistration.ts"), /setNotificationChannelAsync\('calls'/);
  const screen = read("..", "src", "CallScreen.tsx");
  assert.match(screen, /ringtone\.wav/); assert.match(screen, /ringback\.wav/);
  assert.match(screen, /isLooping:true/); assert.match(screen, /No answer/);
  assert.ok(fs.statSync(path.join(__dirname, "..", "assets", "sounds", "ringtone.wav")).size > 10000);
  assert.ok(fs.statSync(path.join(__dirname, "..", "assets", "sounds", "ringback.wav")).size > 10000);
});
