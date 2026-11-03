"use strict";
const crypto = require("crypto");
const { URL } = require("url");
const bcrypt = require("bcryptjs");
const { assignSignupUsername } = require("./signupUsername");
const { createCodeVerifier, pkceChallenge } = require("./googlePkce");

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const SCOPES = ["openid", "email", "profile"];
const STATE_TTL_MS = 10 * 60 * 1000;
const CODE_TTL_MS = 2 * 60 * 1000;
const MIN_BCRYPT_COST = 12;

function configured(env = process.env) {
  return Boolean(String(env.GOOGLE_CLIENT_ID || "").trim() && String(env.GOOGLE_CLIENT_SECRET || "").trim());
}
function redirectUri(env = process.env) {
  const value = String(env.GOOGLE_REDIRECT_URI || "").trim();
  if (!value) throw new Error("GOOGLE_REDIRECT_URI is not configured.");
  return value;
}
function appRedirect(env = process.env) {
  return String(env.NEXA_GOOGLE_APP_REDIRECT_URI || "nexa://auth/google-callback").trim();
}
function ensureSchema(db) {
  try { db.exec("ALTER TABLE users ADD COLUMN authProvider TEXT NOT NULL DEFAULT 'password'"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN authProviderSubject TEXT"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN emailVerified INTEGER NOT NULL DEFAULT 0"); } catch (_) {}
  try { db.exec("ALTER TABLE users ADD COLUMN adultConfirmedAt TEXT"); } catch (_) {}
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_provider_subject ON users(authProvider,authProviderSubject) WHERE authProviderSubject IS NOT NULL");
  try { db.exec("ALTER TABLE google_auth_transactions ADD COLUMN codeVerifier TEXT"); } catch (_) {}
  db.exec(`CREATE TABLE IF NOT EXISTS google_auth_transactions (
    id TEXT PRIMARY KEY,
    stateHash TEXT NOT NULL UNIQUE,
    appRedirect TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    codeVerifier TEXT
  );
  CREATE TABLE IF NOT EXISTS google_auth_codes (
    codeHash TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    createdAt TEXT NOT NULL,
    expiresAt TEXT NOT NULL,
    consumedAt TEXT
  );`);
}
function hash(value) { return crypto.createHash("sha256").update(String(value)).digest("hex"); }
function randomToken(bytes = 32) { return crypto.randomBytes(bytes).toString("base64url"); }
function cleanup(db) {
  const now = new Date().toISOString();
  db.prepare("DELETE FROM google_auth_transactions WHERE expiresAt <= ?").run(now);
  db.prepare("DELETE FROM google_auth_codes WHERE expiresAt <= ? OR consumedAt IS NOT NULL").run(now);
}
function start(db, env = process.env) {
  if (!configured(env)) throw Object.assign(new Error("Google authentication is not configured."), { status: 503, code: "GOOGLE_AUTH_NOT_CONFIGURED" });
  cleanup(db);
  const state = randomToken(32);
  const verifier = createCodeVerifier();
  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + STATE_TTL_MS);
  const appTarget = appRedirect(env);
  db.prepare("INSERT INTO google_auth_transactions(id,stateHash,appRedirect,createdAt,expiresAt,codeVerifier) VALUES(?,?,?,?,?,?)")
    .run(crypto.randomUUID(), hash(state), appTarget, createdAt.toISOString(), expiresAt.toISOString(), verifier);
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", String(env.GOOGLE_CLIENT_ID).trim());
  url.searchParams.set("redirect_uri", redirectUri(env));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", pkceChallenge(verifier));
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("access_type", "online");
  url.searchParams.set("prompt", "select_account");
  return { url: url.toString(), expiresAt: expiresAt.toISOString() };
}
async function fetchJson(url, init) {
  const response = await fetch(url, init);
  const body = await response.text();
  let data; try { data = body ? JSON.parse(body) : {}; } catch { data = {}; }
  if (!response.ok) throw Object.assign(new Error(data.error_description || data.error || "Google authentication request failed."), { status: 502, code: "GOOGLE_AUTH_PROVIDER_ERROR" });
  return data;
}
async function callback(db, code, state, env = process.env) {
  if (!configured(env)) throw Object.assign(new Error("Google authentication is not configured."), { status: 503, code: "GOOGLE_AUTH_NOT_CONFIGURED" });
  cleanup(db);
  const tx = db.prepare("SELECT * FROM google_auth_transactions WHERE stateHash=? AND expiresAt>? ").get(hash(state), new Date().toISOString());
  if (!tx || typeof tx.codeVerifier !== "string" || tx.codeVerifier.length < 43) throw Object.assign(new Error("Google sign-in session is invalid or expired."), { status: 400, code: "GOOGLE_AUTH_STATE_INVALID" });
  const claimed = db.prepare("DELETE FROM google_auth_transactions WHERE id=? AND expiresAt>? ").run(tx.id, new Date().toISOString());
  if (!claimed || claimed.changes !== 1) throw Object.assign(new Error("Google sign-in session is invalid or expired."), { status: 400, code: "GOOGLE_AUTH_STATE_INVALID" });
  const tokens = await fetchJson(GOOGLE_TOKEN_URL, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code: String(code), client_id: String(env.GOOGLE_CLIENT_ID), client_secret: String(env.GOOGLE_CLIENT_SECRET), redirect_uri: redirectUri(env), grant_type: "authorization_code", code_verifier: tx.codeVerifier }).toString() });
  const profile = await fetchJson(GOOGLE_USERINFO_URL, { headers: { Authorization: `Bearer ${tokens.access_token}` } });
  const subject = String(profile.sub || "").trim();
  const email = String(profile.email || "").trim().toLowerCase();
  const name = String(profile.name || "NEXA user").trim().slice(0, 80) || "NEXA user";
  if (!subject || !/^\S+@\S+\.\S+$/.test(email) || profile.email_verified !== true) throw Object.assign(new Error("Google did not provide a verified email identity."), { status: 400, code: "GOOGLE_IDENTITY_UNVERIFIED" });
  let user = db.prepare("SELECT * FROM users WHERE authProvider='google' AND authProviderSubject=?").get(subject);
  if (!user) user = db.prepare("SELECT * FROM users WHERE email=?").get(email);
  if (user) {
    if (user.accountStatus === "closed") throw Object.assign(new Error("This NEXA account is closed."), { status: 403, code: "ACCOUNT_CLOSED" });
    if (user.authProvider === "password" && !user.authProviderSubject) {
      db.prepare("UPDATE users SET authProvider='google',authProviderSubject=?,emailVerified=1,name=?,adultConfirmedAt=COALESCE(adultConfirmedAt,?) WHERE id=?").run(subject, name, new Date().toISOString(), user.id);
      user = db.prepare("SELECT * FROM users WHERE id=?").get(user.id);
    } else if (user.authProvider !== "google" || user.authProviderSubject !== subject) {
      throw Object.assign(new Error("That email is already linked to another sign-in method."), { status: 409, code: "AUTH_PROVIDER_CONFLICT" });
    }
  } else {
    const id = `u_${crypto.randomBytes(12).toString("hex")}`;
    const unusablePassword = await bcrypt.hash(randomToken(24), MIN_BCRYPT_COST);
    db.prepare("INSERT INTO users(id,email,passwordHash,name,createdAt,authProvider,authProviderSubject,emailVerified,adultConfirmedAt) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(id, email, unusablePassword, name, new Date().toISOString(), "google", subject, 1, new Date().toISOString());
    assignSignupUsername(db, id, name);
    user = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  }
  return { userId: user.id, appRedirect: tx.appRedirect };
}
function issueCode(db, userId) {
  cleanup(db);
  const user = db.prepare("SELECT accountStatus FROM users WHERE id=?").get(userId);
  if (!user || user.accountStatus === "closed") throw Object.assign(new Error("This NEXA account is closed."), { status: 403, code: "ACCOUNT_CLOSED" });
  const code = randomToken(32);
  const now = new Date();
  db.prepare("INSERT INTO google_auth_codes(codeHash,userId,createdAt,expiresAt) VALUES(?,?,?,?)")
    .run(hash(code), userId, now.toISOString(), new Date(now.getTime() + CODE_TTL_MS).toISOString());
  return code;
}
function consumeCode(db, code, auth) {
  cleanup(db);
  const row = db.prepare("SELECT * FROM google_auth_codes WHERE codeHash=? AND consumedAt IS NULL AND expiresAt>? ").get(hash(code), new Date().toISOString());
  if (!row) throw Object.assign(new Error("Google sign-in code is invalid or expired."), { status: 400, code: "GOOGLE_AUTH_CODE_INVALID" });
  const user = db.prepare("SELECT accountStatus FROM users WHERE id=?").get(row.userId);
  if (!user || user.accountStatus === "closed") {
    db.prepare("DELETE FROM google_auth_codes WHERE codeHash=?").run(row.codeHash);
    throw Object.assign(new Error("This NEXA account is closed."), { status: 403, code: "ACCOUNT_CLOSED" });
  }
  const consumed = db.prepare("UPDATE google_auth_codes SET consumedAt=? WHERE codeHash=? AND consumedAt IS NULL AND expiresAt>?").run(new Date().toISOString(), row.codeHash, new Date().toISOString());
  if (consumed.changes !== 1) throw Object.assign(new Error("Google sign-in code is invalid or expired."), { status: 400, code: "GOOGLE_AUTH_CODE_INVALID" });
  return auth.createSessionForProvider(row.userId);
}
module.exports = { MIN_BCRYPT_COST, configured, redirectUri, appRedirect, ensureSchema, start, callback, issueCode, consumeCode, hash, pkceChallenge };
