"use strict";
// One username per person: the name typed at signup becomes the NEXA username everywhere.
// Rules live here once; friends.js uses the same pattern and reserved list.
const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/; // 3-20 chars, starts with a letter, lowercase + digits + underscore
const RESERVED = new Set(["admin", "support", "nexa", "staff", "everyone", "system", "root", "null", "undefined"]);

function baseFromName(name) {
  let b = String(name || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9_]+/g, "");
  b = b.replace(/^[^a-z]+/, "");
  if (b.length < 3) b += "user";
  return b.slice(0, 20);
}

function isFree(db, u, userId) {
  if (!USERNAME_RE.test(u) || RESERVED.has(u)) return false;
  return !db.prepare("SELECT 1 FROM users WHERE username = ? COLLATE NOCASE AND id != ?").get(u, userId || "");
}

// Closest valid, free username for a name. Adds a number only when the plain one is taken.
function pickUsername(db, name, userId) {
  const base = baseFromName(name);
  if (isFree(db, base, userId)) return base;
  for (let n = 2; n < 10000; n++) {
    const suffix = String(n);
    const cand = base.slice(0, 20 - suffix.length) + suffix;
    if (isFree(db, cand, userId)) return cand;
  }
  return null;
}

// Sets the username only if the account has none yet. Never changes a username someone already has.
function assignSignupUsername(db, userId, name) {
  const row = db.prepare("SELECT username FROM users WHERE id = ?").get(userId);
  if (!row || row.username) return row ? row.username : null;
  const u = pickUsername(db, name, userId);
  if (!u) return null;
  db.prepare("UPDATE users SET username = ?, usernameSetAt = ? WHERE id = ? AND username IS NULL").run(u, new Date().toISOString(), userId);
  return u;
}

// Gives every existing account without a username one taken from its name.
function backfillUsernames(db) {
  const rows = db.prepare("SELECT id, name FROM users WHERE username IS NULL ORDER BY createdAt, id").all();
  let n = 0;
  for (const r of rows) { try { if (assignSignupUsername(db, r.id, r.name)) n++; } catch (_) { /* leave it unset; the person can still pick one */ } }
  return n;
}

module.exports = { USERNAME_RE, RESERVED, baseFromName, pickUsername, assignSignupUsername, backfillUsernames };
