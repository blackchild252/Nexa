"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const read = (file) => fs.readFileSync(require("node:path").join(__dirname, "..", file), "utf8");

test("Admin Security Center registers MFA, sessions, login history, passkeys and emergency logout", () => {
  const source = read("server/adminSecurityCenter.js");
  for (const route of ["/api/auth/admin-mfa/verify", "/api/admin/security/overview", "/api/admin/security/login-history", "/api/admin/security/mfa/setup", "/api/admin/security/mfa/enable", "/api/admin/security/mfa/disable", "/api/admin/security/reauth", "/api/admin/security/sessions/:sessionId", "/api/admin/security/emergency-logout", "/api/admin/security/audit", "/api/admin/security/passkeys", "/api/admin/security/passkeys/register/options", "/api/admin/security/passkeys/register/verify", "/api/admin/security/passkeys/:credentialId", "/api/auth/admin-passkey/options", "/api/auth/admin-passkey/verify"]) assert.ok(source.includes(route), `missing ${route}`);
  assert.match(source, /AES-256-GCM|aes-256-gcm/);
  assert.match(source, /consumedAt IS NULL AND expiresAt>\?/);
  assert.match(source, /attempts<5/);
});

test("Admin login can stop before session creation and require a one-time MFA challenge", () => {
  const auth = read("server/auth.js"), routes = read("server/index.js");
  assert.match(auth, /options\.beforeSession/);
  assert.match(auth, /if\(challenge\) return challenge/);
  assert.match(routes, /beforeSession: \(user, context\) => adminSecurityCenter\?\.createLoginChallenge/);
  assert.match(routes, /if \(result\?\.mfaRequired\) \{/);
  assert.match(routes, /if \(adminAppClient\) return res\.json\(result\)/);
});

test("Privileged Admin mutations require a short-lived action-bound step-up grant", () => {
  const access = read("server/adminAccess.js"), security = read("server/adminSecurityCenter.js");
  assert.match(access, /STEP_UP_REQUIRED/);
  assert.match(security, /req\.session\.sessionId, action/);
  assert.match(security, /UPDATE admin_security_step_up SET consumedAt/);
  assert.match(security, /admin_role_change/);
  assert.match(security, /verification_decision/);
  assert.match(security, /financial_action/);
  assert.match(security, /\["POST", "PATCH", "DELETE"\]/);
  assert.match(security, /privileged_staff_action/);
});

test("MFA secrets are encrypted and WebAuthn registration/authentication enforce origin, RP and signatures", () => {
  const security = read("server/adminSecurityCenter.js"), webauthn = read("server/webauthn.js");
  assert.match(security, /secretCiphertext/);
  assert.match(security, /secretIv/);
  assert.match(security, /secretTag/);
  assert.match(security, /WEBAUTHN_AUTHENTICATION_FAILED/);
  assert.match(webauthn, /verifyAssertionSignature/);
  assert.match(webauthn, /verifyRpHash/);
  assert.match(webauthn, /Only WebAuthn 'none' attestation is accepted/);
  assert.match(security, /counter_anomaly/);
});


test("Admin password-reset audit identity is internal-only and never serialized to the user", () => {
  const lifecycle = read("server/authLifecycle.js"), routes = read("server/index.js");
  assert.match(lifecycle, /Object\.defineProperty\(result, "securityAuditUserId", \{ value: token\.userId, enumerable: false \}\)/);
  assert.match(routes, /const \{ securityAuditUserId, \.\.\.publicResult \} = result/);
});


test("M7123 emergency logout revokes every active account session and clears all step-up grants", () => {
  const security = read("server/adminSecurityCenter.js");
  const route = security.slice(security.indexOf('app.post("/api/admin/security/emergency-logout"'), security.indexOf('app.get("/api/admin/security/audit"'));
  assert.match(route, /UPDATE sessions SET revokedAt=\?,revocationReason='admin_emergency_logout' WHERE userId=\? AND revokedAt IS NULL/);
  assert.match(route, /DELETE FROM admin_security_step_up WHERE userId=\?/);
  assert.match(route, /admin\.audit\(req, "admin_emergency_logout"/);
  assert.match(route, /emitEvent\(req\.user\.id, "admin_emergency_logout", "warning"\)/);
  assert.match(route, /signedOut: true/);
});
