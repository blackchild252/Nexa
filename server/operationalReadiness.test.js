"use strict";
const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { inspectDatabase, inspectRuntime, createBackup, verifyBackup, REQUIRED_TABLES } = require("./operationalReadiness");

test("operational readiness detects missing schema instead of reporting false readiness", () => {
  const tables = new Set(["users"]);
  const db = { prepare() { return { get: (name) => tables.has(name) ? { name } : undefined }; } };
  const result = inspectDatabase(db);
  assert.equal(result.ok, false);
  assert.ok(result.missing.includes("sessions"));
});

test("operational readiness requires explicit persistent DB configuration", () => {
  const tables = new Set(require("./operationalReadiness").REQUIRED_TABLES);
  const db = { prepare() { return { get: (name) => tables.has(name) ? { name } : undefined }; } };
  const result = inspectRuntime({ db, env: {}, packageVersion: "3.60.40" });
  assert.equal(result.ok, false);
  assert.match(result.issues.join(" | "), /DB_PATH/);
});

test("database backup refuses overwrite and uses an explicit destination", () => {
  const { createBackup } = require("./operationalReadiness");
  const db = { prepare() { return { run(target) { require("node:fs").writeFileSync(target, "snapshot"); } }; } };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexa-backup-"));
  const target = path.join(dir, "nexa.db");
  const result = createBackup(db, target);
  assert.equal(result.bytes, 8);
  assert.equal(fs.readFileSync(target, "utf8"), "snapshot");
  assert.throws(() => createBackup(db, target), /already exists/);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("operational diagnostics expose actionable bounded checks", () => {
  const tables = new Set(require("./operationalReadiness").REQUIRED_TABLES);
  const db = { prepare(sql) { return { get: (name) => sql.includes("quick_check") ? { quick_check: "ok" } : (tables.has(name) ? { name } : undefined), all: () => [] }; }, pragma() { return "wal"; } };
  const result = require("./operationalReadiness").diagnosticSummary({ db, env: { DB_PATH: "/data/nexa.db" }, packageVersion: "3.62.2" });
  assert.equal(result.ok, true);
  assert.deepEqual(result.failedChecks, []);
});


test("database backup verification checks SQLite integrity and required schema", () => {
  class FakeBackupDatabase {
    constructor(filePath, options) {
      assert.equal(fs.existsSync(filePath), true);
      assert.equal(options.readonly, true);
      assert.equal(options.fileMustExist, true);
    }
    pragma(name, options) {
      assert.equal(name, "integrity_check");
      assert.equal(options.simple, true);
      return "ok";
    }
    prepare(sql) {
      return { get: (name) => REQUIRED_TABLES.includes(name) ? { name } : undefined };
    }
    close() {}
  }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexa-backup-verify-"));
  const target = path.join(dir, "backup.db");
  fs.writeFileSync(target, "verified-backup");
  const result = verifyBackup(FakeBackupDatabase, target);
  assert.equal(result.ok, true);
  assert.equal(result.integrity, "ok");
  assert.deepEqual(result.db.missing, []);
  fs.rmSync(dir, { recursive: true, force: true });
});
