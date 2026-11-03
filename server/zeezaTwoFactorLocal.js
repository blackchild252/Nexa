"use strict";

const crypto = require("node:crypto");

const hash = value => crypto.createHash("sha256").update(String(value)).digest("hex");
const constantTimeEqual = (left, right) => {
  const a = Buffer.from(String(left)); const b = Buffer.from(String(right));
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};
const token = (bytes = 32) => crypto.randomBytes(bytes).toString("base64url");

/**
 * Local-only Zeeza 2FA contract engine.
 * It never sends email/chat messages or persists secrets. A caller must inject
 * local test adapters to prove factor control; production delivery is intentionally
 * not configured in this local-only build.
 */
function createLocalZeezaTwoFactor({
  now = () => Date.now(),
  verifyFactorControl,
  deliverChallenge = null,
  notifyOwner = () => {},
  revokeSessions = () => {},
  challengeTtlMs = 5 * 60 * 1000,
  maxAttempts = 5,
  throttleMs = 15 * 60 * 1000,
  state = null,
} = {}) {
  // A persistence adapter can supply Map-compatible collections. The default remains
  // process-local for contract tests; production callers must explicitly inject durable state.
  const factors = state?.factors || new Map();
  const challenges = state?.challenges || new Map();
  const attempts = state?.attempts || new Map();
  const sessions = state?.sessions || new Map();
  const consumedRecoveryProofs = state?.consumedRecoveryProofs || new Map();

  const accountKey = (accountId, factorType) => `${String(accountId)}:${factorType}`;
  const attemptKey = (accountId, purpose) => `${String(accountId)}:${String(purpose)}`;
  const assertIdentity = (accountId, sessionId, purpose) => {
    if (typeof accountId !== "string" || !accountId.trim() || typeof sessionId !== "string" || !sessionId.trim() || typeof purpose !== "string" || !purpose.trim()) {
      const err = new Error("Account, session and purpose are required."); err.code = "2FA_CONTEXT_REQUIRED"; throw err;
    }
  };
  const assertNotThrottled = key => {
    const record = attempts.get(key);
    if (record && record.blockedUntil > now()) {
      const err = new Error("Too many verification attempts. Try again later."); err.code = "2FA_RATE_LIMITED"; throw err;
    }
  };
  const recordFailure = key => {
    const record = attempts.get(key) || { count: 0, blockedUntil: 0 };
    record.count += 1;
    if (record.count >= maxAttempts) record.blockedUntil = now() + throttleMs;
    attempts.set(key, record);
  };
  const clearFailures = key => attempts.delete(key);

  async function enrollFactor({ accountId, sessionId, factorType, destination, proof }) {
    assertIdentity(accountId, sessionId, "factor-enrollment");
    if (!new Set(["email", "zeeza"]).has(factorType)) {
      const err = new Error("Unsupported factor type."); err.code = "2FA_FACTOR_UNSUPPORTED"; throw err;
    }
    if (typeof destination !== "string" || !destination.trim() || typeof proof !== "string" || !proof) {
      const err = new Error("Factor destination and proof are required."); err.code = "2FA_FACTOR_PROOF_REQUIRED"; throw err;
    }
    if (typeof verifyFactorControl !== "function" || !(await verifyFactorControl({ accountId, sessionId, factorType, destination, proof }))) {
      const err = new Error("Factor control could not be verified in local-only mode."); err.code = "LOCAL_2FA_FACTOR_CONTROL_UNAVAILABLE"; throw err;
    }
    const at = now();
    factors.set(accountKey(accountId, factorType), { accountId, factorType, destinationHash: hash(destination.trim().toLowerCase()), enabledAt: at, verified: true });
    notifyOwner({ accountId, event: "factor_enrolled", factorType, at, localOnly: true });
    return { ok: true, factorType, enabledAt: at, delivery: "not-configured-local-only" };
  }

  function listFactors(accountId) {
    return [...factors.values()].filter(item => item.accountId === accountId).map(({ factorType, enabledAt, verified }) => ({ factorType, enabledAt, verified }));
  }

  function createChallenge({ accountId, sessionId, purpose, factorType }) {
    assertIdentity(accountId, sessionId, purpose);
    const key = attemptKey(accountId, purpose);
    assertNotThrottled(key);
    const factor = factors.get(accountKey(accountId, factorType));
    if (!factor || !factor.verified) {
      const err = new Error("The requested factor is not enrolled and verified."); err.code = "2FA_FACTOR_NOT_ENROLLED"; throw err;
    }
    const challengeId = token(24);
    const challengeSecret = token(32);
    const createdAt = now();
    const expiresAt = createdAt + challengeTtlMs;
    challenges.set(challengeId, {
      accountId, sessionId, purpose, factorType, secretHash: hash(challengeSecret),
      createdAt, expiresAt, consumedAt: null, attempts: 0,
    });
    // Secret is passed only to an explicitly injected local adapter, never returned to UI/API callers.
    let delivered = false;
    if (typeof deliverChallenge === "function") delivered = deliverChallenge({ accountId, sessionId, purpose, factorType, challengeId, challengeSecret, expiresAt }) === true;
    return { challengeId, factorType, expiresAt, delivery: delivered ? "local-test-adapter" : "not-configured-local-only" };
  }

  function verifyChallenge({ accountId, sessionId, purpose, challengeId, challengeSecret }) {
    assertIdentity(accountId, sessionId, purpose);
    const key = attemptKey(accountId, purpose);
    assertNotThrottled(key);
    const record = challenges.get(challengeId);
    const matchesContext = record && record.accountId === accountId && record.sessionId === sessionId && record.purpose === purpose;
    if (!matchesContext || record.consumedAt || record.expiresAt <= now() || typeof challengeSecret !== "string" || !constantTimeEqual(hash(challengeSecret), record.secretHash)) {
      recordFailure(key);
      return { ok: false, code: record?.consumedAt ? "2FA_CHALLENGE_REPLAYED" : record?.expiresAt <= now() ? "2FA_CHALLENGE_EXPIRED" : "2FA_CHALLENGE_INVALID" };
    }
    const verifiedAt = now();
    if (typeof state?.consumeChallenge === "function") {
      if (!state.consumeChallenge(challengeId, verifiedAt)) {
        recordFailure(key);
        return { ok: false, code: "2FA_CHALLENGE_REPLAYED" };
      }
      record.consumedAt = verifiedAt;
    } else {
      record.consumedAt = verifiedAt;
      challenges.set(challengeId, record);
    }
    clearFailures(key);
    sessions.set(sessionId, { accountId, lastVerifiedAt: record.consumedAt, purpose });
    return { ok: true, accountId, sessionId, purpose, verifiedAt: record.consumedAt };
  }

  function recoverFactor({ accountId, sessionId, purpose, recoveryProof, verifyRecoveryProof }) {
    assertIdentity(accountId, sessionId, purpose);
    const proofHash = typeof recoveryProof === "string" && recoveryProof ? hash(recoveryProof) : "";
    const consumedKey = `${String(accountId)}:${proofHash}`;
    if (!proofHash || consumedRecoveryProofs.has(consumedKey) || typeof verifyRecoveryProof !== "function" || !verifyRecoveryProof({ accountId, sessionId, purpose, recoveryProof })) {
      const err = new Error("Recovery proof is unavailable, invalid or already used; second factor was not bypassed."); err.code = "2FA_RECOVERY_DENIED"; throw err;
    }
    // Persist only a digest. SQLite-backed adapters use INSERT OR IGNORE as the
    // cross-request atomic consume boundary; Map mode is local-process only.
    const consumedAt = now();
    if (typeof state?.consumeRecoveryProof === "function") {
      if (!state.consumeRecoveryProof(consumedKey, consumedAt)) {
        const err = new Error("Recovery proof is unavailable, invalid or already used; second factor was not bypassed."); err.code = "2FA_RECOVERY_DENIED"; throw err;
      }
    } else {
      consumedRecoveryProofs.set(consumedKey, consumedAt);
    }
    notifyOwner({ accountId, event: "factor_recovery_used", at: consumedAt, localOnly: true });
    return { ok: true, recoveryRequired: true, factorChangeRequired: true };
  }

  async function removeFactor({ accountId, sessionId, factorType, proof }) {
    if (typeof accountId !== "string" || !accountId || typeof sessionId !== "string" || !sessionId || typeof proof !== "string" || !proof) {
      const err = new Error("Authenticated account, session and proof are required."); err.code = "2FA_FACTOR_REMOVAL_DENIED"; throw err;
    }
    const key = accountKey(accountId, factorType);
    const factor = factors.get(key);
    if (!factor || typeof verifyFactorControl !== "function" || !(await verifyFactorControl({ accountId, sessionId, factorType, destinationHash: factor.destinationHash, proof, action: "remove" }))) {
      const err = new Error("Factor removal cannot be verified locally."); err.code = "2FA_FACTOR_REMOVAL_DENIED"; throw err;
    }
    factors.delete(key);
    const revokedSessionIds = [];
    for (const [verifiedSessionId, session] of sessions) {
      if (session.accountId === accountId) { sessions.delete(verifiedSessionId); revokedSessionIds.push(verifiedSessionId); }
    }
    if (revokedSessionIds.length) revokeSessions({ accountId, sessionIds: revokedSessionIds, allActiveSessionsRequired: false, reason: "factor_removed", at: now(), localOnly: true });
    notifyOwner({ accountId, event: "factor_removed", factorType, at: now(), localOnly: true });
    return { ok: true, removed: true, revokedSessionCount: revokedSessionIds.length };
  }

  function revokeAccountSessions({ accountId, reason }) {
    if (typeof accountId !== "string" || !accountId.trim() || typeof reason !== "string" || !reason.trim()) {
      const err = new Error("Account and revocation reason are required."); err.code = "2FA_SESSION_REVOCATION_CONTEXT_REQUIRED"; throw err;
    }
    const revoked = [];
    for (const [sessionId, session] of sessions) if (session.accountId === accountId) { sessions.delete(sessionId); revoked.push(sessionId); }
    revokeSessions({ accountId, sessionIds: revoked, allActiveSessionsRequired: true, reason, at: now(), localOnly: true });
    return { ok: true, locallyClearedCount: revoked.length, accountWideRevocationRequested: true };
  }

  return { enrollFactor, listFactors, createChallenge, verifyChallenge, recoverFactor, removeFactor, revokeAccountSessions };
}

module.exports = { createLocalZeezaTwoFactor };
