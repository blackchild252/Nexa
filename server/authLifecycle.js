"use strict";
const crypto = require("node:crypto");
const bcrypt = require("bcryptjs");
const db = require("./db");
const policy = require("./v5_72_0_session_integrity");
const TOKEN_TTL_MS = Object.freeze({ verify_email: 24 * 60 * 60 * 1000, password_reset: 30 * 60 * 1000 });
const hash = (value) => crypto.createHash("sha256").update(String(value || "")).digest("hex");
const cleanEmail = (value) => String(value || "").trim().toLowerCase().slice(0, 254);
const tokenUrl = (purpose, token) => {
  const path = purpose === "password_reset" ? "/auth/recover" : "/auth/verify-email";
  const base = String(process.env.NEXA_PUBLIC_URL || "").trim().replace(/\/+$/, "");
  const url = `${path}?token=${encodeURIComponent(token)}`;
  if (!base) return `nexa://${url.replace(/^\//, "")}`;
  let parsed;
  try { parsed = new URL(base); } catch (_) { throw new Error("NEXA_PUBLIC_URL must be an absolute URL."); }
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) throw new Error("NEXA_PUBLIC_URL must be a safe HTTP(S) origin or base path.");
  if (process.env.NODE_ENV === "production" && parsed.protocol !== "https:") throw new Error("NEXA_PUBLIC_URL must use HTTPS in production.");
  return `${base}${url}`;
};
function logSecurityEvent({ userId = null, action, ip = "", userAgent = "", metadata = {}, severity = "info" }) {
  const now = new Date().toISOString();
  const safeMeta = JSON.stringify(metadata && typeof metadata === "object" ? metadata : {});
  try {
    db.prepare("INSERT INTO platform_event_log(id,requestId,userId,action,entityType,entityId,metadata,createdAt,severity) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(`evt_${crypto.randomBytes(12).toString("hex")}`, `auth_${crypto.randomBytes(8).toString("hex")}`, userId, action, "auth", null, safeMeta, now, severity);
  } catch (_) { /* Security telemetry must never break authentication. */ }
  if (userId) {
    try {
      db.prepare("INSERT INTO notification_events(id,userId,title,body,type,data,createdAt,readAt,dedupeKey) VALUES(?,?,?,?,?,?,?,?,?)")
        .run(`ntf_${crypto.randomBytes(12).toString("hex")}`, userId, "Account security", securityMessage(action), "system", JSON.stringify({ action }), now, null, `auth-security:${action}:${Math.floor(Date.now() / 60000)}`);
    } catch (_) { /* Notification dedupe or unavailable notification schema must not block auth. */ }
  }
}
function securityMessage(action) {
  const messages = {
    password_reset_completed: "Your password was reset. Other active sessions were signed out.",
    password_changed: "Your password was changed. Other active sessions were signed out.",
    email_verified: "Your email address was verified.",
    suspicious_login: "We detected repeated unsuccessful sign-in attempts. If this was not you, change your password.",
    new_login_context: "A sign-in from a new device or network was detected. Review your active sessions if this was not you."
  };
  return messages[action] || "A security-related change occurred on your account.";
}
function issueToken(userId, purpose, context = {}) {
  if (!Object.hasOwn(TOKEN_TTL_MS, purpose)) throw new Error("Unsupported authentication token purpose.");
  const user = db.prepare("SELECT id,email FROM users WHERE id=? AND accountStatus = 'active'").get(userId);
  if (!user) throw new Error("Account not found.");
  const raw = crypto.randomBytes(32).toString("base64url");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + TOKEN_TTL_MS[purpose]).toISOString();
  db.transaction(() => {
    db.prepare("UPDATE auth_action_tokens SET consumedAt=? WHERE userId=? AND purpose=? AND consumedAt IS NULL").run(now.toISOString(), userId, purpose);
    db.prepare("INSERT INTO auth_action_tokens(id,userId,purpose,tokenHash,createdAt,expiresAt,consumedAt,ipHash,userAgentHash) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(`aat_${crypto.randomBytes(12).toString("hex")}`, userId, purpose, hash(raw), now.toISOString(), expiresAt, null, policy.hashIp(context.ip || ""), policy.hashUserAgent(context.userAgent || ""));
  })();
  return { token: raw, url: tokenUrl(purpose, raw), expiresAt, email: user.email };
}
async function deliverLink({ email, purpose, url }) {
  const webhook = String(process.env.AUTH_EMAIL_WEBHOOK_URL || "").trim();
  if (webhook) {
    try {
      const endpoint = new URL(webhook);
      if (!/^https?:$/.test(endpoint.protocol) || (process.env.NODE_ENV === "production" && endpoint.protocol !== "https:") || endpoint.username || endpoint.password) return { delivered: false, mode: "invalid_provider_url" };
      const headers = { "content-type": "application/json" };
      if (process.env.AUTH_EMAIL_WEBHOOK_TOKEN) headers.authorization = `Bearer ${process.env.AUTH_EMAIL_WEBHOOK_TOKEN}`;
      const response = await fetch(webhook, { method: "POST", headers, body: JSON.stringify({ to: email, purpose, url }), signal: AbortSignal.timeout(8000) });
      if (response.ok) return { delivered: true, mode: "webhook" };
    } catch (_) { /* Fail closed to a generic public response; never expose the token. */ }
  }
  // Local development can exercise the full link flow without an external provider.
  if (process.env.NODE_ENV !== "production" && process.env.AUTH_EMAIL_MODE === "console") {
    console.info(`[NEXA auth email preview] purpose=${purpose} recipient=${email} url=${url}`);
    return { delivered: true, mode: "console" };
  }
  return { delivered: false, mode: "provider_not_configured" };
}
async function requestLink(emailInput, purpose, context = {}) {
  const email = cleanEmail(emailInput);
  if (!/^\S+@\S+\.\S+$/.test(email)) return { accepted: true, delivered: false };
  const user = db.prepare("SELECT id,email FROM users WHERE email=? AND accountStatus = 'active'").get(email);
  if (!user) return { accepted: true, delivered: false };
  const issued = issueToken(user.id, purpose, context);
  const delivery = await deliverLink({ email: user.email, purpose, url: issued.url });
  logSecurityEvent({ userId: user.id, action: purpose === "password_reset" ? "password_reset_requested" : "email_verification_requested", ip: context.ip, userAgent: context.userAgent, metadata: { delivery: delivery.mode } });
  return { accepted: true, delivered: delivery.delivered, ...(process.env.NODE_ENV !== "production" && process.env.AUTH_EMAIL_MODE === "console" ? { previewUrl: issued.url } : {}) };
}
function consumeToken(rawToken, purpose) {
  const token = String(rawToken || "").trim();
  if (token.length < 32 || token.length > 256) return null;
  const now = new Date().toISOString();
  const row = db.prepare("SELECT * FROM auth_action_tokens WHERE tokenHash=? AND purpose=? AND consumedAt IS NULL AND expiresAt>? ").get(hash(token), purpose, now);
  if (!row) return null;
  const changed = db.prepare("UPDATE auth_action_tokens SET consumedAt=? WHERE id=? AND consumedAt IS NULL AND expiresAt>? ").run(now, row.id, now).changes;
  return changed === 1 ? row : null;
}
function verifyEmail(rawToken, context = {}) {
  const token = consumeToken(rawToken, "verify_email");
  if (!token) throw Object.assign(new Error("This verification link is invalid, expired, or already used."), { status: 400, code: "AUTH_TOKEN_INVALID" });
  const now = new Date().toISOString();
  const updated = db.prepare("UPDATE users SET emailVerifiedAt=? WHERE id=? AND accountStatus = 'active'").run(now, token.userId).changes;
  if (updated !== 1) throw Object.assign(new Error("This account cannot be verified right now."), { status: 403, code: "ACCOUNT_UNAVAILABLE" });
  logSecurityEvent({ userId: token.userId, action: "email_verified", ip: context.ip, userAgent: context.userAgent });
  return { ok: true, verified: true };
}
function validNewPassword(value) {
  const password = String(value || "");
  if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    throw Object.assign(new Error("Password must be at least 8 characters and include lowercase, uppercase, number and special character."), { status: 400, code: "PASSWORD_POLICY" });
  }
  return password;
}
async function resetPassword(rawToken, newPassword, context = {}) {
  const password = validNewPassword(newPassword);
  const token = consumeToken(rawToken, "password_reset");
  if (!token) throw Object.assign(new Error("This recovery link is invalid, expired, or already used."), { status: 400, code: "AUTH_TOKEN_INVALID" });
  const user = db.prepare("SELECT id,accountStatus FROM users WHERE id=?").get(token.userId);
  if (!user || user.accountStatus !== "active") throw Object.assign(new Error("This account cannot reset its password right now."), { status: 403, code: "ACCOUNT_UNAVAILABLE" });
  const passwordHash = await bcrypt.hash(password, 12);
  const now = new Date().toISOString();
  db.transaction(() => {
    db.prepare("UPDATE users SET passwordHash=? WHERE id=?").run(passwordHash, token.userId);
    db.prepare("UPDATE sessions SET revokedAt=?,revocationReason='password_reset' WHERE userId=? AND revokedAt IS NULL").run(now, token.userId);
    db.prepare("UPDATE auth_action_tokens SET consumedAt=? WHERE userId=? AND consumedAt IS NULL").run(now, token.userId);
  })();
  logSecurityEvent({ userId: token.userId, action: "password_reset_completed", ip: context.ip, userAgent: context.userAgent });
  const result = { ok: true, sessionsRevoked: true };
  Object.defineProperty(result, "securityAuditUserId", { value: token.userId, enumerable: false });
  return result;
}
async function changePassword(userId, currentPassword, newPassword, context = {}) {
  const password = validNewPassword(newPassword);
  const user = db.prepare("SELECT passwordHash,accountStatus FROM users WHERE id=?").get(userId);
  if (!user || user.accountStatus !== "active" || !(await bcrypt.compare(String(currentPassword || ""), user.passwordHash))) {
    throw Object.assign(new Error("Current password is incorrect."), { status: 400, code: "CURRENT_PASSWORD_INVALID" });
  }
  if (await bcrypt.compare(password, user.passwordHash)) throw Object.assign(new Error("Choose a password you have not used for this account."), { status: 400, code: "PASSWORD_REUSE" });
  const nextHash = await bcrypt.hash(password, 12), now = new Date().toISOString();
  db.transaction(() => {
    db.prepare("UPDATE users SET passwordHash=? WHERE id=?").run(nextHash, userId);
    db.prepare("UPDATE sessions SET revokedAt=?,revocationReason='password_changed' WHERE userId=? AND revokedAt IS NULL").run(now, userId);
    db.prepare("UPDATE auth_action_tokens SET consumedAt=? WHERE userId=? AND consumedAt IS NULL").run(now, userId);
  })();
  logSecurityEvent({ userId, action: "password_changed", ip: context.ip, userAgent: context.userAgent });
  return { ok: true, sessionsRevoked: true, signedOut: true };
}
function recordLoginAttempt({ email, userId = null, success = false, ip = "", userAgent = "" } = {}) {
  const emailHash = hash(cleanEmail(email));
  const ipHash = policy.hashIp(ip);
  const userAgentHash = policy.hashUserAgent(userAgent);
  const now = new Date().toISOString();
  const previous = success && userId ? db.prepare("SELECT ipHash,userAgentHash FROM auth_login_attempts WHERE userId=? AND success=1 ORDER BY createdAt DESC LIMIT 1").get(userId) : null;
  const id = `ala_${crypto.randomBytes(12).toString("hex")}`;
  try { db.prepare("INSERT INTO auth_login_attempts(id,emailHash,ipHash,userId,success,createdAt,userAgentHash) VALUES(?,?,?,?,?,?,?)").run(id, emailHash, ipHash, userId, success ? 1 : 0, now, userAgentHash); } catch (_) { return; }
  if (!success) {
    const since = new Date(Date.now() - 15 * 60 * 1000).toISOString();
    const recent = db.prepare("SELECT COUNT(*) AS n FROM auth_login_attempts WHERE emailHash=? AND success=0 AND createdAt>=?").get(emailHash, since)?.n || 0;
    if (recent === 5 || (recent > 5 && recent % 5 === 0)) logSecurityEvent({ userId, action: "suspicious_login", ip, userAgent, severity: "warning", metadata: { failedAttempts15m: Math.min(recent, 100) } });
  } else if (previous && (previous.ipHash !== ipHash || previous.userAgentHash !== userAgentHash)) {
    logSecurityEvent({ userId, action: "new_login_context", ip, userAgent, severity: "warning" });
  }
}
function listSecurityEvents(userId, limit = 50) {
  const bounded = Math.max(1, Math.min(100, Number(limit) || 50));
  return db.prepare("SELECT action,createdAt,severity,metadata FROM platform_event_log WHERE userId=? AND entityType='auth' ORDER BY createdAt DESC LIMIT ?").all(userId, bounded).map((r) => ({ action: r.action, createdAt: r.createdAt, severity: r.severity || "info", metadata: (() => { try { const m = JSON.parse(r.metadata || "{}"); return Object.fromEntries(Object.entries(m).filter(([k]) => !/(token|secret|password|email|ip|useragent|credential)/i.test(k))); } catch (_) { return {}; } })() }));
}
module.exports = { TOKEN_TTL_MS, cleanEmail, hash, tokenUrl, issueToken, requestLink, verifyEmail, resetPassword, changePassword, recordLoginAttempt, logSecurityEvent, listSecurityEvents };
