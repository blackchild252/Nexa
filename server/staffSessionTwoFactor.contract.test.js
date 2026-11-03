"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs"), path = require("path");
const read = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");

test("M7772 sessions get a separate twoFactorVerifiedAt column", () => {
  const db = read("db.js");
  assert.match(db, /ALTER TABLE sessions ADD COLUMN twoFactorVerifiedAt TEXT/);
  assert.match(db, /ALTER TABLE sessions ADD COLUMN adminVerifiedAt TEXT/);
});
test("M7772 the request user carries twoFactorVerified from the session row, and rotation keeps the mark", () => {
  const a = read("auth.js");
  assert.match(a, /twoFactorVerified:!!row\.twoFactorVerifiedAt/);
  assert.match(a, /if\(old\.twoFactorVerifiedAt\) db\.prepare\("UPDATE sessions SET twoFactorVerifiedAt=\? WHERE token=\?"\)\.run\(old\.twoFactorVerifiedAt,nextHash\)/);
});
test("M7772 the setter only marks a live session by its own token", () => {
  const a = read("auth.js");
  assert.match(a, /function markSessionTwoFactorVerified\(token/);
  assert.match(a, /WHERE token=\? AND revokedAt IS NULL"\)\.run\(now\.toISOString\(\),hashToken\(token\)\)\.changes===1/);
  assert.match(a, /module\.exports=\{markSessionTwoFactorVerified,/);
});
test("M7772 privileged code never reads the staff 2FA mark, so it cannot make a session look like admin", () => {
  for (const f of ["adminAccess.js", "mallAdmin.js", "adminStaffWork.js", "customerCare.js"]) assert.doesNotMatch(read(f), /twoFactorVerified/, f);
  assert.doesNotMatch(read("auth.js"), /adminVerifiedAt\s*=\s*[^=]*twoFactor/);
});
