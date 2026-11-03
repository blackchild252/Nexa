"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createSqliteZeezaTwoFactor } = require("./zeezaTwoFactorSqlite");

function fakeDb() {
  const rows = new Map();
  const key = (ns, id) => `${ns}\0${id}`;
  return {
    rows,
    exec(sql) { assert.match(sql, /CREATE TABLE IF NOT EXISTS zeeza_two_factor_state/); },
    prepare(sql) {
      return {
        get(...args) {
          if (sql.includes("SELECT valueJson, consumedAt")) {
            const row = rows.get(key(args[0], args[1]));
            return row ? { valueJson: row.valueJson, consumedAt: row.consumedAt } : undefined;
          }
          if (sql.includes("SELECT 1 AS found")) return rows.has(key(args[0], args[1])) ? { found: 1 } : undefined;
          return undefined;
        },
        all(...args) {
          const ns = args[0];
          return [...rows.entries()].filter(([k]) => k.startsWith(`${ns}\0`)).map(([k, row]) => ({
            stateKey: k.slice(ns.length + 1), valueJson: row.valueJson, consumedAt: row.consumedAt,
          }));
        },
        run(...args) {
          if (sql.includes("UPDATE zeeza_two_factor_state SET consumedAt=?")) {
            const row = rows.get(key("challenges", args[2]));
            if (!row || row.consumedAt != null) return { changes: 0 };
            row.consumedAt = args[0]; row.updatedAt = args[1]; return { changes: 1 };
          }
          if (sql.includes("INSERT OR IGNORE INTO zeeza_two_factor_state")) {
            const k = key("consumedRecoveryProofs", args[0]);
            if (rows.has(k)) return { changes: 0 };
            rows.set(k, { valueJson: args[1], updatedAt: args[2], consumedAt: null }); return { changes: 1 };
          }
          if (sql.includes("INSERT INTO zeeza_two_factor_state")) {
            const [ns, id, valueJson, updatedAt, consumedAt] = args;
            rows.set(key(ns, id), { valueJson, updatedAt, consumedAt }); return { changes: 1 };
          }
          if (sql.includes("DELETE FROM zeeza_two_factor_state")) return { changes: rows.delete(key(args[0], args[1])) ? 1 : 0 };
          return { changes: 0 };
        },
      };
    },
  };
}

function make(db, issued = new Map()) {
  return createSqliteZeezaTwoFactor({
    db,
    now: () => 1_800_000_000_000,
    verifyFactorControl: ({ proof }) => proof === "control-proof",
    deliverChallenge: ({ challengeId, challengeSecret }) => { issued.set(challengeId, challengeSecret); return true; },
  });
}

test("SQLite 2FA state survives service recreation without storing raw factor destinations or recovery proofs", async () => {
  const db = fakeDb();
  const first = make(db);
  await first.enrollFactor({ accountId: "a1", sessionId: "s1", factorType: "email", destination: "owner@example.test", proof: "control-proof" });
  const second = make(db);
  assert.deepEqual(second.listFactors("a1").map(x => x.factorType), ["email"]);
  const serialized = [...db.rows.values()].map(row => row.valueJson).join(" ");
  assert.equal(serialized.includes("owner@example.test"), false);
});

test("SQLite challenge consume is single-use across service instances", async () => {
  const db = fakeDb();
  const issued = new Map();
  const first = make(db, issued);
  await first.enrollFactor({ accountId: "a1", sessionId: "s1", factorType: "zeeza", destination: "zeeza:a1", proof: "control-proof" });
  const challenge = first.createChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", factorType: "zeeza" });
  const secret = issued.get(challenge.challengeId);
  assert.equal(make(db).verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", challengeId: challenge.challengeId, challengeSecret: secret }).ok, true);
  assert.equal(make(db).verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", challengeId: challenge.challengeId, challengeSecret: secret }).code, "2FA_CHALLENGE_REPLAYED");
});

test("SQLite recovery proof digest is consumed once across service instances", async () => {
  const db = fakeDb();
  const input = { accountId: "a1", sessionId: "s1", purpose: "recovery", recoveryProof: "recovery-secret", verifyRecoveryProof: ({ recoveryProof }) => recoveryProof === "recovery-secret" };
  assert.equal(make(db).recoverFactor(input).factorChangeRequired, true);
  assert.throws(() => make(db).recoverFactor(input), { code: "2FA_RECOVERY_DENIED" });
  const serialized = [...db.rows.entries()].filter(([key]) => key.startsWith("consumedRecoveryProofs\0")).map(([, row]) => row.valueJson).join("");
  assert.equal(serialized.includes("recovery-secret"), false);
});
