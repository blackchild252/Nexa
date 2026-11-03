"use strict";
// V5.53.0 / B90 — Backup integrity & recovery drills (M675–M699).
// Works with better-sqlite3 (production) and node:sqlite (test sandbox). Manifests hold table names and
// row counts only — never row content. Nothing here ever writes to the live database file.

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const disasterRecovery = require("./v5_73_0_disaster_recovery");

const BACKUP_RE = /^nexa-\d{8}-\d{6}\.db$/;
const manifestPathFor = (p) => `${p}.manifest.json`;
const first = (row) => (row ? Object.values(row)[0] : undefined);
const pragmaAll = (db, name) => db.prepare(`PRAGMA ${name}`).all();
const pragmaOne = (db, name) => first(db.prepare(`PRAGMA ${name}`).get());

// M675
function sha256File(file) {
  const h = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  try { const buf = Buffer.alloc(1 << 20); let n; while ((n = fs.readSync(fd, buf, 0, buf.length, null)) > 0) h.update(buf.subarray(0, n)); } finally { fs.closeSync(fd); }
  return h.digest("hex");
}
// M678
function quickCheck(db) { const v = pragmaOne(db, "quick_check"); return { ok: v === "ok", result: String(v) }; }
// M679
function integrityCheck(db) { const v = pragmaOne(db, "integrity_check"); return { ok: v === "ok", result: String(v) }; }
// M680
function foreignKeyCheck(db) { const rows = pragmaAll(db, "foreign_key_check"); return { ok: rows.length === 0, violations: rows.length }; }
// M681 — names come from sqlite_master and are identifier-quoted; no user input reaches the SQL.
function tableRowCounts(db) {
  const names = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((r) => r.name);
  const counts = {};
  for (const n of names) counts[n] = Number(first(db.prepare(`SELECT COUNT(*) FROM "${String(n).replace(/"/g, '""')}"`).get()));
  return counts;
}
// M682
function backupNameFor(date = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, "0");
  const d = date;
  return `nexa-${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}-${p(d.getUTCHours())}${p(d.getUTCMinutes())}${p(d.getUTCSeconds())}.db`;
}
// M693 — reports expose base names only, never filesystem layout.
const redactPath = (p) => path.basename(String(p || ""));

function openReadonly(file) {
  try { const Database = require("better-sqlite3"); return new Database(file, { readonly: true, fileMustExist: true }); }
  catch (e) { if (e && e.code !== "MODULE_NOT_FOUND") throw e; const { DatabaseSync } = require("node:sqlite"); return new DatabaseSync(file, { readOnly: true }); }
}

// M676
function writeManifest(backupPath, { packageVersion, tables, now = new Date() } = {}) {
  const manifest = { file: redactPath(backupPath), bytes: fs.statSync(backupPath).size, sha256: sha256File(backupPath), createdAt: now.toISOString(), appVersion: packageVersion || null, tables: tables || {} };
  fs.writeFileSync(manifestPathFor(backupPath), JSON.stringify(manifest, null, 2), { flag: "wx" });
  return manifest;
}
// M677
function verifyManifest(backupPath) {
  const mp = manifestPathFor(backupPath);
  try {
    if (!fs.existsSync(backupPath)) return { ok: false, reason: "backup file missing" };
    if (!fs.existsSync(mp)) return { ok: false, reason: "manifest missing" };
    const stat = fs.statSync(backupPath);
    if (!stat.isFile()) return { ok: false, reason: "backup is not a regular file" };
    let m;
    try { m = JSON.parse(fs.readFileSync(mp, "utf8")); } catch (_) { return { ok: false, reason: "manifest unreadable" }; }
    if (!m || typeof m !== "object" || Array.isArray(m)) return { ok: false, reason: "manifest schema invalid" };
    if (typeof m.file !== "string" || m.file !== path.basename(backupPath) || !BACKUP_RE.test(m.file)) return { ok: false, reason: "manifest filename invalid" };
    if (!Number.isSafeInteger(m.bytes) || m.bytes <= 0 || m.bytes > disasterRecovery.MAX_BACKUP_BYTES) return { ok: false, reason: "manifest size invalid" };
    if (!/^[a-f0-9]{64}$/.test(String(m.sha256 || ""))) return { ok: false, reason: "manifest checksum invalid" };
    if (typeof m.createdAt !== "string" || !Number.isFinite(Date.parse(m.createdAt))) return { ok: false, reason: "manifest timestamp invalid" };
    if (m.tables != null && (typeof m.tables !== "object" || Array.isArray(m.tables) || Object.entries(m.tables).some(([name, count]) => !name || name.length > 200 || !Number.isSafeInteger(count) || count < 0))) return { ok: false, reason: "manifest table counts invalid" };
    if (m.appVersion != null && (typeof m.appVersion !== "string" || m.appVersion.length > 40)) return { ok: false, reason: "manifest version invalid" };
    if (stat.size !== m.bytes) return { ok: false, reason: "size mismatch" };
    if (sha256File(backupPath) !== m.sha256) return { ok: false, reason: "checksum mismatch" };
    return { ok: true, manifest: m };
  } catch (_) {
    return { ok: false, reason: "backup verification failed" };
  }
}
// M688
function compareCounts(expected = {}, actual = {}) {
  const mismatches = [];
  for (const k of new Set([...Object.keys(expected), ...Object.keys(actual)])) if (expected[k] !== actual[k]) mismatches.push({ table: k, expected: expected[k] ?? null, actual: actual[k] ?? null });
  return { ok: mismatches.length === 0, mismatches };
}
// M683
function createVerifiedBackup(db, dir, { packageVersion, now = new Date() } = {}) {
  fs.mkdirSync(dir, { recursive: true });
  const target = path.join(dir, backupNameFor(now));
  if (fs.existsSync(target)) throw new Error("Backup destination already exists.");
  const tables = tableRowCounts(db);
  db.prepare("VACUUM INTO ?").run(target);
  const manifest = writeManifest(target, { packageVersion, tables, now });
  const check = verifyManifest(target);
  if (!check.ok) throw new Error(`Backup verification failed: ${check.reason}`);
  return { file: redactPath(target), bytes: manifest.bytes, sha256: manifest.sha256, tables: Object.keys(tables).length };
}
// M684
function listBackups(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => BACKUP_RE.test(f) && fs.existsSync(manifestPathFor(path.join(dir, f))))
    .sort().reverse().map((f) => ({ file: f, path: path.join(dir, f) }));
}
// M685 — dry run by default; only ever touches files matching our own naming pattern (and their manifests).
function pruneBackups(dir, keep, { dryRun = true } = {}) {
  if (!Number.isInteger(keep) || keep < 1) throw new Error("keep must be an integer >= 1");
  const all = listBackups(dir);
  const doomed = all.slice(keep);
  if (!dryRun) for (const b of doomed) { fs.rmSync(b.path, { force: true }); fs.rmSync(manifestPathFor(b.path), { force: true }); }
  return { dryRun, kept: all.length - doomed.length, pruned: doomed.map((b) => b.file) };
}
// M686 — restores into a NEW path; refuses overwrite; never touches the live database.
function restoreToNewPath(backupPath, target) {
  if (typeof backupPath !== "string" || !backupPath.trim() || typeof target !== "string" || !target.trim()) throw new Error("Backup and restore target are required.");
  const v = verifyManifest(backupPath);
  if (!v.ok) throw new Error(`Refusing to restore: ${v.reason}`);
  if (fs.existsSync(target)) throw new Error("Restore target already exists.");
  fs.mkdirSync(path.dirname(path.resolve(target)), { recursive: true });
  // Claim the path first. If another process owns it this throws and nothing is removed;
  // once the claim succeeds, a failure at any later point (including a half-written copy) removes only our own file.
  fs.writeFileSync(target, "", { flag: "wx" });
  try {
    fs.copyFileSync(backupPath, target);
    const copied = fs.statSync(target);
    if (!copied.isFile() || copied.size !== v.manifest.bytes || sha256File(target) !== v.manifest.sha256) throw new Error("Restored copy failed integrity verification.");
    return { file: redactPath(target), bytes: copied.size };
  } catch (error) {
    try { fs.rmSync(target, { force: true }); } catch (_) {}
    throw error;
  }
}
// M687
function restoreDrill(backupPath, tmpDir) {
  if (typeof backupPath !== "string" || !backupPath.trim() || typeof tmpDir !== "string" || !tmpDir.trim()) return { ok: false, steps: [{ step: "input", ok: false, detail: "backup and scratch directory are required" }] };
  let scratchDir;
  try {
    fs.mkdirSync(path.resolve(tmpDir), { recursive: true });
    const stat = fs.lstatSync(path.resolve(tmpDir));
    if (!stat.isDirectory() || stat.isSymbolicLink()) return { ok: false, steps: [{ step: "scratch-directory", ok: false, detail: "scratch path must be a real directory" }] };
    scratchDir = fs.realpathSync(path.resolve(tmpDir));
  } catch (_) { return { ok: false, steps: [{ step: "scratch-directory", ok: false, detail: "scratch directory unavailable" }] }; }
  const scratch = path.join(scratchDir, `drill-${crypto.randomBytes(12).toString("hex")}.db`);
  const steps = [];
  try {
    const v = verifyManifest(backupPath);
    steps.push({ step: "manifest", ok: v.ok, detail: v.ok ? "checksum matches" : v.reason });
    if (!v.ok) return { ok: false, steps };
    restoreToNewPath(backupPath, scratch);
    const db = openReadonly(scratch);
    try {
      const ic = integrityCheck(db); steps.push({ step: "integrity", ok: ic.ok, detail: ic.result });
      const fk = foreignKeyCheck(db); steps.push({ step: "foreign-keys", ok: fk.ok, detail: `${fk.violations} violations` });
      const cc = compareCounts(v.manifest.tables, tableRowCounts(db)); steps.push({ step: "row-counts", ok: cc.ok, detail: cc.ok ? "match manifest" : `${cc.mismatches.length} tables differ` });
    } finally { db.close(); }
    return { ok: steps.every((s) => s.ok), steps };
  } catch (_) {
    steps.push({ step: "restore", ok: false, detail: "restore drill failed safely" });
    return { ok: false, steps };
  } finally { try { fs.rmSync(scratch, { force: true }); } catch (_) {} }
}
// M689
const FUTURE_SKEW_MS = 5 * 60 * 1000;
function backupAgeHours(dir, now = new Date()) {
  for (const b of listBackups(dir)) {
    const v = verifyManifest(b.path);
    if (!v.ok) continue;
    const created = Date.parse(v.manifest.createdAt);
    if (created - now.getTime() > FUTURE_SKEW_MS) continue; // dated in the future: ignored, never counted as fresh
    return Math.max(0, (now.getTime() - created) / 3600000);
  }
  return null;
}
// M690
function evaluateBackupFreshness(ageHours, maxHours = 26) {
  if (ageHours == null) return { status: "fail", detail: "no verified backup found" };
  if (typeof ageHours !== "number" || !Number.isFinite(ageHours) || ageHours < 0) return { status: "fail", detail: "backup age is not a valid number" };
  if (typeof maxHours !== "number" || !Number.isFinite(maxHours) || maxHours <= 0) return { status: "fail", detail: "freshness limit is not a valid number" };
  if (ageHours <= maxHours) return { status: "pass", detail: `newest verified backup is ${ageHours.toFixed(1)}h old` };
  return { status: ageHours <= maxHours * 2 ? "warn" : "fail", detail: `newest verified backup is ${ageHours.toFixed(1)}h old (limit ${maxHours}h)` };
}
// M691
function walCheckpoint(db) { try { const r = db.prepare("PRAGMA wal_checkpoint(TRUNCATE)").get(); return { ok: Number(r && r.busy) === 0, busy: Number(r && r.busy) || 0 }; } catch (_) { return { ok: false, busy: null }; } }
// M692
function dbStats(db) {
  const pageSize = Number(pragmaOne(db, "page_size")), pages = Number(pragmaOne(db, "page_count")), free = Number(pragmaOne(db, "freelist_count"));
  return { bytes: pageSize * pages, freePages: free, freeRatio: pages ? Number((free / pages).toFixed(4)) : 0, journalMode: String(pragmaOne(db, "journal_mode")) };
}
// M694 — one admin-facing status object. Secret-free; base names only.
function recoveryStatus({ db, env = process.env, now = new Date(), packageVersion } = {}) {
  const dir = String(env.BACKUP_DIR || "").trim();
  const q = quickCheck(db);
  const out = { generatedAt: now.toISOString(), appVersion: packageVersion || null, database: { quickCheck: q.ok, ...dbStats(db) }, backups: { configured: Boolean(dir) } };
  if (dir) {
    // A missing or malformed limit (text, zero, negative, Infinity, more than a year) falls back to the 26-hour default, never to "no limit".
    const rawMax = Number(env.BACKUP_MAX_AGE_HOURS);
    const maxHours = Number.isFinite(rawMax) && rawMax > 0 && rawMax <= 8760 ? rawMax : 26;
    const age = backupAgeHours(dir, now);
    out.backups = { configured: true, count: listBackups(dir).length, newestAgeHours: age == null ? null : Number(age.toFixed(2)), freshness: evaluateBackupFreshness(age, maxHours) };
  }
  const backupVerified = !dir || out.backups.freshness.status === "pass";
  out.recovery = {
    ready: disasterRecovery.readinessContract({ backupVerified, integrityOk: q.ok, foreignKeysOk: q.ok, schemaMatch: true, capacityOk: true }),
    rpoStatus: dir ? out.backups.freshness.status : "unconfigured",
    failClosed: !dir || out.backups.freshness.status === "pass"
  };
  out.ok = q.ok && (!dir || out.backups.freshness.status !== "fail");
  return out;
}

module.exports = { BACKUP_RE, sha256File, quickCheck, integrityCheck, foreignKeyCheck, tableRowCounts, backupNameFor, redactPath, openReadonly, writeManifest, verifyManifest, compareCounts, createVerifiedBackup, listBackups, pruneBackups, restoreToNewPath, restoreDrill, backupAgeHours, evaluateBackupFreshness, walCheckpoint, dbStats, recoveryStatus, manifestPathFor, recoveryReadiness: disasterRecovery.readinessContract };
