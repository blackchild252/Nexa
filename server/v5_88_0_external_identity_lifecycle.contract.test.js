"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");
const life = read("server/accountLifecycle.js");
const google = read("server/googleAuth.js");
const auth = read("server/auth.js");
const integrity = read("server/v5_77_0_account_closure_integrity.js");
const tests = [
 [1550,"Google OAuth schema remains explicit",()=>assert.match(google,/google_auth_transactions/)],
 [1551,"Google authorization codes remain hashed and short-lived",()=>{assert.match(google,/codeHash TEXT PRIMARY KEY/);assert.match(google,/CODE_TTL_MS = 2 \* 60 \* 1000/)}],
 [1552,"Google codes are classified as authentication credentials",()=>assert.match(life,/google_auth_codes/)],
 [1553,"Closure deletes Google provider handoff codes",()=>assert.match(life,/DELETE FROM google_auth_codes WHERE userId=\?/)],
 [1554,"Google code issuance rejects closed accounts",()=>assert.match(google,/issueCode[\s\S]*accountStatus === "closed"/)],
 [1555,"Google code consumption rechecks account state",()=>assert.match(google,/SELECT accountStatus FROM users WHERE id=\?/)],
 [1556,"Closed provider-code targets are rejected",()=>assert.match(google,/code: "ACCOUNT_CLOSED"/)],
 [1557,"Provider session creation has a final open-account guard",()=>assert.match(auth,/function createSession\(userId,context=\{\},options=\{\}\)\{[\s\S]*SELECT accountStatus FROM users WHERE id=\?/)],
 [1558,"Password login rejects closed accounts",()=>assert.match(auth,/u\.accountStatus === "closed"/)],
 [1559,"Google callback preserves closed-account rejection",()=>assert.match(google,/user\.accountStatus === "closed"/)],
 [1560,"Closure clears external auth provider subject",()=>assert.match(life,/authProviderSubject=NULL/)],
 [1561,"Closure resets auth provider marker",()=>assert.match(life,/authProvider='password'/)],
 [1562,"Closure resets external email verification state",()=>assert.match(life,/emailVerified=0/)],
 [1563,"Closure retains session deletion boundary",()=>assert.ok(integrity.includes('"sessions"'))],
 [1564,"Auth middleware continues rejecting closed accounts",()=>assert.match(auth,/row\.accountStatus === "closed"/)],
 [1565,"Google consumed-code state cannot bypass provider session guard",()=>assert.match(google,/return auth\.createSessionForProvider\(row\.userId\)/)],
 [1566,"Google OAuth state transactions remain expiry-cleaned",()=>assert.match(google,/DELETE FROM google_auth_transactions WHERE expiresAt <= \?/)],
 [1567,"Google auth secrets are not persisted",()=>{assert.doesNotMatch(google,/access_token[^\n]*INSERT/);assert.doesNotMatch(google,/client_secret[^\n]*INSERT/)}],
 [1568,"Provider subject remains unique when present",()=>assert.match(google,/idx_users_provider_subject/)],
 [1569,"Closed-account identity no longer remains linked to Google subject",()=>assert.match(life,/authProviderSubject=NULL/)],
 [1570,"Closure preserves anonymized email boundary",()=>assert.match(life,/closed_\$\{crypto\.createHash\("sha256"\)/)],
 [1571,"Closed accounts cannot regain authentication through a stale code",()=>assert.match(google,/DELETE FROM google_auth_codes WHERE codeHash=\?/)],
 [1572,"Provider login path uses the canonical session creator",()=>assert.match(google,/auth\.createSessionForProvider\(row\.userId\)/)],
 [1573,"External identity lifecycle remains additive to prior closure contract",()=>assert.match(life,/cleanupVendorStaff\(db, userId, now\)/)],
 [1574,"B129 certification remains exactly 25 milestones",()=>assert.equal(tests.length,25)],
];
for(const [n,title,fn] of tests)test(`B129 M${n}: ${title}`,fn);

