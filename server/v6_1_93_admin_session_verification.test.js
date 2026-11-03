"use strict";
// V6.1.93 B539: Finding A (admin first-login deadlock) and Finding B (Admin staff had no sign-in code).
// Runtime part uses Node's built-in SQLite through a small better-sqlite3-shaped wrapper, so it runs without native modules.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

let DatabaseSync = null;
try { ({ DatabaseSync } = require("node:sqlite")); } catch (_) { /* older Node: runtime part is skipped */ }
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

function makeDb() {
  const raw = new DatabaseSync(":memory:");
  return {
    exec: (sql) => raw.exec(sql),
    prepare: (sql) => raw.prepare(sql),
    transaction: (fn) => (...args) => { raw.exec("BEGIN"); try { const r = fn(...args); raw.exec("COMMIT"); return r; } catch (e) { raw.exec("ROLLBACK"); throw e; } },
  };
}

function build({ withStaffTable = true } = {}) {
  const db = makeDb();
  const { isConfiguredAdmin } = require("./mallAdmin");
  const admin = require("./adminAccess").create({ db, isConfiguredAdmin });
  if (withStaffTable) db.exec("CREATE TABLE admin_staff (id TEXT PRIMARY KEY, userId TEXT UNIQUE NOT NULL, label TEXT, active INTEGER NOT NULL DEFAULT 1, capabilities TEXT NOT NULL DEFAULT '[]', createdBy TEXT NOT NULL, createdAt TEXT NOT NULL)");
  const center = require("./adminSecurityCenter").createAdminSecurityCenter({ db, auth: {}, admin, env: {} });
  return { db, admin, center };
}
const addAdmin = (db, userId, role) => db.prepare("INSERT INTO admin_users(userId,role,addedBy,createdAt) VALUES(?,?,?,?)").run(userId, role, "owner", new Date().toISOString());
const addStaff = (db, userId, active = 1) => db.prepare("INSERT INTO admin_staff(id,userId,label,active,capabilities,createdBy,createdAt) VALUES(?,?,?,?,?,?,?)").run(`s_${userId}`, userId, "Staff", active, "[]", "owner", new Date().toISOString());
const inboxFor = (db, userId) => db.prepare("SELECT message,challengeId FROM zeeza_login_secure_inbox WHERE userId=?").all(userId);

test("an unverified session is never the configured owner, a verified or plain object still is", () => {
  const { isConfiguredAdmin } = require("./mallAdmin");
  const env = { NEXA_ADMIN_USER_IDS: "owner1", NEXA_ADMIN_EMAILS: "boss@example.com" };
  assert.equal(isConfiguredAdmin({ id: "owner1" }, env), true);
  assert.equal(isConfiguredAdmin({ id: "owner1", adminSessionVerified: true }, env), true);
  assert.equal(isConfiguredAdmin({ id: "owner1", email: "boss@example.com", adminSessionVerified: false }, env), false);
  assert.equal(isConfiguredAdmin({ id: "nobody" }, env), false);
});

test("roleOf gives no admin role to an unverified session but still resolves other users by id", { skip: !DatabaseSync }, () => {
  const { db, admin } = build();
  addAdmin(db, "rev1", "reviewer");
  assert.equal(admin.roleOf({ id: "rev1", adminSessionVerified: true }), "reviewer");
  assert.equal(admin.roleOf({ id: "rev1", adminSessionVerified: false }), null);
  assert.equal(admin.roleOf({ id: "rev1" }), "reviewer", "target lookups by id keep working");
});

test("Finding B: an active Admin staff user gets a Zeeza sign-in code, others do not", { skip: !DatabaseSync }, () => {
  const { db, center } = build();
  addStaff(db, "staff1", 1); addStaff(db, "staff2", 0);
  const ch = center.createLoginChallenge({ id: "staff1", email: "s1@example.com" }, { ip: "1.1.1.1", userAgent: "t" });
  assert.equal(ch.mfaRequired, true);
  assert.equal(ch.factor, "zeeza");
  assert.equal(ch.userId, "staff1");
  assert.equal(inboxFor(db, "staff1").length, 1, "the code lands in that user's own inbox");
  assert.equal(center.createLoginChallenge({ id: "staff2" }, {}), null, "deactivated staff are not admin-protected here");
  assert.equal(center.createLoginChallenge({ id: "plain" }, {}), null, "ordinary users are unchanged");
});

test("admins still get the code, and a missing staff table does not break sign-in", { skip: !DatabaseSync }, () => {
  const { db, center } = build({ withStaffTable: false });
  addAdmin(db, "rev1", "reviewer");
  assert.equal(center.createLoginChallenge({ id: "rev1" }, {}).mfaRequired, true);
  assert.equal(center.createLoginChallenge({ id: "plain" }, {}), null);
});

test("the staff code verifies once, wrong codes are counted, and the inbox message is removed", { skip: !DatabaseSync }, () => {
  const { db, center } = build();
  addStaff(db, "staff1", 1);
  const ch = center.createLoginChallenge({ id: "staff1" }, {});
  const code = /(\d{6})/.exec(inboxFor(db, "staff1")[0].message)[1];
  const wrong = code === "000000" ? "111111" : "000000";
  assert.throws(() => center.verifyLoginChallenge(ch.challengeId, wrong), (e) => e.code === "MFA_CODE_INVALID");
  assert.equal(center.verifyLoginChallenge(ch.challengeId, code), "staff1");
  assert.equal(inboxFor(db, "staff1").length, 0);
  assert.throws(() => center.verifyLoginChallenge(ch.challengeId, code), (e) => e.code === "MFA_CHALLENGE_INVALID");
});

// ---- contract checks on the wiring that the runtime part cannot reach without express and bcrypt ----
test("sessions carry the verified mark: created only on request, kept through rotation, exposed on req.user", () => {
  const auth = read("auth.js"), db = read("db.js");
  assert.match(db, /ALTER TABLE sessions ADD COLUMN adminVerifiedAt TEXT/);
  assert.match(auth, /function createSession\(userId,context=\{\},options=\{\}\)/);
  assert.match(auth, /options&&options\.adminVerified===true\?now\.toISOString\(\):null/);
  assert.match(auth, /old\.adminVerifiedAt\|\|null/);
  assert.match(auth, /adminSessionVerified:!!row\.adminVerifiedAt/);
});

test("only the verified code path and nothing else marks a session verified", () => {
  const center = read("adminSecurityCenter.js"), google = read("googleAuth.js"), index = read("index.js");
  const marks = (center.match(/adminVerified: true/g) || []).length;
  assert.equal(marks, 1);
  assert.match(center, /auth\.createSession\(userId, context, \{ adminVerified: true \}\)/);
  assert.doesNotMatch(google, /adminVerified/);
  assert.doesNotMatch(index, /adminVerified: true/);
});

test("Finding A: the login route gives non-Admin clients an unprivileged session beside the challenge", () => {
  const index = read("index.js");
  const i = index.indexOf('app.post("/api/auth/login"'); assert.ok(i >= 0);
  const route = index.slice(i, index.indexOf("// Block 03", i));
  assert.match(route, /aami admin web/);
  assert.match(route, /if \(adminAppClient\) return res\.json\(result\)/);
  assert.match(route, /auth\.createSession\(result\.userId, authSessionContext\(req\)\)/);
  assert.doesNotMatch(route, /adminVerified/, "the base session must never be marked verified");
  assert.match(route, /adminVerificationRequired: true/);
});

test("every staff guard refuses an unverified session", () => {
  for (const f of ["adminStaffWork.js", "customerCare.js", "adminAi.js"]) {
    assert.match(read(f), /adminSessionVerified\s*(===|!==)\s*false/, `${f} must check the verified mark`);
  }
  assert.match(read("adminStaffWork.js"), /ADMIN_SESSION_UNVERIFIED/);
  assert.match(read("customerCare.js"), /ADMIN_SESSION_UNVERIFIED/);
});
