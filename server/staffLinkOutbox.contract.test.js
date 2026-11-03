"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const E = require("./staffLinkEvents");
const O = require("./staffLinkOutbox");
const L = require("./staffLinks");

const KEY = "k".repeat(40);
function rig(options) {
  const { DatabaseSync } = require("node:sqlite"); // real SQLite engine
  const db = new DatabaseSync(":memory:");
  let t = Date.parse("2026-10-27T10:00:00.000Z");
  const clock = { now: () => t, advance: (ms) => { t += ms; } };
  db.exec(L.SCHEMA_SQL);
  db.prepare("INSERT INTO staff_links (id,nexaUserId,bossTier,bossId,unit,permissions,status,requestedBy,createdAt,updatedAt) VALUES ('l1','u1','vendor','v1','business-hub','[\"products\"]','approved','v1','x','x')").run();
  const signer = E.createEventSigner({ keys: { main1: KEY }, activeKeyId: "main1", now: clock.now });
  const verifier = E.createEventVerifier(db, { keys: { main1: KEY }, now: clock.now });
  const box = O.createStaffLinkOutbox(db, { signer, now: clock.now, options });
  return { db, clock, box, verifier };
}
const refuses = (fn, code) => assert.throws(fn, (e) => e instanceof O.OutboxError && e.code === code);

test("M7785 outbox: one change queues one row for Admin and one for Central", () => {
  const { box } = rig();
  const r = box.enqueueForLink("l1", "link_approved");
  assert.deepEqual(r.map((x) => x.target).sort(), ["admin", "central"]);
  assert.ok(r.every((x) => x.queued));
  assert.equal(box.summary().pending, 2);
});

test("M7785 outbox: the same waiting news is queued once, but new news after sending is queued again", () => {
  const { box } = rig();
  box.enqueue("l1", "link_approved", "admin");
  assert.equal(box.enqueue("l1", "link_approved", "admin").queued, false);
  assert.equal(box.summary().pending, 1);
  const [item] = box.claimDue();
  assert.equal(box.enqueue("l1", "link_approved", "admin").queued, false, "still claimed, still the same news");
  box.markSent(item.id);
  assert.equal(box.enqueue("l1", "link_approved", "admin").queued, true);
});

test("M7785 outbox: bad link, type or target is refused and nothing is queued", () => {
  const { box } = rig();
  refuses(() => box.enqueue("", "link_approved", "admin"), "bad_link");
  refuses(() => box.enqueue("l1", "link_hacked", "admin"), "bad_type");
  refuses(() => box.enqueue("l1", "link_approved", "evil"), "bad_target");
  refuses(() => box.enqueueForLink("l1", "nope"), "bad_type");
  assert.equal(box.summary().pending, 0);
});

test("M7785 outbox: a handed-out event verifies, is minimized, and is accepted once", () => {
  const { box, verifier } = rig();
  box.enqueue("l1", "link_approved", "admin");
  const [item] = box.claimDue();
  assert.equal(item.attempt, 1);
  const got = verifier.verifyEvent(item.event, { expectTarget: "admin" });
  assert.equal(got.subject.linkId, "l1");
  assert.equal(JSON.stringify(item.event).includes("products"), false, "permissions must not leave Main");
});

test("M7785 outbox: a retry is signed fresh, so it is not stale even minutes later", () => {
  const { box, clock, verifier } = rig({ baseDelayMs: 1000 });
  box.enqueue("l1", "link_suspended", "central");
  const [first] = box.claimDue();
  box.markFailed(first.id, "timeout");
  clock.advance(10 * 60 * 1000); // far past the 5 minute freshness window
  const [second] = box.claimDue();
  assert.equal(second.attempt, 2);
  assert.notEqual(second.event.eventId, first.event.eventId);
  assert.ok(verifier.verifyEvent(second.event, { expectTarget: "central" }));
  assert.throws(() => verifier.verifyEvent(first.event, { expectTarget: "central" }), (e) => e instanceof E.StaffEventError, "the old signed copy is stale");
});

test("M7785 outbox: a leased item is not handed to a second worker until the lease runs out", () => {
  const { box, clock } = rig({ leaseMs: 5000 });
  box.enqueue("l1", "link_approved", "admin");
  assert.equal(box.claimDue().length, 1);
  assert.equal(box.claimDue().length, 0, "still leased");
  clock.advance(5001);
  assert.equal(box.claimDue().length, 1, "sender crashed; item is due again");
});

test("M7785 outbox: waits grow, are capped, and the item dies after the last try", () => {
  const { box, clock } = rig({ baseDelayMs: 1000, maxDelayMs: 3000, maxAttempts: 4 });
  box.enqueue("l1", "link_approved", "admin");
  const waits = [];
  for (let i = 0; i < 3; i++) {
    const [it] = box.claimDue();
    const r = box.markFailed(it.id, "http_500");
    waits.push(r.retryInMs);
    clock.advance(r.retryInMs);
  }
  assert.deepEqual(waits, [1000, 2000, 3000]);
  const [last] = box.claimDue();
  assert.equal(box.markFailed(last.id, "http_500").status, "dead");
  assert.equal(box.claimDue().length, 0);
  assert.equal(box.summary().dead, 1);
});

test("M7785 outbox: only a short reason word is stored; raw errors, URLs and tokens never are", () => {
  const { box, db } = rig();
  box.enqueue("l1", "link_approved", "admin");
  const [it] = box.claimDue();
  box.markFailed(it.id, "ECONNREFUSED https://admin.example/hook?token=abc123");
  const row = db.prepare("SELECT lastError FROM staff_link_outbox").get();
  assert.equal(row.lastError, "unknown");
  assert.equal(JSON.stringify(db.prepare("SELECT * FROM staff_link_outbox").all()).includes("abc123"), false);
});

test("M7785 outbox: sending is only recorded for an item that was handed out, and only once", () => {
  const { box, db } = rig();
  box.enqueue("l1", "link_approved", "admin");
  const id = db.prepare("SELECT id FROM staff_link_outbox").get().id;
  refuses(() => box.markSent(id), "not_claimed");
  const [it] = box.claimDue();
  assert.deepEqual(box.markSent(it.id), { status: "sent" });
  refuses(() => box.markSent(it.id), "not_claimed");
  refuses(() => box.markFailed(it.id, "late"), "not_claimed");
  refuses(() => box.markSent("does-not-exist"), "not_claimed");
});

test("M7785 outbox: an item whose link row is gone is parked as dead, not sent with made-up data", () => {
  const { box, db } = rig();
  box.enqueue("l1", "link_removed", "admin");
  db.prepare("DELETE FROM staff_links WHERE id = 'l1'").run();
  assert.equal(box.claimDue().length, 0);
  const row = db.prepare("SELECT status,lastError FROM staff_link_outbox").get();
  assert.deepEqual({ ...row }, { status: "dead", lastError: "link_missing" });
});

test("M7785 outbox: the table holds no permission, code or credential columns", () => {
  const { db } = rig();
  const cols = db.prepare("PRAGMA table_info(staff_link_outbox)").all().map((c) => c.name);
  assert.equal(cols.some((c) => /pass|secret|token|code|otp|2fa|credential|permission|payload/i.test(c)), false, cols.join(","));
});

test("M7785 outbox: a signer is required", () => {
  const { DatabaseSync } = require("node:sqlite");
  refuses(() => O.createStaffLinkOutbox(new DatabaseSync(":memory:"), {}), "signer_required");
});
