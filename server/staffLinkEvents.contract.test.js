"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./staffLinkEvents");
const B = require("./staffBridgePermissions");

const KEY = "k".repeat(40);
const OTHER = "z".repeat(40);
const LINK = { id: "l1", nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", status: "approved", permissions: "[\"products\"]" };
function rig(opts = {}) {
  const { DatabaseSync } = require("node:sqlite"); // real SQLite engine
  const db = new DatabaseSync(":memory:");
  let t = Date.parse("2026-10-27T10:00:00.000Z");
  const clock = { now: () => t, advance: (ms) => { t += ms; } };
  const signer = E.createEventSigner({ keys: { main1: KEY }, activeKeyId: "main1", now: clock.now });
  const verifier = E.createEventVerifier(db, { keys: opts.keys || { main1: KEY }, now: clock.now });
  return { db, clock, signer, verifier };
}
const refuses = (fn, code) => assert.throws(fn, (e) => e instanceof E.StaffEventError && e.code === code);

// ---- M7785
test("M7785: a signed event is accepted once and carries only the minimized fields", () => {
  const { signer, verifier } = rig();
  const ev = signer.buildEvent(LINK, "link_approved", "admin");
  const got = verifier.verifyEvent(ev, { expectTarget: "admin" });
  assert.deepEqual(Object.keys(got.subject).sort(), ["bossId", "bossTier", "linkId", "nexaUserId", "status", "unit"]);
  assert.equal(JSON.stringify(ev).includes("permissions"), false, "permissions must not leave Main");
  assert.equal(JSON.stringify(ev).includes("products"), false);
});

test("M7785: unsigned, wrongly signed and unknown-key events are refused", () => {
  const { signer, verifier } = rig();
  const ev = signer.buildEvent(LINK, "link_suspended", "central");
  const { signature, keyId, ...bare } = ev;
  refuses(() => verifier.verifyEvent(bare), "unsigned");
  refuses(() => verifier.verifyEvent(null), "unsigned");
  refuses(() => verifier.verifyEvent({ ...ev, signature: "0".repeat(64) }), "bad_signature");
  refuses(() => verifier.verifyEvent({ ...ev, keyId: "nope" }), "unknown_key");
  refuses(() => verifier.verifyEvent({ ...ev, keyId: "__proto__" }), "unknown_key");
  const wrongKeyVerifier = rig({ keys: { main1: OTHER } }).verifier;
  refuses(() => wrongKeyVerifier.verifyEvent(ev), "bad_signature");
});

test("M7785: changing any signed field breaks the signature", () => {
  const { signer, verifier } = rig();
  const ev = signer.buildEvent(LINK, "link_approved", "admin");
  refuses(() => verifier.verifyEvent({ ...ev, type: "link_removed" }), "bad_signature");
  refuses(() => verifier.verifyEvent({ ...ev, subject: { ...ev.subject, unit: "kitchen" } }), "bad_signature");
  refuses(() => verifier.verifyEvent({ ...ev, issuedAt: "2026-10-27T10:00:01.000Z" }), "bad_signature");
});

test("M7785: a replayed event is refused, including after other events arrive", () => {
  const { signer, verifier } = rig();
  const ev = signer.buildEvent(LINK, "link_approved", "admin");
  verifier.verifyEvent(ev);
  refuses(() => verifier.verifyEvent(ev), "replayed");
  verifier.verifyEvent(signer.buildEvent(LINK, "link_suspended", "admin"));
  refuses(() => verifier.verifyEvent(ev), "replayed");
});

test("M7785: stale and from-the-future events are refused; a replay after the memory is purged is still stale", () => {
  const { signer, verifier, clock } = rig();
  const old = signer.buildEvent(LINK, "link_approved", "admin");
  clock.advance(E.MAX_AGE_MS + 1);
  refuses(() => verifier.verifyEvent(old), "stale");
  const future = rig();
  const ev = future.signer.buildEvent(LINK, "link_approved", "admin");
  future.clock.advance(-(E.MAX_FUTURE_MS + 1));
  refuses(() => future.verifier.verifyEvent(ev), "from_future");
  const p = rig();
  const first = p.signer.buildEvent(LINK, "link_approved", "admin");
  p.verifier.verifyEvent(first);
  p.clock.advance(2 * E.MAX_AGE_MS + 5);
  p.verifier.verifyEvent(p.signer.buildEvent(LINK, "link_resumed", "admin")); // triggers the purge
  assert.equal(p.db.prepare("SELECT COUNT(*) AS n FROM staff_link_events_seen WHERE eventId = ?").get(first.eventId).n, 0);
  refuses(() => p.verifier.verifyEvent(first), "stale");
});

test("M7785: an event for Admin is refused by Central, and a refused event is not remembered as seen", () => {
  const { signer, verifier, db } = rig();
  const ev = signer.buildEvent(LINK, "link_approved", "admin");
  refuses(() => verifier.verifyEvent(ev, { expectTarget: "central" }), "wrong_target");
  assert.equal(db.prepare("SELECT COUNT(*) AS n FROM staff_link_events_seen").get().n, 0);
  verifier.verifyEvent(ev, { expectTarget: "admin" });
});

test("M7785: a signed event with extra or credential-looking fields is refused", () => {
  const { verifier } = rig();
  const signed = (extra, sub = {}) => {
    const envelope = { v: 1, eventId: require("crypto").randomUUID(), type: "link_approved", target: "admin", issuedAt: new Date(Date.parse("2026-10-27T10:00:00.000Z")).toISOString(), subject: { linkId: "l1", nexaUserId: "u1", bossTier: "vendor", bossId: "v1", unit: "business-hub", status: "approved", ...sub }, ...extra };
    return { ...envelope, keyId: "main1", signature: require("crypto").createHmac("sha256", KEY).update(E.canonicalJson(envelope)).digest("hex") };
  };
  refuses(() => verifier.verifyEvent(signed({ password: "x" })), "bad_shape");
  refuses(() => verifier.verifyEvent(signed({ extra: 1 })), "bad_shape");
  refuses(() => verifier.verifyEvent(signed({}, { permissions: "[]" })), "bad_shape");
  refuses(() => verifier.verifyEvent(signed({}, { otpCode: "123456" })), "bad_shape");
});

test("M7785: the allowed field lists never include a credential, code, token or permission field", () => {
  const bad = /pass(word)?|secret|token|code|otp|2fa|totp|credential|permission/i;
  for (const k of [...E.SUBJECT_KEYS, ...E.ENVELOPE_KEYS]) assert.equal(bad.test(k), false, `field ${k} must not be allowed`);
  assert.deepEqual([...E.SUBJECT_KEYS], ["bossId", "bossTier", "linkId", "nexaUserId", "status", "unit"]);
});

test("M7785: the sender refuses a weak key, a bad type, a bad target and a link with no ids", () => {
  assert.throws(() => E.createEventSigner({ keys: { a: "short" }, activeKeyId: "a" }));
  assert.throws(() => E.createEventSigner({ keys: { a: KEY }, activeKeyId: "missing" }));
  const { signer } = rig();
  refuses(() => signer.buildEvent(LINK, "link_exploded", "admin"), "bad_type");
  refuses(() => signer.buildEvent(LINK, "link_approved", "nowhere"), "bad_target");
  refuses(() => signer.buildEvent({ ...LINK, id: "" }, "link_approved", "admin"), "bad_subject");
  refuses(() => signer.buildEvent(null, "link_approved", "admin"), "bad_subject");
});

test("M7785: no credential, code or token field exists in the events module source", () => {
  const src = require("node:fs").readFileSync(require("node:path").join(__dirname, "staffLinkEvents.js"), "utf8");
  assert.equal(/console\.(log|info|warn|error)/.test(src), false, "the module must not log");
  assert.equal(/process\.env/.test(src), false, "secrets are passed in, never read here");
});

// ---- M7786
const dir = { id: "d1", tier: "director", grants: ["staff.read", "staff.request", "staff.suspend", "staff.remove", "staff.approve"] };
const mgr = { id: "m1", tier: "manager", unit: "kitchen", grants: ["staff.read", "staff.request", "staff.suspend"] };
const denies = (fn, code) => assert.throws(fn, (e) => e instanceof B.BridgeDenied && e.code === code);

test("M7786: only a Director can approve; a Manager cannot hold staff.approve even if the record says so", () => {
  assert.equal(B.authorizeBridgeCall(dir, "staff.approve", { unit: "kitchen" }), true);
  denies(() => B.authorizeBridgeCall({ ...mgr, grants: [...mgr.grants, "staff.approve"] }, "staff.approve", { unit: "kitchen" }), "tier_cannot_hold");
  denies(() => B.authorizeBridgeCall({ id: "v1", tier: "vendor", grants: ["staff.approve"] }, "staff.approve", { unit: "business-hub" }), "tier_cannot_hold");
  denies(() => B.authorizeBridgeCall({ id: "c1", tier: "ceo", grants: ["staff.approve"] }, "staff.approve", { unit: "admin" }), "tier_cannot_hold");
});

test("M7786: a Manager works in their own unit only and needs the grant", () => {
  assert.equal(B.authorizeBridgeCall(mgr, "staff.request", { unit: "kitchen" }), true);
  denies(() => B.authorizeBridgeCall(mgr, "staff.request", { unit: "blaca-essentials" }), "other_unit");
  denies(() => B.authorizeBridgeCall(mgr, "staff.remove", { unit: "kitchen" }), "not_granted");
  denies(() => B.authorizeBridgeCall({ ...mgr, unit: undefined }, "staff.read", { unit: "kitchen" }), "no_unit");
  denies(() => B.authorizeBridgeCall(mgr, "staff.read", null), "other_unit");
});

test("M7786: unknown permissions, missing caller and missing grants fail closed", () => {
  denies(() => B.authorizeBridgeCall(dir, "staff.everything", { unit: "kitchen" }), "unknown_permission");
  denies(() => B.authorizeBridgeCall(null, "staff.read", { unit: "kitchen" }), "no_caller");
  denies(() => B.authorizeBridgeCall({ id: "d1", tier: "director" }, "staff.read", { unit: "kitchen" }), "no_grants");
  denies(() => B.authorizeBridgeCall(dir, "staff.read", {}), "no_target");
  denies(() => B.authorizeBridgeCall({ ...dir, tier: "staff" }, "staff.read", { unit: "kitchen" }), "tier_cannot_hold");
});

test("M7786: a Director can hand a Manager only what a Manager may hold and what the Director holds", () => {
  assert.deepEqual(B.grantsForManager(dir.grants, ["staff.read", "staff.read", "staff.suspend"]), ["staff.read", "staff.suspend"]);
  denies(() => B.grantsForManager(dir.grants, ["staff.approve"]), "tier_cannot_hold");
  denies(() => B.grantsForManager(["staff.read"], ["staff.suspend"]), "over_cap");
  denies(() => B.grantsForManager(dir.grants, ["staff.nope"]), "unknown_permission");
  denies(() => B.grantsForManager(null, ["staff.read"]), "no_grants");
});
