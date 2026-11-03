"use strict";
const crypto = require("crypto");
const productStock = require("./productStock");

// Account closure removes personal/workspace data that can safely be deleted.
// Transactional commerce records are retained for order/payment integrity, while
// the user identity itself is anonymized and all credentials/sessions are revoked.
const closureIntegrity = require("./v5_77_0_account_closure_integrity");

// Historical closure contract: "sessions" remains part of DELETE_USER_TABLES.
const DELETE_USER_TABLES = closureIntegrity.DELETE_USER_TABLES;
const RETAINED_USER_TABLES = closureIntegrity.RETAINED_USER_TABLES;

function ensureColumns(db) {
  const cols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!cols.includes("accountStatus")) db.exec("ALTER TABLE users ADD COLUMN accountStatus TEXT NOT NULL DEFAULT 'active'");
  if (!cols.includes("closedAt")) db.exec("ALTER TABLE users ADD COLUMN closedAt TEXT");
}

function verifyClosurePassword(db, bcrypt, userId, password) {
  const row = db.prepare("SELECT passwordHash, accountStatus FROM users WHERE id=?").get(userId);
  if (!row || row.accountStatus !== "active") return false;
  return bcrypt.compareSync(String(password || ""), row.passwordHash);
}

function closureBlockerError(blockers) {
  const err = new Error("Account closure requires unresolved financial positions to be settled first.");
  err.code = "ACCOUNT_CLOSURE_BLOCKED";
  err.status = 409;
  err.blockers = blockers;
  return err;
}

function closeAccount(db, userId, now = new Date().toISOString(), vendorSubscriptions = null) {
  ensureColumns(db);
  const readiness = closureIntegrity.closureSchemaReadiness(db);
  if (!readiness.ok) {
    const err = new Error("Account closure infrastructure is incomplete.");
    err.code = "ACCOUNT_CLOSURE_SCHEMA_INCOMPLETE";
    err.status = 503;
    err.readiness = readiness;
    throw err;
  }
  const blockers = closureIntegrity.closureBlockers(db, userId);
  if (blockers.length) throw closureBlockerError(blockers);
  const tx = db.transaction(() => {
    const user = db.prepare("SELECT id,accountStatus FROM users WHERE id=?").get(userId);
    if (!user) throw new Error("Account not found.");
    if (user.accountStatus === "closed") return { alreadyClosed: true, deleted: 0 };

    // Explicitly revoke every live session at the lifecycle boundary before the
    // generic deletion pass removes session rows. This keeps revocation semantics
    // independently testable and prevents a future cleanup refactor from weakening closure.
    closureIntegrity.revokeUserSessions(db, userId, now, "account_closed");

    let deleted = 0;
    if (closureIntegrity.tableExists(db, "money_store_ajo_accounts")) {
      const reserved = db.prepare("SELECT productId, COUNT(*) AS count FROM money_store_ajo_accounts WHERE userId=? AND status='saving' GROUP BY productId").all(userId);
      for (const row of reserved) productStock.release(db, { productId: row.productId, qty: Number(row.count), now });
    }

    if (vendorSubscriptions && typeof vendorSubscriptions.closeVendorForAccount === "function") vendorSubscriptions.closeVendorForAccount(db, userId, new Date(now), true);

    // OAuth provider handoff codes are short-lived authentication credentials;
    // retire them explicitly during account closure so a pre-closure code cannot
    // survive the identity lifecycle boundary.
    if (closureIntegrity.tableExists(db, "google_auth_codes")) {
      deleted += db.prepare("DELETE FROM google_auth_codes WHERE userId=?").run(userId).changes;
    }

    // B352: Dami adaptive-learning records are user-owned personal data. They
    // must terminate with the account rather than surviving as orphaned memory.
    for (const table of ["ai_learning_events", "ai_learning_feedback", "ai_learning_patterns", "ai_learning_followups", "ai_learning_memory"]) {
      if (closureIntegrity.tableExists(db, table)) {
        deleted += db.prepare(`DELETE FROM ${table} WHERE userId=?`).run(userId).changes;
      }
    }

    if (closureIntegrity.tableExists(db, "notification_deliveries") && closureIntegrity.tableExists(db, "notification_events")) {
      deleted += db.prepare("DELETE FROM notification_deliveries WHERE eventId IN (SELECT id FROM notification_events WHERE userId=?)").run(userId).changes;
    }

    // Delete direct messages before deleting their threads so no orphaned message rows remain.
    deleted += closureIntegrity.cleanupDirectMessages(db, userId);
    deleted += closureIntegrity.cleanupChatRooms(db, userId);
    deleted += closureIntegrity.transferOrCloseMoneyGroups(db, userId, now);

    // Pending Store Ajo records have no settled funds after the blocker check; remove them with the personal workspace data.
    // B131: only tables with an explicit userId owner use the generic predicate.
    // Relationship tables with buyer/seller/reporter/owner/vendor columns are
    // cleaned by the audited, explicit predicate set below.
    for (const table of DELETE_USER_TABLES) {
      const exists = closureIntegrity.tableExists(db, table);
      if (!exists) continue;
      const columns = db.prepare(`PRAGMA table_info(${table})`).all().map(c => c.name);
      if (!columns.includes("userId")) continue;
      deleted += db.prepare(`DELETE FROM ${table} WHERE userId=?`).run(userId).changes;
    }
    deleted += closureIntegrity.cleanupNonUserIdClosureArtifacts(db, userId);
    deleted += closureIntegrity.cleanupRetainedSellerArtifacts(db, userId, now);

    // Wallet transaction/ledger history is retained as financial integrity evidence.
    deleted += closureIntegrity.redactWalletHistory(db, userId, now);
    deleted += closureIntegrity.closeWalletAccounts(db, userId, now);
    deleted += closureIntegrity.cleanupRateLimitState(db, userId);
    deleted += closureIntegrity.cleanupVendorStaff(db, userId, now);

    if (closureIntegrity.tableExists(db, "group_call_sessions")) {
      const groupCallIds = db.prepare("SELECT id FROM group_call_sessions WHERE hostId=? OR id IN (SELECT callId FROM group_call_participants WHERE userId=?)").all(userId,userId).map(r=>r.id);
      for (const callId of groupCallIds) db.prepare("DELETE FROM group_call_signals WHERE callId=?").run(callId);
      for (const callId of groupCallIds) db.prepare("DELETE FROM group_call_participants WHERE callId=?").run(callId);
      for (const callId of groupCallIds) deleted += db.prepare("DELETE FROM group_call_sessions WHERE id=?").run(callId).changes;
    }
    if (closureIntegrity.tableExists(db, "call_sessions")) {
      const callIds = db.prepare("SELECT id FROM call_sessions WHERE callerId=? OR calleeId=?").all(userId,userId).map(r=>r.id);
      for (const callId of callIds) { db.prepare("DELETE FROM call_signals WHERE callId=?").run(callId); db.prepare("DELETE FROM call_participants WHERE callId=?").run(callId); }
      deleted += db.prepare("DELETE FROM call_sessions WHERE callerId=? OR calleeId=?").run(userId,userId).changes;
    }

    for (const stmt of [
      "DELETE FROM friend_requests WHERE fromUserId=? OR toUserId=?",
      "DELETE FROM friendships WHERE userId=? OR friendId=?",
      "DELETE FROM blocks WHERE blockerId=? OR blockedId=?"
    ]) {
      const table = stmt.match(/FROM (\w+)/)?.[1];
      if (table && closureIntegrity.tableExists(db, table)) deleted += db.prepare(stmt).run(userId,userId).changes;
    }

    const anon = `closed_${crypto.createHash("sha256").update(String(userId)).digest("hex").slice(0,16)}@invalid.nexa`;
    db.prepare("UPDATE users SET email=?,passwordHash=?,name=?,username=NULL,profileBio='',avatarUrl=NULL,profileVisibility='private',authProvider='password',authProviderSubject=NULL,emailVerified=0,zeezaShareToken=NULL,zeezaExploreOptIn=0,zeezaExploreCountry=NULL,zeezaExploreCity=NULL,zeezaExploreTermsVersion=NULL,zeezaExploreTermsAt=NULL,zeezaExploreLocationChangedAt=NULL,zeezaChaseAge=NULL,zeezaChaseNationality=NULL,zeezaChaseHeightCm=NULL,zeezaChaseJobType=NULL,accountStatus='closed',closedAt=? WHERE id=?")
      .run(anon, crypto.randomBytes(32).toString("hex"), "Closed NEXA account", now, userId);
    return { alreadyClosed: false, deleted };
  });
  return tx();
}



module.exports = { DELETE_USER_TABLES, RETAINED_USER_TABLES, ensureColumns, verifyClosurePassword, closeAccount, closureBlockerError };
