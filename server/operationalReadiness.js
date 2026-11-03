"use strict";

const fs = require("node:fs");
const path = require("node:path");
const criticalControls = require("./criticalControls");
const launchIntegrity = require("./v5_61_0_major_launch_integrity");

const REQUIRED_TABLES = [
  "users", "sessions", "ai_voice_preferences", "notifications", "mall_products", "mall_orders",
  "extensions", "extension_consents", "extension_audit_log", "platform_event_log"
];

function inspectDatabase(db) {
  const missing = REQUIRED_TABLES.filter((name) => {
    const row = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name=?").get(name);
    return !row;
  });
  return { ok: missing.length === 0, missing };
}

function inspectRuntime({ db, env = process.env, packageVersion }) {
  const dbCheck = inspectDatabase(db);
  const issues = [];
  if (!dbCheck.ok) issues.push(`missing database tables: ${dbCheck.missing.join(", ")}`);
  if (!packageVersion) issues.push("missing package version");
  if (!env.DB_PATH) issues.push("DB_PATH is not explicitly configured; persistent deployments should set it");
  return { ok: issues.length === 0, issues, db: dbCheck, version: packageVersion || null };
}

function createBackup(db, destination) {
  const target = path.resolve(destination);
  const source = db.name ? path.resolve(db.name) : "";
  if (source) { const boundary = launchIntegrity.backupDestination(source, target); if (!boundary.ok) throw new Error("Backup destination must be separate from the active database."); }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.existsSync(target)) throw new Error("Backup destination already exists.");
  db.prepare("VACUUM INTO ?").run(target);
  return { path: target, bytes: fs.statSync(target).size };
}

function verifyBackup(Database, backupPath) {
  const target = path.resolve(backupPath);
  if (!fs.existsSync(target)) throw new Error("Backup file does not exist.");
  const backupDb = new Database(target, { readonly: true, fileMustExist: true });
  try {
    const integrity = backupDb.pragma("integrity_check", { simple: true });
    const tables = inspectDatabase(backupDb);
    return { ok: integrity === "ok" && tables.ok, integrity, db: tables };
  } finally {
    backupDb.close();
  }
}

function inspectDiagnostics({ db, env = process.env, packageVersion }) {
  const checks = [];
  const tables = inspectDatabase(db);
  checks.push({ name: "schema", ok: tables.ok, detail: tables.ok ? "required tables present" : `missing: ${tables.missing.join(", ")}` });
  const integrity = criticalControls.databaseIntegrity(db);
  checks.push({ name: "database-integrity", ok: integrity.ok, detail: integrity.ok ? "SQLite integrity and foreign-key checks passed" : "database integrity checks failed" });
  const dbPath = String(env.DB_PATH || "").trim();
  checks.push({ name: "persistent-db", ok: Boolean(dbPath), detail: dbPath ? "DB_PATH configured" : "DB_PATH not configured" });
  checks.push({ name: "release-version", ok: /^\d+\.\d+\.\d+$/.test(String(packageVersion || "")), detail: packageVersion || "missing" });
  let journal = null;
  try { journal = db.pragma("journal_mode", { simple: true }); } catch (_) {}
  checks.push({ name: "sqlite-journal", ok: journal === "wal", detail: journal || "unavailable" });
  return { ok: checks.every((c) => c.ok), checks };
}

function diagnosticSummary(input) {
  const result = inspectDiagnostics(input);
  return { ok: result.ok, failedChecks: result.checks.filter((c) => !c.ok).map((c) => c.name), checks: result.checks };
}

module.exports = { REQUIRED_TABLES, inspectDatabase, inspectRuntime, inspectDiagnostics, diagnosticSummary, createBackup, verifyBackup };
