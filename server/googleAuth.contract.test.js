"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const root = path.join(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(root, f), "utf8");

test("M730-M734 Google authentication is server-authoritative and one-time", () => {
  const mod = read("server/googleAuth.js");
  const index = read("server/index.js");
  assert.match(mod, /GOOGLE_CLIENT_ID/);
  assert.match(mod, /GOOGLE_CLIENT_SECRET/);
  assert.match(mod, /stateHash/);
  assert.match(mod, /email_verified/);
  assert.match(mod, /authProviderSubject/);
  assert.match(mod, /consumedAt/);
  assert.match(index, /\/api\/auth\/google\/start/);
  assert.match(index, /\/api\/auth\/google\/callback/);
  assert.match(index, /\/api\/auth\/google\/exchange/);
  assert.doesNotMatch(read("src/auth.tsx"), /GOOGLE_CLIENT_SECRET/);
  assert.match(read("src/auth.tsx"), /completeGoogleSignIn/);
  assert.match(read("src/app/auth/google-callback.tsx"), /completeGoogleSignIn/);
});


test("M7121 Google OAuth binds authorization-code exchange with PKCE S256", () => {
  const mod = read("server/googleAuth.js");
  assert.match(mod, /code_challenge_method\", \"S256/);
  assert.match(mod, /code_challenge/);
  assert.match(mod, /code_verifier/);
  assert.match(mod, /ADD COLUMN codeVerifier TEXT/);
  assert.match(mod, /typeof tx\.codeVerifier !== \"string\"/);
  const crypto = require("crypto");
  const verifier = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-._~";
  assert.equal(mod.includes("code_verifier: tx.codeVerifier"), true);
  assert.equal(require("./googlePkce").pkceChallenge(verifier), crypto.createHash("sha256").update(verifier).digest("base64url"));
  assert.match(read("server/googlePkce.js"), /randomBytes\(32\)\.toString\(\"base64url\"\)/);
});

test("M7121 Google one-time exchange requires a successful conditional consume before session creation", () => {
  const mod = read("server/googleAuth.js");
  assert.match(mod, /UPDATE google_auth_codes SET consumedAt=\? WHERE codeHash=\? AND consumedAt IS NULL AND expiresAt>\?/);
  assert.match(mod, /consumed\.changes !== 1/);
  assert.ok(mod.indexOf("consumed.changes !== 1") < mod.indexOf("return auth.createSessionForProvider(row.userId)"));
});

test("M7121 Google OAuth claims its state transaction once before provider exchange", () => {
  const mod = read("server/googleAuth.js");
  assert.match(mod, /DELETE FROM google_auth_transactions WHERE id=\? AND expiresAt>\?/);
  assert.match(mod, /claimed\.changes !== 1/);
  assert.ok(mod.indexOf("claimed.changes !== 1") < mod.indexOf("const tokens = await fetchJson"));
});
