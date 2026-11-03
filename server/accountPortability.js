"use strict";

const crypto = require("crypto");
const privacyAuthorization = require("./v5_63_0_privacy_authorization");
const importIntegrity = require("./v5_78_0_account_import_integrity");
const lifecycleMaturity = require("./v5_93_0_account_privacy_maturity");
const { getCurrency } = require("./currencyModel");

const EXPORT_VERSION = 2;
const SUPPORTED_IMPORT_VERSIONS = Object.freeze([1, 2]);
const MAX_BUNDLE_BYTES = 2 * 1024 * 1024;
const MAX_ROWS_PER_TABLE = 5000;
const MAX_EXPORT_BYTES = MAX_BUNDLE_BYTES;

// Deliberately excludes sessions, passwords, API-key material, provider payment
// records, vendor credentials, push tokens, and system/admin data.
const TABLES = Object.freeze([
  "ai_voice_preferences", "ai_avatar", "ai_personalization", "ai_memory_settings", "ai_memories", "ai_plans",
  "expenses", "debts", "financial_budgets", "financial_goals", "financial_goal_contributions", "financial_planning_settings", "market_insight_preferences", "notification_preferences", "user_currency_preferences", "user_regional_preferences",
  "favorites", "scam_checks", "ai_workflows", "ai_workflow_runs", "ai_calendar_events",
  "ai_tasks", "ai_notes", "ai_knowledge", "yaayz_preferences"
]);

function tableColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().map((r) => r.name);
}

function primaryKeyColumns(db, table) {
  return db.prepare(`PRAGMA table_info(${table})`).all().filter((r) => r.pk > 0).sort((a,b) => a.pk-b.pk).map((r) => r.name);
}

function buildBundle(db, userId) {
  const user = db.prepare("SELECT id,email,name,username,profileBio,avatarUrl,profileVisibility,zeezaExploreOptIn,allowFriendRequests,allowInboxRequests,createdAt,accountStatus FROM users WHERE id=?").get(userId);
  if (!user) throw new Error("Account not found.");
  if (user.accountStatus === "closed") throw new Error("Closed accounts cannot be exported.");
  const data = {};
  for (const table of TABLES) {
    const rows = db.prepare(`SELECT * FROM ${table} WHERE userId = ? LIMIT ?`).all(userId, MAX_ROWS_PER_TABLE + 1);
    if (rows.length > MAX_ROWS_PER_TABLE) throw new Error(`Account export contains too many rows for ${table}.`);
    data[table] = rows;
  }
  // Adaptive Dami learning is portable as user-owned preference/learning data,
  // but it is deliberately kept outside the generic import table allowlist.
  // Learning records contain profile/event lineage that must never be trusted
  // as import authority. Export preserves the user's copy without making it
  // possible to inject foreign ownership or server events through import.
  const learningTables = ["ai_learning_memory", "ai_learning_patterns", "ai_learning_followups", "ai_learning_feedback", "ai_learning_events"];
  const learning = {};
  for (const table of learningTables) {
    const exists = db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table);
    if (!exists) { learning[table] = []; continue; }
    const rows = db.prepare(`SELECT * FROM ${table} WHERE userId = ? LIMIT ?`).all(userId, MAX_ROWS_PER_TABLE + 1);
    if (rows.length > MAX_ROWS_PER_TABLE) throw new Error(`Account export contains too many rows for ${table}.`);
    learning[table] = rows;
  }
  const bundle = {
    format: "nexa-account-export",
    exportVersion: EXPORT_VERSION,
    schema: "account-portability-v2",
    privacyPolicyVersion: require("./accountSecurity").PRIVACY_POLICY_VERSION,
    exportedAt: new Date().toISOString(),
    account: privacyAuthorization.exportSafeAccount({ id: user.id, name: user.name, username: user.username || null, profileBio: user.profileBio || "", avatarUrl: user.avatarUrl || null, profileVisibility: user.profileVisibility || "friends", discoverable: Boolean(user.zeezaExploreOptIn), allowFriendRequests: user.allowFriendRequests !== 0, allowInboxRequests: user.allowInboxRequests !== 0, createdAt: user.createdAt }),
    data,
    learning: { profile: "consumer_dami", data: learning },
  };
  const integrityBundle = lifecycleMaturity.attachBundleIntegrity(bundle);
  const encoded = JSON.stringify(integrityBundle);
  if (Buffer.byteLength(encoded, "utf8") > MAX_EXPORT_BYTES) throw new Error("Account export is too large.");
  return integrityBundle;
}

function migrateBundle(bundle) {
  if (!bundle || bundle.format !== "nexa-account-export") throw new Error("Unsupported NEXA account export format.");
  const version = Number(bundle.exportVersion);
  if (!SUPPORTED_IMPORT_VERSIONS.includes(version)) throw new Error("Unsupported NEXA account export format.");
  const migrated = JSON.parse(JSON.stringify(bundle));
  const integrity = lifecycleMaturity.verifyBundleIntegrity(migrated);
  if (!integrity.valid) throw Object.assign(new Error("Account export integrity check failed."), { code: "INVALID_EXPORT_INTEGRITY" });
  migrated.exportVersion = EXPORT_VERSION;
  migrated.schema = "account-portability-v2";
  migrated.data = migrated.data && typeof migrated.data === "object" ? migrated.data : {};
  // V1 exports predate portable personalization. Missing tables are intentionally
  // treated as safe defaults rather than as a reason to reject the whole account.
  if (version === 1 && !Object.prototype.hasOwnProperty.call(migrated.data, "ai_personalization")) {
    migrated.data.ai_personalization = [];
  }
  if (version === 1 || version === 2) {
    if (migrated.integrity) migrated.integrity = lifecycleMaturity.attachBundleIntegrity(migrated).integrity;
  }
  return migrated;
}

function assertBundle(bundle) {
  privacyAuthorization.assertImportMetadata(bundle);
  const migrated = migrateBundle(bundle);
  const encoded = JSON.stringify(migrated);
  if (Buffer.byteLength(encoded, "utf8") > MAX_BUNDLE_BYTES) throw new Error("Account export is too large.");
  if (!migrated.data || typeof migrated.data !== "object") throw new Error("Account export data is missing.");
  for (const table of Object.keys(migrated.data)) {
    if (!TABLES.includes(table)) throw new Error(`Import does not allow table: ${table}`);
    if (!Array.isArray(migrated.data[table]) || migrated.data[table].length > MAX_ROWS_PER_TABLE) throw new Error(`Invalid row set for ${table}.`);
    if (table === "user_currency_preferences") {
      if (migrated.data[table].length > 1) throw new Error("Invalid user currency preference row set.");
      for (const row of migrated.data[table]) {
        if (!row || !getCurrency(row.displayCurrency)) throw new Error("Account export contains an unsupported display currency.");
        if (row.countryCode != null && !/^[A-Z]{2}$/.test(String(row.countryCode))) throw new Error("Account export contains an invalid currency preference country code.");
      }
    }
    if (table === "user_regional_preferences") {
      if (migrated.data[table].length > 1) throw new Error("Invalid user regional preference row set.");
      const regionalPreferences = require("./regionalPreferences");
      for (const row of migrated.data[table]) { try { if (!row) throw new Error("missing row"); regionalPreferences.normalize(row); } catch (_) { throw new Error("Account export contains an unsupported regional preference."); } }
    }
  }
  return migrated;
}

function preflightImport(db, userId, bundle) {
  const migrated = assertBundle(bundle);
  return importIntegrity.preflight(db, userId, migrated, { tables: TABLES });
}

function importBundle(db, userId, bundle) {
  const target = db.prepare("SELECT accountStatus FROM users WHERE id=?").get(userId);
  if (!target || target.accountStatus === "closed") throw new Error("Closed accounts cannot import data.");
  const migrated = preflightImport(db, userId, bundle);
  const summary = {};
  db.transaction(() => {
    for (const table of TABLES) {
      const tableExists = db.prepare("SELECT 1 FROM sqlite_master WHERE type=\'table\' AND name=?").get(table);
      if (!tableExists) { summary[table] = 0; continue; }
      const rows = migrated.data[table] || [];
      if (!rows.length) { summary[table] = 0; continue; }
      const columns = tableColumns(db, table);
      if (!columns.includes("userId")) throw new Error(`Portable table ${table} is missing user ownership.`);
      const pks = primaryKeyColumns(db, table);
      if (!pks.length) throw new Error(`Portable table ${table} has no primary key.`);
      const writable = columns.filter((c) => c !== "userId");
      const placeholders = columns.map(() => "?").join(",");
      const updateColumns = writable.filter((c) => !pks.includes(c));
      for (const input of rows) {
        if (!input || typeof input !== "object") throw new Error(`Invalid ${table} row.`);
        const row = {};
        for (const pk of pks) if (input[pk] == null || input[pk] === '') throw new Error(`Invalid ${table} row: primary key is required.`);
        for (const c of columns) if (c !== "userId" && Object.prototype.hasOwnProperty.call(input, c)) row[c] = input[c];
        const pkWhere = pks.map((c) => `${c}=?`).join(" AND ");
        const existing = db.prepare(`SELECT userId FROM ${table} WHERE ${pkWhere}`).get(...pks.map((c) => row[c]));
        if (existing && String(existing.userId) !== String(userId)) throw new Error(`Import refused: ${table} contains an identifier owned by another account.`);
        const values = columns.map((c) => c === "userId" ? userId : row[c] ?? null);
        if (existing) {
          if (updateColumns.length) {
            const set = updateColumns.map((c) => `${c}=?`).join(",");
            db.prepare(`UPDATE ${table} SET ${set} WHERE ${pkWhere} AND userId=?`).run(...updateColumns.map((c) => row[c] ?? null), ...pks.map((c) => row[c]), userId);
          }
        } else {
          db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${placeholders})`).run(...values);
        }
      }
      summary[table] = rows.length;
    }
    const account = bundle.account && typeof bundle.account === "object" ? bundle.account : null;
    if (account) {
      const name = String(account.name || "").trim().slice(0,80);
      const bio = String(account.profileBio || "").slice(0,500);
      const visibility = ["public","friends","private"].includes(String(account.profileVisibility)) ? String(account.profileVisibility) : null;
      const discoverable = typeof account.discoverable === "boolean" ? (account.discoverable ? 1 : 0) : null;
      const allowFriendRequests = typeof account.allowFriendRequests === "boolean" ? (account.allowFriendRequests ? 1 : 0) : null;
      const allowInboxRequests = typeof account.allowInboxRequests === "boolean" ? (account.allowInboxRequests ? 1 : 0) : null;
      if (name || bio || visibility || discoverable !== null || allowFriendRequests !== null || allowInboxRequests !== null) {
        db.prepare("UPDATE users SET name=COALESCE(NULLIF(?,''),name), profileBio=?, profileVisibility=COALESCE(?,profileVisibility), zeezaExploreOptIn=COALESCE(?,zeezaExploreOptIn), allowFriendRequests=COALESCE(?,allowFriendRequests), allowInboxRequests=COALESCE(?,allowInboxRequests) WHERE id=?").run(name, bio, visibility, discoverable, allowFriendRequests, allowInboxRequests, userId);
      }
    }
  })();
  return { imported: summary, checksum: lifecycleMaturity.bundleChecksum(migrated), exportVersion: EXPORT_VERSION, integrity: lifecycleMaturity.verifyBundleIntegrity(migrated) };
}

function validateBundle(bundle) { return assertBundle(bundle); }

module.exports = { EXPORT_VERSION, SUPPORTED_IMPORT_VERSIONS, TABLES, MAX_BUNDLE_BYTES, MAX_EXPORT_BYTES, MAX_ROWS_PER_TABLE, buildBundle, migrateBundle, importBundle, assertBundle, validateBundle, preflightImport, bundleChecksum: lifecycleMaturity.bundleChecksum };
