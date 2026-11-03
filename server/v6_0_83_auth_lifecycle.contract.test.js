"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const root = path.join(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("Block 03 server routes cover verification, recovery, password change and security history", () => {
  const source = read("server/index.js");
  for (const route of [
    '/api/auth/email-verification/request', '/api/auth/email-verification/confirm',
    '/api/auth/password-reset/request', '/api/auth/password-reset/confirm',
    '/api/auth/password/change', '/api/auth/security-events'
  ]) assert.ok(source.includes(route), `missing route ${route}`);
  assert.match(source, /authActionLimiter/);
  assert.match(source, /auth\.authMiddleware, authActionLimiter/);
});

test("Block 03 token storage keeps only hashes and defines purpose-specific expiry", () => {
  const db = read("server/db.js"), lifecycle = read("server/authLifecycle.js");
  assert.match(db, /CREATE TABLE IF NOT EXISTS auth_action_tokens/);
  assert.match(db, /tokenHash TEXT NOT NULL UNIQUE/);
  assert.match(lifecycle, /crypto\.randomBytes\(32\)\.toString\("base64url"\)/);
  assert.match(lifecycle, /verify_email: 24 \* 60 \* 60 \* 1000/);
  assert.match(lifecycle, /password_reset: 30 \* 60 \* 1000/);
  assert.match(lifecycle, /consumedAt IS NULL AND expiresAt>\?/);
  assert.match(lifecycle, /UPDATE auth_action_tokens SET consumedAt=\?/);
});

test("Block 03 reset and password-change flows revoke all active sessions", () => {
  const lifecycle = read("server/authLifecycle.js");
  assert.match(lifecycle, /revocationReason='password_reset' WHERE userId=\? AND revokedAt IS NULL/);
  assert.match(lifecycle, /revocationReason='password_changed' WHERE userId=\? AND revokedAt IS NULL/);
  assert.match(lifecycle, /Current password is incorrect/);
  assert.match(lifecycle, /Choose a password you have not used/);
});

test("Block 03 login anomaly events use hashed email, IP and user-agent context", () => {
  const lifecycle = read("server/authLifecycle.js"), auth = read("server/auth.js");
  assert.match(lifecycle, /emailHash = hash\(cleanEmail\(email\)\)/);
  assert.match(lifecycle, /policy\.hashIp\(ip\)/);
  assert.match(lifecycle, /policy\.hashUserAgent\(userAgent\)/);
  assert.match(lifecycle, /failedAttempts15m/);
  assert.match(auth, /recordLoginAttempt/);
});

test("Block 03 mobile UI exposes recovery, verification, password change and security history", () => {
  const login = read("src/app/auth/login.tsx"), recovery = read("src/app/auth/recover.tsx"), verify = read("src/app/auth/verify-email.tsx"), profile = read("src/app/(tabs)/profile.tsx"), api = read("src/api.ts");
  assert.match(login, /Forgot password\?/);
  assert.match(login, /Verify or resend email verification/);
  assert.match(recovery, /confirmPasswordReset/);
  assert.match(verify, /confirmEmailVerification/);
  assert.match(profile, /Confirm password change/);
  assert.match(profile, /Recent security activity/);
  assert.match(api, /getAuthSecurityEvents/);
});


test("Block 03 login lockout policy is source-scoped and cannot lock a victim across networks", () => {
  const source = read("server/index.js");
  assert.match(source, /scope: "login-email",[\s\S]*windowMs: 15 \* 60 \* 1000, max: 10,[\s\S]*keyFn: \(req\) => "login:" \+ loginEmailKey\(req\) \+ "\|" \+ req\.ip/);
  assert.match(source, /scope: "login-account",[\s\S]*windowMs: 15 \* 60 \* 1000, max: 200,[\s\S]*keyFn: \(req\) => "login-flood:" \+ loginEmailKey\(req\)/);
  assert.match(source, /the tight cap is keyed by email AND IP/);
});

test("Block 03 identity state remains server-authoritative across modules", () => {
  const auth = read("server/auth.js"), lifecycle = read("server/accountLifecycle.js"), boundary = read("APP_SEPARATION.md");
  assert.match(auth, /SELECT s\.\*,u\.\* FROM sessions s JOIN users u ON u\.id=s\.userId/);
  assert.match(auth, /row\.accountStatus === "suspended"/);
  assert.match(auth, /row\.accountStatus === "closed"/);
  assert.match(lifecycle, /accountStatus !== "active"/);
  assert.match(boundary, /server remains the shared authority used by both applications/i);
});
