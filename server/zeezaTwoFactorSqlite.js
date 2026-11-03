"use strict";

const { createLocalZeezaTwoFactor } = require("./zeezaTwoFactorLocal");

const TABLE_SQL = `CREATE TABLE IF NOT EXISTS zeeza_two_factor_state (
  namespace TEXT NOT NULL,
  stateKey TEXT NOT NULL,
  valueJson TEXT NOT NULL,
  updatedAt INTEGER NOT NULL,
  consumedAt INTEGER,
  PRIMARY KEY(namespace, stateKey)
)`;

function createSqliteMap(db, namespace, now) {
  return {
    get(key) {
      const row = db.prepare("SELECT valueJson, consumedAt FROM zeeza_two_factor_state WHERE namespace=? AND stateKey=?").get(namespace, String(key));
      if (!row) return undefined;
      let value;
      try { value = JSON.parse(row.valueJson); } catch (_) { return undefined; }
      if (namespace === "challenges" && row.consumedAt != null) value.consumedAt = Number(row.consumedAt);
      return value;
    },
    has(key) {
      return Boolean(db.prepare("SELECT 1 AS found FROM zeeza_two_factor_state WHERE namespace=? AND stateKey=? LIMIT 1").get(namespace, String(key)));
    },
    set(key, value) {
      const consumedAt = namespace === "challenges" && value && Number.isFinite(value.consumedAt) ? value.consumedAt : null;
      db.prepare(`INSERT INTO zeeza_two_factor_state(namespace,stateKey,valueJson,updatedAt,consumedAt)
        VALUES(?,?,?,?,?) ON CONFLICT(namespace,stateKey) DO UPDATE SET
        valueJson=excluded.valueJson, updatedAt=excluded.updatedAt, consumedAt=excluded.consumedAt`)
        .run(namespace, String(key), JSON.stringify(value), now(), consumedAt);
      return this;
    },
    delete(key) {
      return db.prepare("DELETE FROM zeeza_two_factor_state WHERE namespace=? AND stateKey=?").run(namespace, String(key)).changes > 0;
    },
    values() {
      return db.prepare("SELECT valueJson, consumedAt FROM zeeza_two_factor_state WHERE namespace=?").all(namespace)
        .map(row => {
          let value; try { value = JSON.parse(row.valueJson); } catch (_) { return null; }
          if (namespace === "challenges" && row.consumedAt != null) value.consumedAt = Number(row.consumedAt);
          return value;
        }).filter(value => value !== null);
    },
    entries() {
      return db.prepare("SELECT stateKey, valueJson, consumedAt FROM zeeza_two_factor_state WHERE namespace=?").all(namespace)
        .map(row => {
          let value; try { value = JSON.parse(row.valueJson); } catch (_) { return null; }
          if (namespace === "challenges" && row.consumedAt != null) value.consumedAt = Number(row.consumedAt);
          return value === null ? null : [row.stateKey, value];
        }).filter(Boolean);
    },
  };
}

/**
 * SQLite-backed state adapter for the Zeeza 2FA contract engine.
 * Stores destination/recovery/challenge digests, never raw recovery proofs.
 * The caller must pass the application's already-open SQLite connection and
 * explicitly wire the returned service into authenticated routes before calling it production-ready.
 */
function createSqliteZeezaTwoFactor({ db, now = () => Date.now(), ...options } = {}) {
  if (!db || typeof db.prepare !== "function" || typeof db.exec !== "function") {
    const err = new TypeError("An initialized SQLite database is required."); err.code = "2FA_SQLITE_DATABASE_REQUIRED"; throw err;
  }
  db.exec(TABLE_SQL);
  const state = {
    factors: createSqliteMap(db, "factors", now),
    challenges: createSqliteMap(db, "challenges", now),
    attempts: createSqliteMap(db, "attempts", now),
    sessions: createSqliteMap(db, "sessions", now),
    consumedRecoveryProofs: createSqliteMap(db, "consumedRecoveryProofs", now),
    consumeChallenge(challengeId, consumedAt) {
      return db.prepare(`UPDATE zeeza_two_factor_state SET consumedAt=?, updatedAt=?
        WHERE namespace='challenges' AND stateKey=? AND consumedAt IS NULL`)
        .run(consumedAt, now(), String(challengeId)).changes === 1;
    },
    consumeRecoveryProof(key, consumedAt) {
      return db.prepare(`INSERT OR IGNORE INTO zeeza_two_factor_state
        (namespace,stateKey,valueJson,updatedAt,consumedAt) VALUES('consumedRecoveryProofs',?,?,?,NULL)`)
        .run(String(key), JSON.stringify(consumedAt), now()).changes === 1;
    },
  };
  return createLocalZeezaTwoFactor({ ...options, now, state });
}

module.exports = { createSqliteZeezaTwoFactor, createSqliteMap, TABLE_SQL };
