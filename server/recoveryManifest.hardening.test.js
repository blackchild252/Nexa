"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const R = require("./recoveryOps");

function fixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "nexa-manifest-"));
  const file = path.join(dir, "nexa-20261011-120000.db");
  fs.writeFileSync(file, "sqlite-backup-fixture");
  const stat = fs.statSync(file);
  const crypto = require("node:crypto");
  const manifest = { file: path.basename(file), bytes: stat.size, sha256: crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex"), createdAt: "2026-10-11T12:00:00.000Z", appVersion: "6.1.64", tables: { users: 2 } };
  fs.writeFileSync(R.manifestPathFor(file), JSON.stringify(manifest));
  return { dir, file, manifest };
}
function replaceManifest(f, patch) { fs.writeFileSync(R.manifestPathFor(f.file), JSON.stringify({ ...f.manifest, ...patch })); }

test("valid manifest is verified and only safe metadata is returned", () => {
  const f = fixture(); const r = R.verifyManifest(f.file);
  assert.equal(r.ok, true); assert.equal(r.manifest.file, path.basename(f.file)); assert.deepEqual(r.manifest.tables, { users: 2 });
});
test("manifest JSON must parse and be an object", () => {
  const f = fixture(); fs.writeFileSync(R.manifestPathFor(f.file), "{"); assert.equal(R.verifyManifest(f.file).reason, "manifest unreadable");
  fs.writeFileSync(R.manifestPathFor(f.file), "[]"); assert.equal(R.verifyManifest(f.file).reason, "manifest schema invalid");
});
test("manifest filename must match backup basename and safe naming policy", () => {
  const f = fixture(); replaceManifest(f, { file: "../private.db" }); assert.equal(R.verifyManifest(f.file).reason, "manifest filename invalid");
  replaceManifest(f, { file: "nexa-20261011-120001.db" }); assert.equal(R.verifyManifest(f.file).reason, "manifest filename invalid");
});
test("manifest size must be a positive safe integer under the configured maximum", () => {
  const f = fixture(); for (const bytes of ["21", -1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1, R.recoveryReadiness ? 3 * 1024 * 1024 * 1024 : 0]) {
    replaceManifest(f, { bytes }); assert.equal(R.verifyManifest(f.file).ok, false, `accepted bytes ${bytes}`);
  }
});
test("manifest checksum must be lowercase hexadecimal SHA-256", () => {
  const f = fixture(); for (const sha256 of ["", "x".repeat(64), "A".repeat(64), "a".repeat(63)]) { replaceManifest(f, { sha256 }); assert.equal(R.verifyManifest(f.file).ok, false); }
});
test("manifest creation time must be parseable", () => {
  const f = fixture(); replaceManifest(f, { createdAt: "not-a-date" }); assert.equal(R.verifyManifest(f.file).reason, "manifest timestamp invalid");
  replaceManifest(f, { createdAt: 1700000000000 }); assert.equal(R.verifyManifest(f.file).reason, "manifest timestamp invalid");
});
test("manifest table counts reject arrays, non-objects, negative and unsafe values", () => {
  const f = fixture(); for (const tables of [[], "users", { users: -1 }, { users: 1.2 }, { users: Number.MAX_SAFE_INTEGER + 1 }, { ["x".repeat(201)]: 1 }]) {
    replaceManifest(f, { tables }); assert.equal(R.verifyManifest(f.file).reason, "manifest table counts invalid");
  }
});
test("manifest app version is optional but bounded text when present", () => {
  const f = fixture(); replaceManifest(f, { appVersion: 123 }); assert.equal(R.verifyManifest(f.file).reason, "manifest version invalid");
  replaceManifest(f, { appVersion: "x".repeat(41) }); assert.equal(R.verifyManifest(f.file).reason, "manifest version invalid");
  replaceManifest(f, { appVersion: null }); assert.equal(R.verifyManifest(f.file).ok, true);
});
test("manifest byte mismatch and checksum mismatch fail with generic reasons", () => {
  const f = fixture(); replaceManifest(f, { bytes: f.manifest.bytes + 1 }); assert.equal(R.verifyManifest(f.file).reason, "size mismatch");
  replaceManifest(f, { bytes: f.manifest.bytes, sha256: "a".repeat(64) }); assert.equal(R.verifyManifest(f.file).reason, "checksum mismatch");
});
test("directory artifacts are rejected and missing artifacts stay generic", () => {
  const f = fixture(); const d = path.join(f.dir, "nexa-20261011-120001.db"); fs.mkdirSync(d); fs.writeFileSync(R.manifestPathFor(d), "{}");
  assert.equal(R.verifyManifest(d).reason, "backup is not a regular file"); assert.equal(R.verifyManifest(path.join(f.dir, "missing.db")).reason, "backup file missing");
});
test("restore refuses malformed manifests without creating a destination", () => {
  const f = fixture(); replaceManifest(f, { sha256: "broken" }); const target = path.join(f.dir, "restore.db");
  assert.throws(() => R.restoreToNewPath(f.file, target), /Refusing to restore/); assert.equal(fs.existsSync(target), false);
});
