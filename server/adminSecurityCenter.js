"use strict";
const crypto = require("crypto");
const dbDefault = () => require("./db");
const authDefault = () => require("./auth");
const getAuthLifecycle = () => require("./authLifecycle");
const webauthn = require("./webauthn");

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const b32encode = (input) => {
  const bytes = Buffer.from(input); let bits = 0, value = 0, out = "";
  for (const byte of bytes) { value = (value << 8) | byte; bits += 8; while (bits >= 5) { out += BASE32[(value >>> (bits - 5)) & 31]; bits -= 5; } }
  if (bits) out += BASE32[(value << (5 - bits)) & 31];
  return out;
};
const b32decode = (input) => {
  const text = String(input || "").toUpperCase().replace(/=+$/g, "").replace(/[^A-Z2-7]/g, "");
  let bits = 0, value = 0; const out = [];
  for (const ch of text) { const n = BASE32.indexOf(ch); if (n < 0) continue; value = (value << 5) | n; bits += 5; if (bits >= 8) { out.push((value >>> (bits - 8)) & 255); bits -= 8; } }
  return Buffer.from(out);
};
function totp(secret, time = Date.now()) {
  const counter = Math.floor(Number(time) / 30000); const msg = Buffer.alloc(8); msg.writeBigUInt64BE(BigInt(counter));
  const digest = crypto.createHmac("sha1", b32decode(secret)).update(msg).digest(); const offset = digest[digest.length - 1] & 15;
  const n = (digest.readUInt32BE(offset) & 0x7fffffff) % 1000000; return String(n).padStart(6, "0");
}
function verifyTotp(secret, code, now = Date.now()) {
  const candidate = String(code || "").replace(/\s/g, ""); if (!/^\d{6}$/.test(candidate)) return false;
  let ok = false; for (const delta of [-30000, 0, 30000]) { const expected = totp(secret, now + delta); ok = crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(candidate)) || ok; }
  return ok;
}
function hash(value) { return crypto.createHash("sha256").update(String(value || "")).digest("hex"); }
function encryptionKey(env = process.env) {
  const source = env.NEXA_ADMIN_MFA_ENCRYPTION_KEY || env.NEXA_AUTH_ENCRYPTION_KEY || env.NEXA_TOKEN_SECRET || env.JWT_SECRET || env.SESSION_SECRET;
  if (!source || String(source).length < 32) throw Object.assign(new Error("Admin MFA encryption key is not configured. Set NEXA_ADMIN_MFA_ENCRYPTION_KEY to a random 32+ character server secret."), { status: 503, code: "MFA_ENCRYPTION_NOT_CONFIGURED" });
  return crypto.createHash("sha256").update(String(source)).update("\0nexa-admin-mfa-v1").digest();
}
function encryptSecret(secret, env) {
  const iv = crypto.randomBytes(12); const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(env), iv);
  const ciphertext = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64url"), iv: iv.toString("base64url"), tag: cipher.getAuthTag().toString("base64url") };
}
function decryptSecret(row, env) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(env), Buffer.from(row.secretIv, "base64url"));
  decipher.setAuthTag(Buffer.from(row.secretTag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(row.secretCiphertext, "base64url")), decipher.final()]).toString("utf8");
}
function cleanId(value) { return String(value || "").trim().slice(0, 160); }
function createAdminSecurityCenter({ db = dbDefault(), auth = authDefault(), admin, env = process.env, now = () => Date.now() } = {}) {
  if (!admin) throw new Error("Admin authority is required for Admin Security Center.");
  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_mfa_settings (
      userId TEXT PRIMARY KEY, secretCiphertext TEXT NOT NULL, secretIv TEXT NOT NULL, secretTag TEXT NOT NULL,
      enabledAt TEXT NOT NULL, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_mfa_setup (
      userId TEXT PRIMARY KEY, secretCiphertext TEXT NOT NULL, secretIv TEXT NOT NULL, secretTag TEXT NOT NULL,
      expiresAt TEXT NOT NULL, createdAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS admin_mfa_login_challenges (
      idHash TEXT PRIMARY KEY, userId TEXT NOT NULL, expiresAt TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
      ipHash TEXT, userAgentHash TEXT, codeHash TEXT, createdAt TEXT NOT NULL, consumedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_admin_mfa_challenge_expiry ON admin_mfa_login_challenges(expiresAt, consumedAt);
    CREATE TABLE IF NOT EXISTS admin_security_step_up (
      tokenHash TEXT PRIMARY KEY, userId TEXT NOT NULL, sessionId TEXT NOT NULL, action TEXT NOT NULL,
      createdAt TEXT NOT NULL, expiresAt TEXT NOT NULL, consumedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_admin_step_up_session ON admin_security_step_up(sessionId, expiresAt, consumedAt);
    CREATE TABLE IF NOT EXISTS admin_mfa_attempt_windows (
      userId TEXT NOT NULL, action TEXT NOT NULL, windowStartedAt TEXT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
      updatedAt TEXT NOT NULL, PRIMARY KEY(userId, action)
    );
    CREATE TABLE IF NOT EXISTS admin_passkey_credentials (
      credentialId TEXT PRIMARY KEY, userId TEXT NOT NULL, publicKey TEXT NOT NULL, algorithm INTEGER NOT NULL DEFAULT -7,
      counter INTEGER NOT NULL DEFAULT 0, transports TEXT NOT NULL DEFAULT '[]', createdAt TEXT NOT NULL, lastUsedAt TEXT
    );
    CREATE TABLE IF NOT EXISTS admin_webauthn_challenges (
      challengeHash TEXT PRIMARY KEY, userId TEXT NOT NULL, purpose TEXT NOT NULL, expiresAt TEXT NOT NULL,
      createdAt TEXT NOT NULL, consumedAt TEXT, ipHash TEXT, attempts INTEGER NOT NULL DEFAULT 0
    );
  `);
  const ensureColumn = (table, column, declaration) => { const cols = db.prepare(`PRAGMA table_info(${table})`).all(); if (!cols.some((c) => c.name === column)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${declaration}`); };
  ensureColumn("admin_passkey_credentials", "algorithm", "INTEGER NOT NULL DEFAULT -7");
  ensureColumn("admin_webauthn_challenges", "consumedAt", "TEXT");
  ensureColumn("admin_webauthn_challenges", "ipHash", "TEXT");
  ensureColumn("admin_webauthn_challenges", "attempts", "INTEGER NOT NULL DEFAULT 0");
  ensureColumn("admin_mfa_login_challenges", "codeHash", "TEXT");
  // The Main-owned Local Zeeza inbox stores short-lived one-time codes; retrieval is exposed only through an authenticated owner-scoped route.
  db.exec(`CREATE TABLE IF NOT EXISTS zeeza_login_secure_inbox (id TEXT PRIMARY KEY, eventId TEXT NOT NULL UNIQUE, userId TEXT NOT NULL, challengeId TEXT NOT NULL, category TEXT NOT NULL DEFAULT 'local' CHECK(category='local'), preview TEXT NOT NULL DEFAULT 'LORDGISTICS sign-in code', message TEXT NOT NULL, expiresAt TEXT NOT NULL, createdAt TEXT NOT NULL); CREATE INDEX IF NOT EXISTS idx_zeeza_login_inbox_user_expiry ON zeeza_login_secure_inbox(userId,expiresAt); CREATE TABLE IF NOT EXISTS zeeza_login_delivery_events (eventId TEXT PRIMARY KEY, deliveredAt TEXT NOT NULL);`);
  const nowIso = () => new Date(now()).toISOString();
  const role = (user) => admin.roleOf(user);
  const isAdmin = (user) => !!role(user);
  // V6.1.93 B539: active Admin staff get the same Zeeza sign-in code as admins. A missing table only means no staff exist yet.
  const isActiveStaff = (user) => { try { return !!db.prepare("SELECT 1 FROM admin_staff WHERE userId=? AND active=1").get(user?.id); } catch (e) { if (/no such table/i.test(String(e?.message))) return false; throw e; } };
  const mfaRow = (userId) => db.prepare("SELECT * FROM admin_mfa_settings WHERE userId=?").get(userId) || null;
  const emitEvent = (userId, action, severity = "info", metadata = {}) => {
    try { getAuthLifecycle().logSecurityEvent({ userId, action, severity, metadata }); } catch (_) {}
  };
  const fail = (res, status, message, code) => res.status(status).json({ error: message, ...(code ? { code } : {}) });
  const requireAdmin = (req, res) => { if (!isAdmin(req.user)) { fail(res, 403, "Administrator access required."); return false; } return true; };
  function createLoginChallenge(user, context = {}) {
    if (!isAdmin(user) && !isActiveStaff(user)) return null;
    const raw = crypto.randomBytes(32).toString("base64url"); const created = nowIso(); const expiresAt = new Date(now() + 5 * 60 * 1000).toISOString();
    let code = "";
    for (let i = 0; i < 100; i++) {
      const candidate = String(crypto.randomInt(0, 1000000)).padStart(6, "0"); const codeHash = hash(candidate);
      const used = db.prepare("SELECT idHash FROM admin_mfa_login_challenges WHERE codeHash=? AND expiresAt>? ").get(codeHash, created);
      if (!used) { code = candidate; break; }
    }
    if (!code) throw Object.assign(new Error("A fresh Zeeza sign-in code could not be generated."), { status: 503, code: "ZEEZA_CODE_UNAVAILABLE" });
    const idHash = hash(raw), codeHash = hash(code), inboxId = crypto.randomUUID(), eventId = `nexa-admin-login:${raw}`;
    const message = `Your NEXA Admin sign-in code is ${code}. It works once and expires in five minutes. Never share this code.`;
    db.transaction(() => {
      db.prepare("INSERT INTO admin_mfa_login_challenges(idHash,userId,expiresAt,attempts,ipHash,userAgentHash,codeHash,createdAt,consumedAt) VALUES(?,?,?,?,?,?,?,?,NULL)")
        .run(idHash, user.id, expiresAt, 0, hash(context.ip || ""), hash(context.userAgent || ""), codeHash, created);
      db.prepare("INSERT INTO zeeza_login_secure_inbox(id,eventId,userId,challengeId,category,preview,message,expiresAt,createdAt) VALUES(?,?,?,?,'local','NEXA Admin sign-in code',?,?,?)")
        .run(inboxId, eventId, user.id, raw, message, expiresAt, created);
    })();
    emitEvent(user.id, "admin_zeeza_login_code_issued", "info", { expiresInSeconds: 300 });
    return { mfaRequired: true, challengeId: raw, expiresInSeconds: 300, factor: "zeeza", delivery: "local_secure_inbox", userId: user.id };
  }
  function verifyLoginChallenge(challengeId, code, context = {}) {
    const raw = String(challengeId || ""); if (raw.length < 32 || raw.length > 128) throw Object.assign(new Error("The sign-in challenge is invalid or expired."), { status: 400, code: "MFA_CHALLENGE_INVALID" });
    const row = db.prepare("SELECT * FROM admin_mfa_login_challenges WHERE idHash=? AND consumedAt IS NULL AND expiresAt>? AND attempts<5").get(hash(raw), nowIso());
    if (!row) throw Object.assign(new Error("The sign-in challenge is invalid or expired."), { status: 400, code: "MFA_CHALLENGE_INVALID" });
    const candidate = typeof code === "string" ? code.trim() : "";
    const valid = /^\d{6}$/.test(candidate) && typeof row.codeHash === "string" && crypto.timingSafeEqual(Buffer.from(hash(candidate)), Buffer.from(row.codeHash));
    if (!valid) {
      db.prepare("UPDATE admin_mfa_login_challenges SET attempts=attempts+1 WHERE idHash=? AND consumedAt IS NULL").run(row.idHash);
      emitEvent(row.userId, "admin_zeeza_login_failed", "warning", { reason: "invalid_code" });
      throw Object.assign(new Error("The Zeeza inbox code is incorrect."), { status: 401, code: "MFA_CODE_INVALID" });
    }
    const changed = db.prepare("UPDATE admin_mfa_login_challenges SET consumedAt=? WHERE idHash=? AND consumedAt IS NULL AND expiresAt>? AND attempts<5").run(nowIso(), row.idHash, nowIso()).changes;
    if (changed !== 1) throw Object.assign(new Error("The sign-in challenge was already used."), { status: 409, code: "MFA_CHALLENGE_USED" });
    db.prepare("DELETE FROM zeeza_login_secure_inbox WHERE challengeId=?").run(raw);
    emitEvent(row.userId, "admin_zeeza_login_verified", "info", { deviceLabel: String(context.deviceLabel || "Admin web").slice(0, 80) });
    return row.userId;
  }
  function stepUpAction(req) {
    const p = String(req.path || ""); const method = String(req.method || "GET").toUpperCase();
    if (method === "GET" || method === "HEAD") return null;
    if (method === "POST" && (/^\/api\/admin\/admins$/.test(p) || /^\/api\/admin\/staff$/.test(p))) return "admin_account_create";
    if ((method === "DELETE" && /^\/api\/admin\/admins\/[^/]+$/.test(p)) || (method === "POST" && /^\/api\/admin\/staff\/[^/]+\/deactivate$/.test(p))) return "admin_role_change";
    if (method === "POST" && /^\/api\/admin\/verification\/[^/]+\/decision$/.test(p)) return "verification_decision";
    if (["POST", "PATCH"].includes(method) && (/\/payments\/.*(review|decision|refund|withdraw|resolve)/i.test(p) || /\/disputes\/.*resolve/i.test(p) || /\/subscriptions\/.*decision/i.test(p))) return "financial_action";
    if ((method === "DELETE" && /^\/api\/admin\/(users|vendors)\/[^/]+$/.test(p)) || (method === "POST" && /^\/api\/admin\/(users|vendors)\/[^/]+\/(suspend|unsuspend)$/.test(p))) return "account_deactivation";
    if (["POST", "PATCH", "DELETE"].includes(method) && /(moderation|reports|violations|takedown|restore|advert.*decision|youtube.*decision|gyms.*review|shops.*decision|lifestyle\/reports|mall\/admin\/(review-reports|reviews)|admin\/ai\/(training|profiles))/i.test(p)) return "moderation_decision";
    if (method === "POST" && /^\/api\/admin\/staff\/work(?:\/.*)?$/.test(p)) return "privileged_staff_action";
    return null;
  }
  function requiresMfa(userId) { return !!mfaRow(userId); }
  function assertMfaAttemptAllowed(userId, action) {
    const since = new Date(now() - 15 * 60 * 1000).toISOString();
    const row = db.prepare("SELECT attempts,windowStartedAt FROM admin_mfa_attempt_windows WHERE userId=? AND action=?").get(userId, action);
    if (row && row.windowStartedAt >= since && Number(row.attempts) >= 10) throw Object.assign(new Error("Too many security-code attempts. Wait 15 minutes before trying again."), { status: 429, code: "MFA_RATE_LIMITED" });
  }
  function recordMfaFailure(userId, action) {
    const at = nowIso(); const since = new Date(now() - 15 * 60 * 1000).toISOString();
    const row = db.prepare("SELECT attempts,windowStartedAt FROM admin_mfa_attempt_windows WHERE userId=? AND action=?").get(userId, action);
    if (!row || row.windowStartedAt < since) db.prepare("INSERT INTO admin_mfa_attempt_windows(userId,action,windowStartedAt,attempts,updatedAt) VALUES(?,?,?,1,?) ON CONFLICT(userId,action) DO UPDATE SET windowStartedAt=excluded.windowStartedAt,attempts=1,updatedAt=excluded.updatedAt").run(userId, action, at, at);
    else db.prepare("UPDATE admin_mfa_attempt_windows SET attempts=attempts+1,updatedAt=? WHERE userId=? AND action=?").run(at, userId, action);
  }
  function clearMfaFailures(userId, action) { db.prepare("DELETE FROM admin_mfa_attempt_windows WHERE userId=? AND action=?").run(userId, action); }
  function validateStepUp(req, action) {
    const raw = String(req.headers["x-nexa-step-up"] || ""); if (raw.length < 32 || raw.length > 160) return false;
    const row = db.prepare("SELECT * FROM admin_security_step_up WHERE tokenHash=? AND userId=? AND sessionId=? AND action=? AND consumedAt IS NULL AND expiresAt>? ")
      .get(hash(raw), req.user.id, req.session.sessionId, action, nowIso());
    if (!row) return false;
    return db.prepare("UPDATE admin_security_step_up SET consumedAt=? WHERE tokenHash=? AND consumedAt IS NULL AND expiresAt>? ").run(nowIso(), row.tokenHash, nowIso()).changes === 1;
  }
  function auditCredentialChange(req, action, detail = "Administrator credential change.") {
    if (!req?.user || !isAdmin(req.user)) return false;
    try { req.adminRole = role(req.user); admin.audit(req, action, "admin_security", req.user.id, detail); return true; } catch (_) { return false; }
  }
  function register(app) {
    app.post("/api/auth/admin-mfa/verify", (req, res) => {
      try { const userId = verifyLoginChallenge(req.body?.challengeId, req.body?.code, { ip: req.ip, userAgent: req.headers["user-agent"], deviceLabel: req.headers["x-nexa-device-label"] }); const context = { deviceId: req.headers["x-nexa-device-id"], deviceLabel: req.headers["x-nexa-device-label"] || "NEXA Admin web", ip: req.ip || req.socket?.remoteAddress || "", userAgent: req.headers["user-agent"] || "" }; const session = auth.createSession(userId, context, { adminVerified: true }); res.json({ token: session.token, userId: session.user.id, user: session.user }); }
      catch (e) { fail(res, e.status || 400, e.message || "Admin verification failed.", e.code); }
    });
    app.get("/api/admin/security/overview", auth.authMiddleware, admin.require("security"), (req, res) => {
      const settings = mfaRow(req.user.id); const sessions = auth.listSessions(req.user.id, req.token);
      const passkeyCount = db.prepare("SELECT COUNT(*) AS count FROM admin_passkey_credentials WHERE userId=?").get(req.user.id).count;
      let passkeyConfigReady = true; try { webauthn.rpConfig(env); } catch (_) { passkeyConfigReady = false; }
      res.json({ mfa: { enabled: !!settings, enabledAt: settings?.enabledAt || null, method: "totp" }, passkeys: { supportedByBrowser: null, serverReady: passkeyConfigReady, registered: passkeyCount, status: passkeyConfigReady ? "enabled" : "needs_origin_config" }, sessions, generatedAt: nowIso() });
    });
    app.get("/api/admin/security/login-history", auth.authMiddleware, admin.require("security"), (req, res) => {
      const targetId = cleanId(req.query?.userId) || req.user.id;
      if (targetId !== req.user.id && role(req.user) !== "owner") return fail(res, 403, "Only the owner may inspect another administrator's login history.");
      if (targetId !== req.user.id && !admin.roleOf({ id: targetId })) return fail(res, 404, "Administrator not found.");
      const rows = db.prepare("SELECT success,createdAt,userAgentHash,ipHash FROM auth_login_attempts WHERE userId=? ORDER BY createdAt DESC LIMIT 50").all(targetId);
      res.json({ events: rows.map((r) => ({ success: !!r.success, createdAt: r.createdAt, deviceContext: r.userAgentHash ? "recorded" : "unknown", networkContext: r.ipHash ? "recorded" : "unknown" })) });
    });
    app.post("/api/admin/security/mfa/setup", auth.authMiddleware, admin.require("security"), (req, res) => {
      try {
        if (!isAdmin(req.user)) return fail(res, 403, "Administrator access required.");
        assertMfaAttemptAllowed(req.user.id, "setup_mfa");
        if (!auth.verifyPassword(req.user.id, req.body?.password)) { recordMfaFailure(req.user.id, "setup_mfa"); return fail(res, 401, "Current password is incorrect.", "CURRENT_PASSWORD_INVALID"); }
        const existingMfa = mfaRow(req.user.id); if (existingMfa && !verifyTotp(decryptSecret(existingMfa, env), req.body?.code, now())) { recordMfaFailure(req.user.id, "setup_mfa"); return fail(res, 401, "Authenticator code is incorrect.", "MFA_CODE_INVALID"); }
        clearMfaFailures(req.user.id, "setup_mfa");
        const secret = b32encode(crypto.randomBytes(20)); const encrypted = encryptSecret(secret, env); const createdAt = nowIso();
        db.prepare("INSERT INTO admin_mfa_setup(userId,secretCiphertext,secretIv,secretTag,expiresAt,createdAt) VALUES(?,?,?,?,?,?) ON CONFLICT(userId) DO UPDATE SET secretCiphertext=excluded.secretCiphertext,secretIv=excluded.secretIv,secretTag=excluded.secretTag,expiresAt=excluded.expiresAt,createdAt=excluded.createdAt")
          .run(req.user.id, encrypted.ciphertext, encrypted.iv, encrypted.tag, new Date(now() + 10 * 60 * 1000).toISOString(), createdAt);
        const issuer = encodeURIComponent("NEXA Admin"); const label = encodeURIComponent(req.user.email || req.user.id);
        res.json({ secret, otpauthUrl: `otpauth://totp/${issuer}:${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`, expiresInSeconds: 600 });
      } catch (e) { fail(res, e.status || 503, e.message || "MFA setup is not available.", e.code); }
    });
    app.post("/api/admin/security/mfa/enable", auth.authMiddleware, admin.require("security"), (req, res) => {
      try {
        assertMfaAttemptAllowed(req.user.id, "enable");
        const setup = db.prepare("SELECT * FROM admin_mfa_setup WHERE userId=? AND expiresAt>? ").get(req.user.id, nowIso());
        if (!setup || !verifyTotp(decryptSecret(setup, env), req.body?.code, now())) { recordMfaFailure(req.user.id, "enable"); return fail(res, 400, "Enter a current authenticator code to enable MFA.", "MFA_CODE_INVALID"); }
        clearMfaFailures(req.user.id, "enable");
        const at = nowIso(); db.prepare("INSERT INTO admin_mfa_settings(userId,secretCiphertext,secretIv,secretTag,enabledAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?) ON CONFLICT(userId) DO UPDATE SET secretCiphertext=excluded.secretCiphertext,secretIv=excluded.secretIv,secretTag=excluded.secretTag,enabledAt=excluded.enabledAt,updatedAt=excluded.updatedAt")
          .run(req.user.id, setup.secretCiphertext, setup.secretIv, setup.secretTag, at, setup.createdAt, at);
        db.prepare("DELETE FROM admin_mfa_setup WHERE userId=?").run(req.user.id); admin.audit(req, "admin_mfa_enabled", "admin_security", req.user.id, "TOTP multi-factor authentication enabled."); emitEvent(req.user.id, "admin_mfa_enabled"); res.json({ ok: true, enabled: true, enabledAt: at });
      } catch (e) { fail(res, e.status || 503, e.message || "MFA could not be enabled.", e.code); }
    });
    app.post("/api/admin/security/mfa/disable", auth.authMiddleware, admin.require("security"), (req, res) => {
      try {
        const settings = mfaRow(req.user.id); if (!settings) return fail(res, 409, "MFA is not enabled.");
        assertMfaAttemptAllowed(req.user.id, "disable");
        if (!auth.verifyPassword(req.user.id, req.body?.password)) { recordMfaFailure(req.user.id, "disable"); return fail(res, 401, "Current password is incorrect.", "CURRENT_PASSWORD_INVALID"); }
        if (!verifyTotp(decryptSecret(settings, env), req.body?.code, now())) { recordMfaFailure(req.user.id, "disable"); return fail(res, 401, "Authenticator code is incorrect.", "MFA_CODE_INVALID"); }
        clearMfaFailures(req.user.id, "disable");
        db.prepare("DELETE FROM admin_mfa_settings WHERE userId=?").run(req.user.id); db.prepare("DELETE FROM admin_security_step_up WHERE userId=?").run(req.user.id); admin.audit(req, "admin_mfa_disabled", "admin_security", req.user.id, "TOTP multi-factor authentication disabled after password and code verification."); emitEvent(req.user.id, "admin_mfa_disabled", "warning"); res.json({ ok: true, enabled: false });
      } catch (e) { fail(res, e.status || 503, e.message || "MFA could not be disabled.", e.code); }
    });
    app.post("/api/admin/security/reauth", auth.authMiddleware, admin.require("security"), async (req, res) => {
      try {
        assertMfaAttemptAllowed(req.user.id, "step_up");
        if (!auth.verifyPassword(req.user.id, req.body?.password)) { recordMfaFailure(req.user.id, "step_up"); return fail(res, 401, "Current password is incorrect.", "CURRENT_PASSWORD_INVALID"); }
        const settings = mfaRow(req.user.id);
        if (settings && !verifyTotp(decryptSecret(settings, env), req.body?.code, now())) { recordMfaFailure(req.user.id, "step_up"); return fail(res, 401, "Authenticator code is incorrect.", "MFA_CODE_INVALID"); }
        clearMfaFailures(req.user.id, "step_up");
        const raw = crypto.randomBytes(32).toString("base64url"); const at = nowIso();
        db.prepare("INSERT INTO admin_security_step_up(tokenHash,userId,sessionId,action,createdAt,expiresAt,consumedAt) VALUES(?,?,?,?,?,?,NULL)")
          .run(hash(raw), req.user.id, req.session.sessionId, String(req.body?.action || "admin_sensitive_action").slice(0, 80), at, new Date(now() + 5 * 60 * 1000).toISOString());
        admin.audit(req, "admin_step_up_verified", "admin_security", req.user.id, "Sensitive-action reauthentication passed."); emitEvent(req.user.id, "admin_step_up_verified"); res.json({ ok: true, stepUpToken: raw, expiresInSeconds: 300 });
      } catch (e) { fail(res, e.status || 503, e.message || "Reauthentication could not be completed.", e.code); }
    });
    app.delete("/api/admin/security/sessions/:sessionId", auth.authMiddleware, admin.require("security"), (req, res) => {
      const id = cleanId(req.params.sessionId); if (!id) return fail(res, 400, "A session identifier is required.");
      const changed = db.prepare("UPDATE sessions SET revokedAt=?,revocationReason='admin_session_revoked' WHERE userId=? AND sessionId=? AND revokedAt IS NULL AND expiresAt>? ").run(nowIso(), req.user.id, id, nowIso()).changes;
      if (!changed) return fail(res, 404, "That session is already gone or does not belong to this account.");
      admin.audit(req, "admin_session_revoked", "session", id, "Administrator revoked one of their active sessions."); emitEvent(req.user.id, "admin_session_revoked"); res.json({ ok: true, revoked: true, current: id === req.session.sessionId });
    });
    app.post("/api/admin/security/emergency-logout", auth.authMiddleware, admin.require("security"), (req, res) => {
      const revoked = db.prepare("UPDATE sessions SET revokedAt=?,revocationReason='admin_emergency_logout' WHERE userId=? AND revokedAt IS NULL").run(nowIso(), req.user.id).changes;
      db.prepare("DELETE FROM admin_security_step_up WHERE userId=?").run(req.user.id); admin.audit(req, "admin_emergency_logout", "session", req.user.id, `Emergency logout revoked ${revoked} session(s).`); emitEvent(req.user.id, "admin_emergency_logout", "warning"); res.json({ ok: true, revoked, signedOut: true });
    });
    app.get("/api/admin/security/audit", auth.authMiddleware, admin.require("security"), (req, res) => {
      if (role(req.user) !== "owner") return fail(res, 403, "Only the owner may review Admin security events.");
      const limit = Math.max(1, Math.min(100, Number(req.query?.limit) || 50)); const offset = Math.max(0, Number(req.query?.offset) || 0);
      const events = db.prepare("SELECT id,actorId,actorRole,action,targetType,targetId,detail,createdAt FROM admin_audit ORDER BY createdAt DESC LIMIT ? OFFSET ?").all(limit, offset);
      res.json({ events });
    });
    app.post("/api/admin/security/passkeys/register/options", auth.authMiddleware, admin.require("security"), (req, res) => {
      try {
        assertMfaAttemptAllowed(req.user.id, "register_passkey");
        if (!auth.verifyPassword(req.user.id, req.body?.password)) { recordMfaFailure(req.user.id, "register_passkey"); return fail(res, 401, "Current password is incorrect.", "CURRENT_PASSWORD_INVALID"); }
        const mfaSettings = mfaRow(req.user.id); if (mfaSettings && !verifyTotp(decryptSecret(mfaSettings, env), req.body?.code, now())) { recordMfaFailure(req.user.id, "register_passkey"); return fail(res, 401, "Authenticator code is incorrect.", "MFA_CODE_INVALID"); }
        clearMfaFailures(req.user.id, "register_passkey");
        const cfg = webauthn.rpConfig(env); const challenge = crypto.randomBytes(32).toString("base64url"); const at = nowIso();
        db.prepare("DELETE FROM admin_webauthn_challenges WHERE expiresAt<=? OR consumedAt IS NOT NULL").run(at);
        db.prepare("INSERT INTO admin_webauthn_challenges(challengeHash,userId,purpose,expiresAt,createdAt,consumedAt,ipHash) VALUES(?,?,?,?,?,NULL,?)")
          .run(hash(challenge), req.user.id, "register", new Date(now() + 5 * 60 * 1000).toISOString(), at, hash(req.ip || ""));
        const existing = db.prepare("SELECT credentialId,transports FROM admin_passkey_credentials WHERE userId=?").all(req.user.id);
        res.json({ publicKey: { challenge, rp: { id: cfg.rpId, name: "NEXA Admin" }, user: { id: Buffer.from(req.user.id).toString("base64url"), name: req.user.email || req.user.id, displayName: req.user.name || req.user.email || "NEXA Admin" }, pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }, { type: "public-key", alg: -8 }], timeout: 60000, authenticatorSelection: { residentKey: "required", requireResidentKey: true, userVerification: "required" }, attestation: "none", excludeCredentials: existing.map((c) => ({ type: "public-key", id: c.credentialId, transports: (() => { try { return JSON.parse(c.transports || "[]"); } catch (_) { return []; } })() })) }, expiresInSeconds: 300 });
      } catch (e) { fail(res, e.status || 503, e.message || "Passkey registration is unavailable.", e.code); }
    });
    app.post("/api/admin/security/passkeys/register/verify", auth.authMiddleware, admin.require("security"), (req, res) => {
      try {
        const cfg = webauthn.rpConfig(env); const credential = req.body?.credential || {}; const response = credential.response || {};
        if (credential.type !== "public-key") return fail(res, 400, "Passkey registration failed.", "WEBAUTHN_REGISTRATION_FAILED");
        const client = webauthn.verifyClientData(response.clientDataJSON, "webauthn.create", null, cfg.origin);
        const challenge = client.parsed.challenge;
        const row = db.prepare("SELECT * FROM admin_webauthn_challenges WHERE challengeHash=? AND userId=? AND purpose='register' AND consumedAt IS NULL AND expiresAt>? ").get(hash(challenge), req.user.id, nowIso());
        if (!row) return fail(res, 400, "Passkey registration challenge is invalid or expired.", "WEBAUTHN_CHALLENGE_INVALID");
        const credentialId = webauthn.decodeCredentialId(credential.rawId, credential.id); const attestation = webauthn.parseAttestationObject(response.attestationObject);
        const registered = webauthn.registrationData(attestation.authData, cfg.rpId);
        if (webauthn.b64url(registered.credentialId) !== credentialId) return fail(res, 400, "Passkey credential ID did not match its attestation.", "WEBAUTHN_CREDENTIAL_MISMATCH");
        const used = db.prepare("UPDATE admin_webauthn_challenges SET consumedAt=? WHERE challengeHash=? AND consumedAt IS NULL AND expiresAt>? ").run(nowIso(), row.challengeHash, nowIso()).changes;
        if (used !== 1) return fail(res, 409, "Passkey registration challenge was already used.", "WEBAUTHN_CHALLENGE_USED");
        const at = nowIso(); const transports = Array.isArray(response.transports) ? response.transports.filter((v) => ["usb", "nfc", "ble", "internal", "hybrid"].includes(v)) : [];
        db.prepare("INSERT INTO admin_passkey_credentials(credentialId,userId,publicKey,algorithm,counter,transports,createdAt,lastUsedAt) VALUES(?,?,?,?,?,?,?,NULL)")
          .run(credentialId, req.user.id, registered.publicKey.publicKeyPem, registered.publicKey.algorithm, registered.counter, JSON.stringify(transports), at);
        admin.audit(req, "admin_passkey_registered", "admin_security", credentialId, "WebAuthn passkey registered with user verification and none attestation."); emitEvent(req.user.id, "admin_passkey_registered");
        res.json({ ok: true, credential: { credentialId, createdAt: at, transports } });
      } catch (e) { fail(res, e.status || 400, e.status ? e.message : "Passkey registration failed validation. Try again.", e.code || "WEBAUTHN_REGISTRATION_FAILED"); }
    });
    app.post("/api/auth/admin-passkey/options", (req, res) => {
      try {
        const cfg = webauthn.rpConfig(env); const ipHash = hash(req.ip || req.socket?.remoteAddress || ""); const since = new Date(now() - 15 * 60 * 1000).toISOString();
        db.prepare("DELETE FROM admin_webauthn_challenges WHERE expiresAt<=? OR (consumedAt IS NOT NULL AND createdAt<?)").run(nowIso(), since);
        const recent = db.prepare("SELECT COUNT(*) AS count FROM admin_webauthn_challenges WHERE purpose='login' AND ipHash=? AND createdAt>=?").get(ipHash, since).count;
        if (recent >= 20) return fail(res, 429, "Too many passkey sign-in attempts. Wait before trying again.", "WEBAUTHN_RATE_LIMITED");
        const challenge = crypto.randomBytes(32).toString("base64url"); const at = nowIso();
        db.prepare("INSERT INTO admin_webauthn_challenges(challengeHash,userId,purpose,expiresAt,createdAt,consumedAt,ipHash) VALUES(?,?,?,?,?,NULL,?)")
          .run(hash(challenge), "__passkey_login__", "login", new Date(now() + 5 * 60 * 1000).toISOString(), at, ipHash);
        res.json({ publicKey: { challenge, rpId: cfg.rpId, allowCredentials: [], timeout: 60000, userVerification: "required" }, expiresInSeconds: 300 });
      } catch (e) { fail(res, e.status || 503, e.message || "Passkey sign-in is unavailable.", e.code); }
    });
    app.post("/api/auth/admin-passkey/verify", (req, res) => {
      try {
        if (req.body?.ageConfirmed !== true) return fail(res, 400, "Confirm that you are 18 or older before signing in.", "AGE_RESTRICTION");
        let challengeHashForFailure = null;
        const cfg = webauthn.rpConfig(env); const credential = req.body?.credential || {}; const response = credential.response || {};
        if (credential.type !== "public-key") return fail(res, 401, "Passkey sign-in could not be verified.", "WEBAUTHN_AUTHENTICATION_FAILED");
        const client = webauthn.verifyClientData(response.clientDataJSON, "webauthn.get", null, cfg.origin); const challenge = client.parsed.challenge;
        const challengeRow = db.prepare("SELECT * FROM admin_webauthn_challenges WHERE challengeHash=? AND userId='__passkey_login__' AND purpose='login' AND consumedAt IS NULL AND expiresAt>? AND attempts<5 ").get(hash(challenge), nowIso());
        if (!challengeRow) return fail(res, 401, "Passkey sign-in could not be verified.", "WEBAUTHN_AUTHENTICATION_FAILED");
        challengeHashForFailure = challengeRow.challengeHash;
        const credentialId = webauthn.decodeCredentialId(credential.rawId, credential.id); const stored = db.prepare("SELECT * FROM admin_passkey_credentials WHERE credentialId=?").get(credentialId);
        if (!stored) { db.prepare("UPDATE admin_webauthn_challenges SET attempts=attempts+1 WHERE challengeHash=? AND consumedAt IS NULL").run(challengeHashForFailure); return fail(res, 401, "Passkey sign-in could not be verified.", "WEBAUTHN_AUTHENTICATION_FAILED"); }
        const verified = webauthn.verifyAssertionSignature({ authenticatorData: response.authenticatorData, clientDataJSON: response.clientDataJSON, signature: response.signature, publicKeyPem: stored.publicKey, algorithm: Number(stored.algorithm), rpId: cfg.rpId, challenge, origin: cfg.origin });
        if (response.userHandle && webauthn.b64url(webauthn.fromB64url(response.userHandle)) !== Buffer.from(stored.userId).toString("base64url")) { db.prepare("UPDATE admin_webauthn_challenges SET attempts=attempts+1 WHERE challengeHash=? AND consumedAt IS NULL").run(challengeHashForFailure); return fail(res, 401, "Passkey sign-in could not be verified.", "WEBAUTHN_AUTHENTICATION_FAILED"); }
        if (Number(stored.counter) > 0 && verified.counter > 0 && verified.counter <= Number(stored.counter)) { db.prepare("UPDATE admin_webauthn_challenges SET attempts=attempts+1 WHERE challengeHash=? AND consumedAt IS NULL").run(challengeHashForFailure); emitEvent(stored.userId, "admin_passkey_counter_anomaly", "warning", { credentialId }); return fail(res, 401, "Passkey sign-in could not be verified.", "WEBAUTHN_AUTHENTICATION_FAILED"); }
        const consumed = db.prepare("UPDATE admin_webauthn_challenges SET consumedAt=? WHERE challengeHash=? AND consumedAt IS NULL AND expiresAt>? ").run(nowIso(), challengeRow.challengeHash, nowIso()).changes;
        if (consumed !== 1) return fail(res, 409, "Passkey sign-in challenge was already used.", "WEBAUTHN_CHALLENGE_USED");
        const user = db.prepare("SELECT id,email,accountStatus FROM users WHERE id=?").get(stored.userId);
        if (!user || user.accountStatus !== "active" || !isAdmin(user)) return fail(res, 401, "Passkey sign-in could not be verified.", "WEBAUTHN_AUTHENTICATION_FAILED");
        db.prepare("UPDATE admin_passkey_credentials SET counter=?,lastUsedAt=? WHERE credentialId=?").run(Math.max(Number(stored.counter) || 0, verified.counter), nowIso(), credentialId);
        emitEvent(user.id, "admin_passkey_login_verified", "info", { credentialId });
        const context = { deviceId: req.headers["x-nexa-device-id"], deviceLabel: req.headers["x-nexa-device-label"] || "NEXA Admin passkey", ip: req.ip || req.socket?.remoteAddress || "", userAgent: req.headers["user-agent"] || "" };
        const mfaChallenge = createLoginChallenge(user, context); if (mfaChallenge) return res.json(mfaChallenge);
        const session = auth.createSession(user.id, context); res.json({ token: session.token, userId: session.user.id, user: session.user });
      } catch (e) { try { if (typeof challengeHashForFailure === "string") db.prepare("UPDATE admin_webauthn_challenges SET attempts=attempts+1 WHERE challengeHash=? AND consumedAt IS NULL").run(challengeHashForFailure); } catch (_) {} fail(res, e.status || 401, "Passkey sign-in could not be verified.", e.code || "WEBAUTHN_AUTHENTICATION_FAILED"); }
    });
    app.get("/api/admin/security/passkeys", auth.authMiddleware, admin.require("security"), (req, res) => {
      const credentials = db.prepare("SELECT credentialId,transports,createdAt,lastUsedAt FROM admin_passkey_credentials WHERE userId=? ORDER BY createdAt DESC").all(req.user.id).map((c) => ({ ...c, transports: (() => { try { return JSON.parse(c.transports || "[]"); } catch (_) { return []; } })() }));
      let configReady = true; try { webauthn.rpConfig(env); } catch (_) { configReady = false; }
      res.json({ registered: credentials.length, credentials, browserApiAvailable: null, registrationAvailable: configReady, status: configReady ? "enabled" : "needs_origin_config", note: configReady ? "Passkey registration and assertion verification are enabled for secure origins with valid RP configuration." : "Configure NEXA_ADMIN_WEBAUTHN_ORIGIN or NEXA_PUBLIC_URL before registering or using passkeys." });
    });
    app.delete("/api/admin/security/passkeys/:credentialId", auth.authMiddleware, admin.require("security"), (req, res) => {
      try {
        if (!auth.verifyPassword(req.user.id, req.body?.password)) return fail(res, 401, "Current password is incorrect.", "CURRENT_PASSWORD_INVALID");
        const settings = mfaRow(req.user.id);
        if (settings) { assertMfaAttemptAllowed(req.user.id, "remove_passkey"); if (!verifyTotp(decryptSecret(settings, env), req.body?.code, now())) { recordMfaFailure(req.user.id, "remove_passkey"); return fail(res, 401, "Authenticator code is incorrect.", "MFA_CODE_INVALID"); } clearMfaFailures(req.user.id, "remove_passkey"); }
        const credentialId = cleanId(req.params.credentialId); const changed = db.prepare("DELETE FROM admin_passkey_credentials WHERE credentialId=? AND userId=?").run(credentialId, req.user.id).changes;
        if (!changed) return fail(res, 404, "Passkey was not found for this account.");
        admin.audit(req, "admin_passkey_removed", "admin_security", credentialId, "Passkey removed after password and optional TOTP confirmation."); emitEvent(req.user.id, "admin_passkey_removed", "warning"); res.json({ ok: true, removed: true });
      } catch (e) { fail(res, e.status || 400, e.message || "Passkey could not be removed.", e.code); }
    });
  }
  return { register, isActiveStaff, createLoginChallenge, verifyLoginChallenge, stepUpAction, validateStepUp, requiresMfa, auditCredentialChange, isAdmin, roleOf: role, totp, verifyTotp, assertMfaAttemptAllowed, recordMfaFailure, clearMfaFailures };
}
module.exports = { createAdminSecurityCenter, b32encode, b32decode, totp, verifyTotp, encryptionKey };
