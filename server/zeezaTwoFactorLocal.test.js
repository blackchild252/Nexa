"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { createLocalZeezaTwoFactor } = require("./zeezaTwoFactorLocal");

function fixture() {
  let time = 1_800_000_000_000;
  const notices = [];
  const revoked = [];
  const issued = new Map();
  const service = createLocalZeezaTwoFactor({
    now: () => time,
    verifyFactorControl: ({ proof }) => proof === "verified-local-proof",
    deliverChallenge: ({ challengeId, challengeSecret }) => { issued.set(challengeId, challengeSecret); return true; },
    notifyOwner: event => notices.push(event),
    revokeSessions: event => revoked.push(event),
    challengeTtlMs: 1000,
    maxAttempts: 2,
    throttleMs: 5000,
  });
  return { service, notices, revoked, issued, advance: ms => { time += ms; } };
}

test("enrollment requires proof of control and exposes no live delivery claim", async () => {
  const { service, notices } = fixture();
  await assert.rejects(service.enrollFactor({ accountId: "a1", sessionId: "s1", factorType: "email", destination: "a@example.test", proof: "wrong" }), { code: "LOCAL_2FA_FACTOR_CONTROL_UNAVAILABLE" });
  const result = await service.enrollFactor({ accountId: "a1", sessionId: "s1", factorType: "email", destination: "a@example.test", proof: "verified-local-proof" });
  assert.equal(result.ok, true);
  assert.equal(result.delivery, "not-configured-local-only");
  assert.deepEqual(service.listFactors("a1").map(x => x.factorType), ["email"]);
  assert.equal(notices[0].event, "factor_enrolled");
});

test("challenge is bound to account, session and purpose and is single use", async () => {
  const { service, issued } = fixture();
  await service.enrollFactor({ accountId: "a1", sessionId: "s1", factorType: "zeeza", destination: "zeeza:a1", proof: "verified-local-proof" });
  const challenge = service.createChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", factorType: "zeeza" });
  const proof = issued.get(challenge.challengeId);
  assert.equal(service.verifyChallenge({ accountId: "a2", sessionId: "s1", purpose: "sign-in", ...challenge, challengeSecret: proof }).ok, false);
  assert.equal(service.verifyChallenge({ accountId: "a1", sessionId: "s2", purpose: "sign-in", ...challenge, challengeSecret: proof }).ok, false);
  assert.equal(service.verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "step-up", ...challenge, challengeSecret: proof }).ok, false);
  assert.equal(service.verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", ...challenge, challengeSecret: proof }).ok, true);
  assert.equal(service.verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", ...challenge, challengeSecret: proof }).code, "2FA_CHALLENGE_REPLAYED");
});

test("expired challenges and repeated failures are rejected and throttled", async () => {
  const { service, advance, issued } = fixture();
  await service.enrollFactor({ accountId: "a1", sessionId: "s1", factorType: "email", destination: "a@example.test", proof: "verified-local-proof" });
  const expired = service.createChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", factorType: "email" });
  advance(1001);
  assert.equal(service.verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", ...expired, challengeSecret: issued.get(expired.challengeId) }).code, "2FA_CHALLENGE_EXPIRED");
  const next = service.createChallenge({ accountId: "a1", sessionId: "s1", purpose: "step-up", factorType: "email" });
  service.verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "step-up", challengeId: next.challengeId, challengeSecret: "wrong" });
  service.verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "step-up", challengeId: next.challengeId, challengeSecret: "wrong" });
  assert.throws(() => service.createChallenge({ accountId: "a1", sessionId: "s1", purpose: "step-up", factorType: "email" }), { code: "2FA_RATE_LIMITED" });
});

test("recovery never silently bypasses 2FA; valid recovery requires explicit proof", async () => {
  const { service, notices } = fixture();
  await assert.rejects(Promise.resolve().then(() => service.recoverFactor({ accountId: "a1", sessionId: "s1", purpose: "recovery", recoveryProof: "", verifyRecoveryProof: () => true })), { code: "2FA_RECOVERY_DENIED" });
  const result = service.recoverFactor({ accountId: "a1", sessionId: "s1", purpose: "recovery", recoveryProof: "recovery-token", verifyRecoveryProof: ({ recoveryProof }) => recoveryProof === "recovery-token" });
  assert.equal(result.factorChangeRequired, true);
  assert.equal(notices.at(-1).event, "factor_recovery_used");
  assert.throws(() => service.recoverFactor({ accountId: "a1", sessionId: "s1", purpose: "recovery", recoveryProof: "recovery-token", verifyRecoveryProof: () => true }), { code: "2FA_RECOVERY_DENIED" });
});

test("factor removal requires a proof, and verified sessions can be revoked with audit context", async () => {
  const { service, revoked, notices, issued } = fixture();
  await service.enrollFactor({ accountId: "a1", sessionId: "s1", factorType: "email", destination: "a@example.test", proof: "verified-local-proof" });
  const c = service.createChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", factorType: "email" });
  service.verifyChallenge({ accountId: "a1", sessionId: "s1", purpose: "sign-in", ...c, challengeSecret: issued.get(c.challengeId) });
  await assert.rejects(service.removeFactor({ accountId: "a1", sessionId: "s1", factorType: "email" }), { code: "2FA_FACTOR_REMOVAL_DENIED" });
  assert.equal((await service.removeFactor({ accountId: "a1", sessionId: "s1", factorType: "email", proof: "verified-local-proof" })).removed, true);
  assert.equal(notices.at(-1).event, "factor_removed");
  assert.equal(revoked[0].reason, "factor_removed");
  assert.equal(revoked[0].allActiveSessionsRequired, false);
  const result = service.revokeAccountSessions({ accountId: "a1", reason: "suspected compromise" });
  assert.equal(result.locallyClearedCount, 0);
  assert.equal(result.accountWideRevocationRequested, true);
  assert.equal(revoked.at(-1).allActiveSessionsRequired, true);
  assert.equal(revoked.at(-1).reason, "suspected compromise");
});

test("a fresh login session requires its own newly issued Zeeza challenge; a previous session proof cannot be reused", async () => {
  const { service, issued } = fixture();
  await service.enrollFactor({ accountId: "employee-1", sessionId: "enrollment-session", factorType: "zeeza", destination: "zeeza:employee-1", proof: "verified-local-proof" });
  const oldLogin = service.createChallenge({ accountId: "employee-1", sessionId: "login-session-1", purpose: "sign-in", factorType: "zeeza" });
  const oldProof = issued.get(oldLogin.challengeId);
  assert.equal(service.verifyChallenge({ accountId: "employee-1", sessionId: "login-session-1", purpose: "sign-in", ...oldLogin, challengeSecret: oldProof }).ok, true);
  assert.equal(service.verifyChallenge({ accountId: "employee-1", sessionId: "login-session-2", purpose: "sign-in", ...oldLogin, challengeSecret: oldProof }).ok, false);
  const freshLogin = service.createChallenge({ accountId: "employee-1", sessionId: "login-session-2", purpose: "sign-in", factorType: "zeeza" });
  assert.notEqual(freshLogin.challengeId, oldLogin.challengeId);
  assert.equal(service.verifyChallenge({ accountId: "employee-1", sessionId: "login-session-2", purpose: "sign-in", ...freshLogin, challengeSecret: issued.get(freshLogin.challengeId) }).ok, true);
});

test("Zeeza verification remains explicitly local-only when real inbox delivery is not configured", async () => {
  const { service } = fixture();
  await service.enrollFactor({ accountId: "employee-2", sessionId: "enrollment-session", factorType: "zeeza", destination: "zeeza:employee-2", proof: "verified-local-proof" });
  const challenge = service.createChallenge({ accountId: "employee-2", sessionId: "login-session", purpose: "sign-in", factorType: "zeeza" });
  assert.equal(challenge.delivery, "local-test-adapter");
  assert.equal(Object.hasOwn(challenge, "challengeSecret"), false);
});
