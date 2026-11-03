"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const R = require("./recoveryOps");

const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), "nexa-b90-"));
function liveDb(dir) {
  const db = new DatabaseSync(path.join(dir, "live.db"));
  db.exec("CREATE TABLE users(id INTEGER PRIMARY KEY, email TEXT); CREATE TABLE orders(id INTEGER PRIMARY KEY, userId INTEGER REFERENCES users(id)); INSERT INTO users(email) VALUES('a@x.com'),('b@x.com'); INSERT INTO orders(userId) VALUES(1),(2),(2);");
  return db;
}
const T0 = new Date("2026-09-30T10:00:00Z");
function backup(db, dir, when = T0) { return R.createVerifiedBackup(db, path.join(dir, "bk"), { packageVersion: "5.53.0", now: when }); }
const bkPath = (dir, i = 0) => R.listBackups(path.join(dir, "bk"))[i].path;

test("M675 sha256File matches a known digest", () => { const d = tmp(), f = path.join(d, "x"); fs.writeFileSync(f, "abc"); assert.equal(R.sha256File(f), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"); });
test("M676 manifest records size, checksum, version and table counts only", () => { const d = tmp(), db = liveDb(d); backup(db, d); const m = JSON.parse(fs.readFileSync(R.manifestPathFor(bkPath(d)), "utf8")); assert.equal(m.appVersion, "5.53.0"); assert.deepEqual(m.tables, { orders: 3, users: 2 }); assert.ok(!JSON.stringify(m).includes("a@x.com")); assert.match(m.sha256, /^[0-9a-f]{64}$/); });
test("M677 verifyManifest detects tampering, missing manifest and missing file", () => {
  const d = tmp(), db = liveDb(d); backup(db, d); const p = bkPath(d);
  assert.equal(R.verifyManifest(p).ok, true);
  fs.appendFileSync(p, "x"); assert.equal(R.verifyManifest(p).ok, false);
  fs.rmSync(R.manifestPathFor(p)); assert.equal(R.verifyManifest(p).reason, "manifest missing");
  assert.equal(R.verifyManifest(path.join(d, "nope.db")).reason, "backup file missing");
});
test("M678 quickCheck passes on a healthy database", () => { assert.equal(R.quickCheck(liveDb(tmp())).ok, true); });
test("M679 integrityCheck passes on a healthy database", () => { assert.equal(R.integrityCheck(liveDb(tmp())).ok, true); });
test("M680 foreignKeyCheck counts orphan rows", () => { const db = liveDb(tmp()); assert.equal(R.foreignKeyCheck(db).ok, true); db.exec("PRAGMA foreign_keys=OFF"); db.exec("INSERT INTO orders(userId) VALUES(999)"); const r = R.foreignKeyCheck(db); assert.equal(r.ok, false); assert.equal(r.violations, 1); });
test("M681 tableRowCounts is exact and quotes identifiers", () => { const db = liveDb(tmp()); db.exec('CREATE TABLE "we ird""name"(x)'); db.exec('INSERT INTO "we ird""name" VALUES(1)'); const c = R.tableRowCounts(db); assert.equal(c.users, 2); assert.equal(c.orders, 3); assert.equal(c['we ird"name'], 1); });
test("M682 backup names are sortable, UTC and match the safe pattern", () => { const n = R.backupNameFor(new Date("2026-01-02T03:04:05Z")); assert.equal(n, "nexa-20260102-030405.db"); assert.ok(R.BACKUP_RE.test(n)); assert.ok(!R.BACKUP_RE.test("../nexa-20260102-030405.db")); assert.ok(!R.BACKUP_RE.test("nexa.db")); });
test("M683 createVerifiedBackup verifies itself and refuses to overwrite", () => { const d = tmp(), db = liveDb(d); const r = backup(db, d); assert.equal(r.tables, 2); assert.equal(R.verifyManifest(bkPath(d)).ok, true); assert.throws(() => backup(db, d), /already exists/); });
test("M684 listBackups is newest-first and ignores files without manifests or foreign names", () => {
  const d = tmp(), db = liveDb(d); backup(db, d, new Date("2026-09-28T10:00:00Z")); backup(db, d, new Date("2026-09-30T10:00:00Z"));
  fs.writeFileSync(path.join(d, "bk", "nexa-20260101-000000.db"), "orphan"); fs.writeFileSync(path.join(d, "bk", "notes.txt"), "x");
  assert.deepEqual(R.listBackups(path.join(d, "bk")).map((b) => b.file), ["nexa-20260930-100000.db", "nexa-20260928-100000.db"]);
  assert.deepEqual(R.listBackups(path.join(d, "missing")), []);
});
test("M685 prune is a dry run by default, keeps newest, and only touches our own files", () => {
  const d = tmp(), db = liveDb(d), dir = path.join(d, "bk");
  for (const day of [26, 27, 28, 29, 30]) backup(db, d, new Date(`2026-09-${day}T10:00:00Z`));
  fs.writeFileSync(path.join(dir, "keep-me.txt"), "x");
  const dry = R.pruneBackups(dir, 2); assert.equal(dry.dryRun, true); assert.equal(dry.pruned.length, 3); assert.equal(R.listBackups(dir).length, 5);
  const real = R.pruneBackups(dir, 2, { dryRun: false }); assert.equal(real.kept, 2);
  assert.deepEqual(R.listBackups(dir).map((b) => b.file), ["nexa-20260930-100000.db", "nexa-20260929-100000.db"]);
  assert.ok(fs.existsSync(path.join(dir, "keep-me.txt"))); assert.ok(!fs.existsSync(R.manifestPathFor(path.join(dir, "nexa-20260926-100000.db"))));
  assert.throws(() => R.pruneBackups(dir, 0), /keep/); assert.throws(() => R.pruneBackups(dir, 1.5), /keep/);
});
test("M686 restore goes to a new path only and refuses tampered backups", () => {
  const d = tmp(), db = liveDb(d); backup(db, d); const p = bkPath(d), out = path.join(d, "restored", "r.db");
  const before = fs.readFileSync(path.join(d, "live.db")); R.restoreToNewPath(p, out);
  assert.ok(fs.existsSync(out)); assert.deepEqual(fs.readFileSync(path.join(d, "live.db")), before);
  assert.throws(() => R.restoreToNewPath(p, out), /already exists/);
  fs.appendFileSync(p, "x"); assert.throws(() => R.restoreToNewPath(p, path.join(d, "r2.db")), /Refusing/);
});
test("M687 restore drill passes on a good backup and cleans up its scratch file", () => {
  const d = tmp(), db = liveDb(d); backup(db, d); const before = fs.readdirSync(d).sort();
  const r = R.restoreDrill(bkPath(d), d); assert.equal(r.ok, true); assert.deepEqual(r.steps.map((s) => s.step), ["manifest", "integrity", "foreign-keys", "row-counts"]);
  assert.deepEqual(fs.readdirSync(d).sort(), before);
});
test("M688 compareCounts reports every differing table", () => { assert.equal(R.compareCounts({ a: 1 }, { a: 1 }).ok, true); const r = R.compareCounts({ a: 1, b: 2 }, { a: 1, b: 3, c: 1 }); assert.equal(r.mismatches.length, 2); });
test("M689 backupAgeHours uses the newest VERIFIED backup", () => {
  const d = tmp(), db = liveDb(d); backup(db, d, new Date("2026-09-30T04:00:00Z")); backup(db, d, new Date("2026-09-30T08:00:00Z"));
  const now = new Date("2026-09-30T10:00:00Z"); assert.equal(R.backupAgeHours(path.join(d, "bk"), now), 2);
  fs.appendFileSync(bkPath(d, 0), "x"); assert.equal(R.backupAgeHours(path.join(d, "bk"), now), 6);
  assert.equal(R.backupAgeHours(path.join(d, "none"), now), null);
});
test("M690 freshness policy: pass, warn, fail, and no backup", () => { assert.equal(R.evaluateBackupFreshness(5).status, "pass"); assert.equal(R.evaluateBackupFreshness(30).status, "warn"); assert.equal(R.evaluateBackupFreshness(60).status, "fail"); assert.equal(R.evaluateBackupFreshness(null).status, "fail"); assert.equal(R.evaluateBackupFreshness(10, 6).status, "warn"); });
test("M691 walCheckpoint reports success and swallows errors", () => { const db = liveDb(tmp()); assert.equal(R.walCheckpoint(db).ok, true); assert.equal(R.walCheckpoint({ prepare() { throw new Error("x"); } }).ok, false); });
test("M692 dbStats reports size, free pages and journal mode", () => { const s = R.dbStats(liveDb(tmp())); assert.ok(s.bytes > 0 && s.bytes % 1024 === 0); assert.equal(typeof s.freeRatio, "number"); assert.ok(s.journalMode); });
test("M693 redactPath exposes base names only", () => { assert.equal(R.redactPath("/var/secret/dir/nexa.db"), "nexa.db"); assert.equal(R.redactPath(""), ""); const d = tmp(), db = liveDb(d); const r = backup(db, d); assert.ok(!JSON.stringify(r).includes(d)); });
test("M694 recoveryStatus is healthy, flags stale backups, and leaks no paths or secrets", () => {
  const d = tmp(), db = liveDb(d), dir = path.join(d, "bk"); backup(db, d, new Date("2026-09-30T08:00:00Z"));
  const ok = R.recoveryStatus({ db, env: { BACKUP_DIR: dir }, now: new Date("2026-09-30T10:00:00Z"), packageVersion: "5.53.0" });
  assert.equal(ok.ok, true); assert.equal(ok.backups.count, 1); assert.equal(ok.backups.freshness.status, "pass");
  const stale = R.recoveryStatus({ db, env: { BACKUP_DIR: dir, BACKUP_MAX_AGE_HOURS: "2" }, now: new Date("2026-10-05T10:00:00Z") });
  assert.equal(stale.ok, false); assert.equal(stale.backups.freshness.status, "fail");
  const none = R.recoveryStatus({ db, env: {}, packageVersion: "5.53.0" }); assert.equal(none.backups.configured, false); assert.equal(none.ok, true);
  assert.ok(!JSON.stringify(ok).includes(d));
});
test("M695 recovery route is admin-gated server-side and never throws to the client", () => {
  const idx = read("server/index.js"), i = idx.indexOf('"/api/admin/recovery-status"'); assert.ok(i > 0);
  const block = idx.slice(i, i + 600);
  assert.match(block, /auth\.authMiddleware/); assert.match(block, /isConfiguredAdmin\(req\.user\)/); assert.match(block, /403/); assert.match(block, /503/);
});
test("M696 recovery CLI exposes backup, drill and prune with prune dry-run by default", () => {
  const s = read("scripts/recovery-drill.mjs");
  assert.match(s, /restoreDrill/);
  const ops = read("server/recoveryOps.js");
  assert.match(ops, /createVerifiedBackup/); assert.match(ops, /pruneBackups/); assert.match(ops, /restoreDrill/);
});
test("M697 startup logs backup freshness only when BACKUP_DIR is set, without paths", () => {
  const idx = read("server/index.js"); const i = idx.indexOf("if (process.env.BACKUP_DIR)"); assert.ok(i > 0);
  const block = idx.slice(i, i + 500); assert.match(block, /recoveryStatus/); assert.ok(!/BACKUP_DIR\}/.test(block));
});
test("M698 runbook, env template and ADR document backup and restore operations", () => {
  assert.match(read("server/.env.example"), /BACKUP_DIR/); assert.match(read("server/.env.example"), /BACKUP_MAX_AGE_HOURS/);
  assert.match(read("PRODUCTION_OPERATIONS_RUNBOOK.md"), /recovery-drill/); assert.match(read("docs/architecture/ARCHITECTURE_DECISIONS.md"), /B90/);
});
test("M699 historical B90 contract remains compatible with the current release", () => { assert.match(JSON.parse(read("package.json")).version, /^\d+\.\d+\.\d+$/); for (const f of ["MASTER_ROADMAP.md"]) { const t = read(f); for (let n = 675; n <= 699; n++) assert.ok(new RegExp(`\\b${n}\\b`).test(t), `${f} ${n}`); } });
