"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DatabaseSync } = require("node:sqlite");
const R = require("./recoveryOps");
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), "nexa-recovery-b513-"));
function validBackup(root) {
  const dbPath = path.join(root, "live.db");
  const db = new DatabaseSync(dbPath);
  db.exec("CREATE TABLE sample(id INTEGER PRIMARY KEY, label TEXT); INSERT INTO sample(label) VALUES ('fixture');");
  const result = R.createVerifiedBackup(db, path.join(root, "backups"), { packageVersion: "test" });
  db.close();
  return path.join(root, "backups", result.file);
}

test("restoreToNewPath validates the copied bytes and reports only the basename", () => {
  const root = temp(), backup = validBackup(root), target = path.join(root, "restore", "safe.db");
  const result = R.restoreToNewPath(backup, target);
  assert.deepEqual(result, { file: "safe.db", bytes: fs.statSync(target).size });
  assert.ok(!JSON.stringify(result).includes(root));
});

test("restore drill rejects empty paths without touching the filesystem", () => {
  assert.deepEqual(R.restoreDrill("", "/tmp/nexa-unused"), { ok: false, steps: [{ step: "input", ok: false, detail: "backup and scratch directory are required" }] });
});

test("restore drill rejects a symlink scratch directory and leaves its target intact", (t) => {
  const root = temp(), backup = validBackup(root), real = path.join(root, "real"), link = path.join(root, "link");
  fs.mkdirSync(real);
  try { fs.symlinkSync(real, link, "dir"); } catch (error) { if (error.code === "EPERM" || error.code === "EACCES") return t.skip("symlink creation unavailable on this platform"); throw error; }
  const result = R.restoreDrill(backup, link);
  assert.equal(result.ok, false);
  assert.equal(result.steps[0].step, "scratch-directory");
  assert.deepEqual(fs.readdirSync(real), []);
});

test("failed exclusive restore never removes a target created before the call", () => {
  const root = temp(), backup = validBackup(root), target = path.join(root, "already.db");
  fs.writeFileSync(target, "keep-existing");
  assert.throws(() => R.restoreToNewPath(backup, target), /already exists/);
  assert.equal(fs.readFileSync(target, "utf8"), "keep-existing");
});
