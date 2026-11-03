"use strict";
// Referral reward auditability and notification recovery contracts.
// Runs against real in-memory SQLite built from the schema text in server/db.js (no server dependencies).
const test = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { DatabaseSync } = require("node:sqlite");
const growth = require("./growthLifecycle");

const root = path.join(__dirname, "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const dbSource = read("server/db.js");

function schemaSql() {
  const from = dbSource.indexOf("// Block 19 Growth, Onboarding & Retention");
  assert.ok(from > 0, "growth schema block must exist in server/db.js");
  const to = dbSource.indexOf("`);", from);
  const growthSql = dbSource.slice(dbSource.indexOf("`", from) + 1, to);
  const vendors = dbSource.match(/CREATE TABLE IF NOT EXISTS vendors \([\s\S]*?\);/);
  assert.ok(vendors, "vendors table must exist in server/db.js");
  return `CREATE TABLE users(id TEXT PRIMARY KEY,email TEXT,passwordHash TEXT,name TEXT,createdAt TEXT);\n${vendors[0]}\n${growthSql}`;
}
function db() { const d = new DatabaseSync(":memory:"); d.exec(schemaSql()); return d; }

const START = new Date("2026-10-01T00:00:00.000Z");
const END_MS = START.getTime() + 30 * 24 * 60 * 60 * 1000;
const iso = (ms) => new Date(ms).toISOString();
const at = (days, extraMs = 0) => iso(START.getTime() + days * 24 * 60 * 60 * 1000 + extraMs);

let seq = 0;
function addReferral(d, referrer, referred, attributedAt, activatedAt, key) {
  d.prepare("INSERT INTO nexa_referral_attributions (id,referralId,referrerUserId,referredUserId,createdAt) VALUES (?,?,?,?,?)").run(`a${++seq}`, "r1", referrer, referred, attributedAt);
  if (activatedAt) d.prepare("INSERT INTO nexa_growth_events (id,userId,eventName,idempotencyKey,context,createdAt) VALUES (?,?,?,?,?,?)").run(`e${++seq}`, referred, "activation", key || `act-${referred}`, "{}", activatedAt);
}
function addUser(d, id) { d.prepare("INSERT INTO users (id,email,passwordHash,name,createdAt) VALUES (?,?,?,?,?)").run(id, `${id}@example.test`, "x", id, at(0)); }
function eligibleVendor(d, id = "v1") {
  growth.ensureZeezaReferralCampaign(d, { userId: id, accountType: "vendor", now: START });
  for (let i = 0; i < 100; i++) addReferral(d, id, `${id}-ref-${i}`, at(0, 3600000), at(0, 7200000));
  return id;
}
const NOW = new Date(at(10));
const count = (d, table) => d.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;

// ---------------------------------------------------------------- M7716 / M7717 / M7718 / M7719
test("M7716 reward decisions are recorded once per campaign in an idempotent ledger", () => {
  const d = db(); eligibleVendor(d);
  const a = growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "admin-1", reason: "100 verified referrals", now: NOW });
  const b = growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "admin-2", reason: "second click", now: NOW });
  assert.equal(a.ok, true); assert.equal(a.duplicate, false); assert.equal(a.ledger.status, "approved");
  assert.equal(b.ok, true); assert.equal(b.duplicate, true); assert.equal(b.ledger.id, a.ledger.id);
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 1);
  assert.equal(count(d, "nexa_zeeza_referral_reward_audit"), 1);
  d.close();
});
test("M7717 qualification never creates a decision; approval is a separate admin step", () => {
  const d = db(); eligibleVendor(d);
  const status = growth.getZeezaReferralCampaignStatus(d, { userId: "v1", now: NOW });
  assert.equal(status.reward.status, "pending_review"); assert.equal(status.reward.eligibleForReview, true); assert.equal(status.reward.ledgerRecorded, false);
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 0, "reading status must not write a decision");
  growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "admin-1", reason: "checked", now: NOW });
  const after = growth.getZeezaReferralCampaignStatus(d, { userId: "v1", now: NOW });
  assert.equal(after.reward.status, "approved"); assert.equal(after.qualifiedReferrals, status.qualifiedReferrals, "approval does not change counts");
  d.close();
});
test("M7717 a campaign that has not qualified cannot be approved or rejected", () => {
  const d = db();
  growth.ensureZeezaReferralCampaign(d, { userId: "v2", accountType: "vendor", now: START });
  addReferral(d, "v2", "x1", at(0, 1000), at(0, 2000));
  for (const decision of ["approve", "reject"]) {
    const r = growth.recordZeezaRewardDecision(d, { campaignUserId: "v2", decision, actorId: "admin-1", reason: "try", now: NOW });
    assert.equal(r.ok, false); assert.equal(r.code, "NOT_ELIGIBLE");
  }
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 0);
  d.close();
});
test("M7717 decisions validate actor, decision, reason, campaign and ledger availability", () => {
  const d = db(); eligibleVendor(d);
  const base = { campaignUserId: "v1", decision: "approve", actorId: "admin-1", reason: "ok reason", now: NOW };
  assert.equal(growth.recordZeezaRewardDecision(d, { ...base, actorId: "" }).code, "AUTH_REQUIRED");
  assert.equal(growth.recordZeezaRewardDecision(d, { ...base, decision: "credit" }).code, "INVALID_DECISION");
  assert.equal(growth.recordZeezaRewardDecision(d, { ...base, reason: "  " }).code, "REASON_REQUIRED");
  assert.equal(growth.recordZeezaRewardDecision(d, { ...base, reason: "x".repeat(301) }).code, "REASON_REQUIRED");
  assert.equal(growth.recordZeezaRewardDecision(d, { ...base, campaignUserId: "nobody" }).code, "CAMPAIGN_NOT_FOUND");
  assert.equal(growth.recordZeezaRewardDecision(d, { ...base, now: "not a date" }).code, "INVALID_CAMPAIGN_TIME");
  const bare = new DatabaseSync(":memory:");
  bare.exec("CREATE TABLE nexa_zeeza_referral_campaigns(id TEXT PRIMARY KEY,userId TEXT UNIQUE,accountType TEXT,campaignStartAt TEXT,campaignEndAt TEXT,status TEXT,createdAt TEXT,updatedAt TEXT)");
  assert.equal(growth.recordZeezaRewardDecision(bare, base).code, "REWARD_LEDGER_UNAVAILABLE");
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 0);
  d.close(); bare.close();
});
test("M7567 referral reward decisions and credits reject non-string audit reasons", () => {
  const d = db(); eligibleVendor(d);
  const base = { campaignUserId: "v1", decision: "approve", actorId: "admin-1", now: NOW };
  for (const reason of [null, undefined, 7, true, {}, ["valid-looking", "reason"]]) {
    assert.equal(growth.recordZeezaRewardDecision(d, { ...base, reason }).code, "REASON_REQUIRED");
    assert.equal(growth.recordZeezaRewardCredit(d, { campaignUserId: "v1", actorId: "admin-1", reason, now: NOW }).code, "REASON_REQUIRED");
  }
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 0, "invalid reasons must not create a decision or credit");
  assert.equal(count(d, "nexa_zeeza_referral_reward_audit"), 0, "invalid reasons must not create audit rows");
  const accepted = growth.recordZeezaRewardDecision(d, { ...base, reason: "Reviewed and verified" });
  assert.equal(accepted.ok, true, "valid string reasons remain compatible");
  assert.equal(count(d, "nexa_zeeza_referral_reward_audit"), 1);
  d.close();
});

test("M7718 one subscription month per campaign identity: no second decision, no second credit", () => {
  const d = db(); eligibleVendor(d);
  growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "admin-1", reason: "first", now: NOW });
  const flip = growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "reject", actorId: "admin-2", reason: "changed mind", now: NOW });
  assert.equal(flip.ok, false); assert.equal(flip.code, "DECISION_ALREADY_RECORDED"); assert.equal(flip.currentStatus, "approved");
  const c1 = growth.recordZeezaRewardCredit(d, { campaignUserId: "v1", actorId: "admin-1", reason: "applied by operator", now: NOW });
  const c2 = growth.recordZeezaRewardCredit(d, { campaignUserId: "v1", actorId: "admin-1", reason: "applied again", now: NOW });
  assert.equal(c1.ok, true); assert.equal(c1.duplicate, false); assert.equal(c1.ledger.status, "credited");
  assert.equal(c2.ok, true); assert.equal(c2.duplicate, true);
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 1);
  assert.equal(d.prepare("SELECT COUNT(*) AS n FROM nexa_zeeza_referral_reward_audit WHERE action='credit'").get().n, 1);
  d.close();
});
test("M7718 credit requires a prior approval and a campaign", () => {
  const d = db(); eligibleVendor(d);
  assert.equal(growth.recordZeezaRewardCredit(d, { campaignUserId: "v1", actorId: "a", reason: "no approval yet", now: NOW }).code, "NOT_APPROVED");
  assert.equal(growth.recordZeezaRewardCredit(d, { campaignUserId: "ghost", actorId: "a", reason: "no campaign", now: NOW }).code, "CAMPAIGN_NOT_FOUND");
  growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "reject", actorId: "a", reason: "not valid", now: NOW });
  const afterReject = growth.recordZeezaRewardCredit(d, { campaignUserId: "v1", actorId: "a", reason: "should fail", now: NOW });
  assert.equal(afterReject.code, "NOT_APPROVED"); assert.equal(afterReject.currentStatus, "rejected");
  d.close();
});
test("M7718 a restarted campaign keeps the same identity, so it cannot earn a second month (owner decision deferred)", () => {
  const d = db(); eligibleVendor(d);
  growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "admin-1", reason: "first window", now: NOW });
  const restarted = growth.ensureZeezaReferralCampaign(d, { userId: "v1", accountType: "vendor", now: new Date(END_MS + 86400000) });
  assert.equal(restarted.restarted, true);
  const again = growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "admin-1", reason: "second window", now: new Date(END_MS + 86400000) });
  assert.equal(again.duplicate, true);
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 1);
  d.close();
});
test("M7719 audit records carry actor, reason and transition and cannot be changed or removed", () => {
  const d = db(); eligibleVendor(d);
  growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "admin-1", reason: "100 verified referrals", now: NOW });
  growth.recordZeezaRewardCredit(d, { campaignUserId: "v1", actorId: "admin-3", reason: "operator applied month", now: NOW });
  const rows = d.prepare("SELECT action,fromStatus,toStatus,actorId,reason FROM nexa_zeeza_referral_reward_audit ORDER BY createdAt, rowid").all();
  assert.deepEqual(rows.map((r) => [r.action, r.fromStatus, r.toStatus, r.actorId]), [["approve", null, "approved", "admin-1"], ["credit", "approved", "credited", "admin-3"]]);
  assert.equal(rows[0].reason, "100 verified referrals");
  assert.throws(() => d.exec("UPDATE nexa_zeeza_referral_reward_audit SET reason='edited'"), /immutable/);
  assert.throws(() => d.exec("DELETE FROM nexa_zeeza_referral_reward_audit"), /immutable/);
  assert.equal(count(d, "nexa_zeeza_referral_reward_audit"), 2);
  d.close();
});
test("M7719 a failed audit write rolls the ledger write back", () => {
  const d = db(); eligibleVendor(d);
  d.exec("DROP TABLE nexa_zeeza_referral_reward_audit; CREATE TABLE nexa_zeeza_referral_reward_audit(id TEXT PRIMARY KEY, ledgerId TEXT NOT NULL CHECK (length(ledgerId) < 0), campaignId TEXT, userId TEXT, action TEXT, fromStatus TEXT, toStatus TEXT, actorId TEXT, reason TEXT, createdAt TEXT);");
  assert.throws(() => growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "admin-1", reason: "will fail", now: NOW }));
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 0, "no decision without its audit record");
  d.close();
});

// ---------------------------------------------------------------- M7720
test("M7720 follow-up filters accept only bounded, allow-listed values", () => {
  assert.deepEqual(growth.parseFollowupQuery({}), { ok: true, limit: 100, offset: 0, accountType: undefined, rewardStatus: undefined });
  const ok = growth.parseFollowupQuery({ limit: "200", offset: "20", accountType: "vendor", status: "pending_review" });
  assert.deepEqual([ok.ok, ok.limit, ok.offset, ok.accountType, ok.rewardStatus], [true, 200, 20, "vendor", "pending_review"]);
  const bad = [{ limit: "abc" }, { limit: "-1" }, { limit: "0" }, { limit: "501" }, { limit: "1.5" }, { limit: ["1", "2"] }, { limit: { a: 1 } },
    { offset: "-1" }, { offset: "x" }, { offset: "1000000" }, { accountType: "admin" }, { accountType: ["user"] }, { status: "paid" }, { status: "__proto__" }];
  for (const q of bad) { const r = growth.parseFollowupQuery(q); assert.equal(r.ok, false, JSON.stringify(q)); assert.equal(r.code, "INVALID_FILTER"); assert.ok(r.field); }
  assert.equal(growth.parseFollowupQuery(null).ok, true);
});
test("M7720 pagination is deterministic, disjoint and bounded; filters narrow results", () => {
  const d = db();
  for (let i = 0; i < 7; i++) growth.ensureZeezaReferralCampaign(d, { userId: `u${i}`, accountType: i % 2 ? "vendor" : "user", now: new Date(START.getTime() + i * 1000) });
  const all = growth.listZeezaReferralFollowups(d, { limit: 100, now: NOW });
  assert.equal(all.length, 7);
  const p1 = growth.listZeezaReferralFollowups(d, { limit: 3, offset: 0, now: NOW }), p2 = growth.listZeezaReferralFollowups(d, { limit: 3, offset: 3, now: NOW }), p3 = growth.listZeezaReferralFollowups(d, { limit: 3, offset: 6, now: NOW });
  assert.deepEqual([...p1, ...p2, ...p3].map((r) => r.id), all.map((r) => r.id));
  assert.equal(growth.listZeezaReferralFollowups(d, { limit: 3, offset: 50, now: NOW }).length, 0);
  assert.equal(growth.listZeezaReferralFollowups(d, { limit: 1000000, now: NOW }).length, 7, "oversize limit is clamped, not honoured");
  assert.ok(growth.listZeezaReferralFollowups(d, { accountType: "vendor", now: NOW }).every((r) => r.accountType === "vendor"));
  assert.equal(growth.listZeezaReferralFollowups(d, { accountType: "vendor", now: NOW }).length, 3);
  assert.equal(growth.listZeezaReferralFollowups(d, { rewardStatus: "in_progress", limit: 2, offset: 1, now: NOW }).length, 2);
  assert.equal(growth.listZeezaReferralFollowups(d, { rewardStatus: "credited", now: NOW }).length, 0);
  d.close();
});

// ---------------------------------------------------------------- M7721 / M7722
test("M7721 account type comes from server records, not from request fields", () => {
  const d = db(); addUser(d, "plain"); addUser(d, "shop");
  d.prepare("INSERT INTO vendors (id,userId,shopName,createdAt) VALUES (?,?,?,?)").run("vend1", "shop", "Shop", at(0));
  assert.equal(growth.resolveReferralAccountType(d, "shop"), "vendor");
  assert.equal(growth.resolveReferralAccountType(d, "plain"), "user");
  assert.equal(growth.resolveReferralAccountType(d, "ghost"), "unknown");
  assert.equal(growth.resolveReferralAccountType(d, ""), "unknown");
  assert.equal(growth.resolveReferralAccountType(d, undefined), "unknown");
  assert.equal(growth.resolveReferralAccountType(new DatabaseSync(":memory:"), "plain"), "unknown", "missing tables fail to unknown");
  d.close();
});
test("M7721 the referral route resolves the type server-side and no longer reads unverified user fields", () => {
  const index = read("server/index.js");
  const route = index.slice(index.indexOf('app.get("/api/growth/referrals/me"'), index.indexOf('app.get("/api/admin/zeeza/referral-followups"'));
  assert.match(route, /growth\.resolveReferralAccountType\(db, req\.user\.id\)/);
  assert.doesNotMatch(route, /req\.user\.(accountType|role|userType|type)\b/);
  assert.match(read("server/auth.js"), /function publicUser\(u\)\{ return \{id:u\.id,email:u\.email,name:u\.name\|\|"NEXA user",username:u\.username\|\|null\}; \}/, "documents why the old fields were always empty");
});
test("M7722 unknown account type never reaches reward review, approval or ledger", () => {
  const d = db();
  growth.ensureZeezaReferralCampaign(d, { userId: "mystery", accountType: "contractor", now: START });
  for (let i = 0; i < 120; i++) addReferral(d, "mystery", `m-${i}`, at(0, 3600000), at(0, 7200000));
  const status = growth.getZeezaReferralCampaignStatus(d, { userId: "mystery", now: NOW });
  assert.equal(status.campaign.accountType, "unknown");
  assert.equal(status.reward.status, "account_type_review"); assert.equal(status.reward.eligibleForReview, false); assert.equal(status.reward.statusLabel, "Account type review");
  const r = growth.recordZeezaRewardDecision(d, { campaignUserId: "mystery", decision: "approve", actorId: "admin-1", reason: "try anyway", now: NOW });
  assert.equal(r.ok, false); assert.equal(r.code, "ACCOUNT_TYPE_REVIEW");
  assert.equal(count(d, "nexa_zeeza_referral_reward_ledger"), 0); assert.equal(count(d, "nexa_zeeza_referral_reward_audit"), 0);
  growth.ensureZeezaReferralCampaign(d, { userId: "mystery", accountType: "vendor", now: NOW });
  assert.equal(growth.getZeezaReferralCampaignStatus(d, { userId: "mystery", now: NOW }).campaign.accountType, "vendor", "a later confirmed type replaces unknown");
  d.close();
});

// ---------------------------------------------------------------- M7723 .. M7728
test("M7723 the 30-day window is inclusive at its exact end and closed one millisecond later", () => {
  const d = db();
  growth.ensureZeezaReferralCampaign(d, { userId: "u1", accountType: "user", now: START });
  assert.equal(growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: START }).campaign.campaignEndAt, iso(END_MS));
  addReferral(d, "u1", "on-time", at(0, 1000), iso(END_MS));
  addReferral(d, "u1", "too-late", at(0, 1000), iso(END_MS + 1));
  const s = growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(END_MS + 5000) });
  assert.equal(s.qualifiedReferrals, 2); assert.equal(s.referralsInWindow, 1);
  assert.equal(growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(END_MS) }).reward.status, "in_progress", "still open at the exact end");
  assert.equal(growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(END_MS + 1) }).reward.status, "window_expired");
  assert.equal(growth.ensureZeezaReferralCampaign(d, { userId: "u1", accountType: "user", now: new Date(END_MS) }).created, false);
  assert.equal(growth.ensureZeezaReferralCampaign(d, { userId: "u1", accountType: "user", now: new Date(END_MS) }).restarted, undefined, "not restarted at the exact end");
  d.close();
});
test("M7724 an activation before attribution is rejected; the same instant counts", () => {
  const d = db();
  growth.ensureZeezaReferralCampaign(d, { userId: "u1", accountType: "user", now: START });
  addReferral(d, "u1", "early", at(1), at(0, 5000));
  addReferral(d, "u1", "same", at(2), at(2));
  addReferral(d, "u1", "after", at(3), at(3, 1));
  const s = growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: NOW });
  assert.equal(s.qualifiedReferrals, 2, "early activation does not qualify");
  d.close();
});
test("M7725 an activation after the campaign ends does not count in the window", () => {
  const d = db();
  growth.ensureZeezaReferralCampaign(d, { userId: "v1", accountType: "vendor", now: START });
  for (let i = 0; i < 100; i++) addReferral(d, "v1", `late-${i}`, at(1), at(31));
  const s = growth.getZeezaReferralCampaignStatus(d, { userId: "v1", now: new Date(at(40)) });
  assert.equal(s.referralsInWindow, 0); assert.equal(s.reward.eligibleForReview, false); assert.equal(s.reward.status, "window_expired");
  assert.equal(growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "a", reason: "late", now: new Date(at(40)) }).code, "NOT_ELIGIBLE");
  d.close();
});
test("M7726 duplicate and repeated activation events count a referred user once", () => {
  const d = db();
  const ref = growth.getOrCreateReferralCode(d, "u1");
  growth.ensureZeezaReferralCampaign(d, { userId: "u1", accountType: "user", now: new Date(Date.now() - 1000) });
  assert.equal(growth.attributeReferral(d, { userId: "u2", token: ref.token }).attributed, true);
  const first = growth.recordEvent(d, { userId: "u2", eventName: "activation", idempotencyKey: "act-1" });
  const same = growth.recordEvent(d, { userId: "u2", eventName: "activation", idempotencyKey: "act-1" });
  const other = growth.recordEvent(d, { userId: "u2", eventName: "activation", idempotencyKey: "act-2" });
  assert.equal(first.duplicate, false); assert.equal(same.duplicate, true); assert.equal(other.duplicate, false);
  assert.equal(growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(Date.now() + 1000) }).qualifiedReferrals, 1);
  assert.equal(growth.attributeReferral(d, { userId: "u2", token: ref.token }).duplicate, true, "a second attribution for the same person is a no-op");
  d.close();
});
test("M7727 and M7728 a retired token stops new attribution but keeps earlier attribution", () => {
  const d = db();
  const ref = growth.getOrCreateReferralCode(d, "u1");
  assert.equal(growth.attributeReferral(d, { userId: "before", token: ref.token }).attributed, true);
  d.prepare("UPDATE nexa_zeeza_referral_tokens SET disabledAt=? WHERE userId=?").run(new Date().toISOString(), "u1");
  const blocked = growth.attributeReferral(d, { userId: "after", token: ref.token });
  assert.deepEqual([blocked.ok, blocked.code], [false, "INVALID_REFERRAL"]);
  assert.equal(d.prepare("SELECT COUNT(*) AS n FROM nexa_referral_attributions WHERE referredUserId='after'").get().n, 0);
  assert.equal(d.prepare("SELECT referrerUserId FROM nexa_referral_attributions WHERE referredUserId='before'").get().referrerUserId, "u1", "earlier attribution is kept");
  growth.ensureZeezaReferralCampaign(d, { userId: "u1", accountType: "user", now: new Date(Date.now() - 1000) });
  growth.recordEvent(d, { userId: "before", eventName: "activation", idempotencyKey: "act-before" });
  assert.equal(growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(Date.now() + 1000) }).qualifiedReferrals, 1, "retired-token attribution still qualifies");
  d.close();
});

// ---------------------------------------------------------------- M7729 / M7730
test("M7729 follow-ups show campaign age and time remaining", () => {
  const d = db();
  growth.ensureZeezaReferralCampaign(d, { userId: "u1", accountType: "user", now: START });
  const mid = growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(at(10, 3600000)) });
  assert.deepEqual([mid.campaignAgeDays, mid.remainingDays], [10, 20]);
  const end = growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(END_MS) });
  assert.deepEqual([end.campaignAgeDays, end.remainingDays, end.remainingMs], [30, 0, 0]);
  const over = growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(at(45)) });
  assert.deepEqual([over.remainingDays, over.remainingMs], [0, 0], "never negative");
  const before = growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: new Date(START.getTime() - 5000) });
  assert.equal(before.campaignAgeDays, 0);
  const row = growth.listZeezaReferralFollowups(d, { now: new Date(at(10)) })[0];
  assert.deepEqual([row.campaignAgeDays, row.remainingDays], [10, 20]);
  d.close();
});
test("M7730 every reward state has a plain label", () => {
  const d = db();
  assert.deepEqual(Object.keys(growth.REWARD_STATUS_LABELS).sort(), ["account_type_review", "approved", "credited", "in_progress", "not_started", "pending_review", "rejected", "scheduled", "window_expired"]);
  eligibleVendor(d);
  growth.ensureZeezaReferralCampaign(d, { userId: "slow", accountType: "vendor", now: START });
  const label = (u, when) => growth.getZeezaReferralCampaignStatus(d, { userId: u, now: when || NOW }).reward.statusLabel;
  assert.equal(label("v1"), "Pending review");
  assert.equal(label("slow", new Date(at(40))), "Expired");
  assert.equal(label("slow"), "In progress");
  assert.equal(label("slow", new Date(START.getTime() - 1000)), "Scheduled");
  growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "approve", actorId: "a", reason: "approved ok", now: NOW });
  assert.equal(label("v1"), "Approved");
  growth.recordZeezaRewardCredit(d, { campaignUserId: "v1", actorId: "a", reason: "credit noted", now: NOW });
  assert.equal(label("v1"), "Credited");
  assert.equal(growth.listZeezaReferralFollowups(d, { rewardStatus: "credited", now: NOW })[0].rewardStatusLabel, "Credited");
  d.close();
});
test("M7730 a rejection is labelled Rejected and stays rejected", () => {
  const d = db(); eligibleVendor(d);
  growth.recordZeezaRewardDecision(d, { campaignUserId: "v1", decision: "reject", actorId: "a", reason: "duplicate accounts", now: NOW });
  const s = growth.getZeezaReferralCampaignStatus(d, { userId: "v1", now: NOW });
  assert.equal(s.reward.status, "rejected"); assert.equal(s.reward.statusLabel, "Rejected");
  d.close();
});

// ---------------------------------------------------------------- M7731 / M7732
test("M7731 API shapes never carry token hashes", () => {
  const d = db(); addUser(d, "u1");
  const ref = growth.getOrCreateReferralCode(d, "u1");
  const hash = crypto.createHash("sha256").update(ref.token).digest("hex");
  assert.ok(d.prepare("SELECT codeHash FROM nexa_zeeza_referral_tokens").get().codeHash === hash, "the hash exists in storage");
  growth.attributeReferral(d, { userId: "u2", token: ref.token });
  const campaign = growth.ensureZeezaReferralCampaign(d, { userId: "u1", accountType: "user", now: START });
  const me = growth.omitHashFields({ ...ref, programme: "zeeza", campaign: campaign.campaign, campaignStatus: growth.getZeezaReferralCampaignStatus(d, { userId: "u1", now: NOW }) });
  const list = growth.omitHashFields(growth.listZeezaReferralFollowups(d, { now: NOW }));
  for (const body of [JSON.stringify(me), JSON.stringify(list)]) { assert.ok(!body.includes(hash)); assert.doesNotMatch(body, /hash/i); }
  assert.deepEqual(growth.omitHashFields({ a: { codeHash: "x", ok: 1 }, list: [{ tokenHash: "y", n: 2 }] }), { a: { ok: 1 }, list: [{ n: 2 }] });
  const index = read("server/index.js");
  assert.equal((index.match(/growth\.omitHashFields\(/g) || []).length >= 3, true, "routes filter hash fields");
  d.close();
});
test("M7732 follow-up and decision endpoints are no-store and owner-only before any work", () => {
  const index = read("server/index.js");
  for (const marker of ['app.get("/api/admin/zeeza/referral-followups"', 'app.post("/api/admin/zeeza/referral-followups/:userId/decision"']) {
    const start = index.indexOf(marker); assert.ok(start > 0, marker);
    const body = index.slice(start, index.indexOf("\n});", start));
    const noStore = body.indexOf('res.setHeader("Cache-Control", "no-store")'), gate = body.indexOf("isConfiguredAdmin(req.user)"), work = body.indexOf('require("./growthLifecycle")');
    assert.ok(noStore > 0 && gate > noStore, "no-store is set before the owner check so 403 and 500 are never cached");
    assert.ok(work > gate, "growth logic loads only after the owner check");
    assert.match(body, /return res\.status\(403\)/);
  }
  const me = index.slice(index.indexOf('app.get("/api/growth/referrals/me"'), index.indexOf('app.get("/api/admin/zeeza/referral-followups"'));
  assert.ok(me.indexOf("no-store") > 0 && me.indexOf("no-store") < me.indexOf("getOrCreateReferralCode"));
  const decision = index.slice(index.indexOf('"/api/admin/zeeza/referral-followups/:userId/decision"'), index.indexOf('app.post("/api/growth/referrals/attribute"'));
  assert.match(decision, /actorId: req\.user\.id/, "actor is the signed-in admin, never a body field");
  assert.doesNotMatch(decision, /req\.body\??\.(actorId|adminId)/);
  assert.match(decision, /balanceChangedByThisCall: false/);
});

// ---------------------------------------------------------------- M7733
test("M7733 admin list reads in order and exposes one spoken label per row", () => {
  const tsx = read("src/app/admin/zeeza-referrals.tsx");
  assert.match(tsx, /accessibilityRole="header"/);
  assert.match(tsx, /<View key=\{row\.id\} accessible accessibilityLabel=\{spoken\}/);
  const spoken = tsx.slice(tsx.indexOf("const spoken ="), tsx.indexOf("return <View key={row.id}"));
  const order = ["account", "Campaign", "Qualified", "AAMI Rewards", "Reward status"].map((w) => spoken.indexOf(w));
  assert.ok(order.every((n) => n > 0) && [...order].sort((a, b) => a - b).join() === order.join(), "spoken order: account, campaign, qualified, rewards, status");
  assert.match(spoken, /No automatic credit applied/);
  assert.match(tsx, /accessibilityLiveRegion="polite"/);
  assert.match(tsx, /accessibilityLabel="Loading referral follow-ups"/);
  assert.match(tsx, /Eligible for admin review — no automatic credit applied/);
});

// ---------------------------------------------------------------- M7734 .. M7737 (popup)
async function popupLogic() { return import(pathToFileURL(path.join(root, "src", "notificationPopupLogic.ts")).href); }
test("M7734 queued popups are taken in order and stale ones are dropped", async () => {
  const L = await popupLogic(); const now = Date.parse("2026-10-26T12:00:00.000Z");
  const mk = (id, ageMs) => ({ id, createdAt: new Date(now - ageMs).toISOString() });
  const q = [mk("a", 170000), mk("b", 200000), mk("c", 1000), mk("d", 500)];
  assert.equal(L.takeNextFresh(q, now).id, "a");
  assert.equal(L.takeNextFresh(q, now + 15000).id, "c", "b went stale while waiting and is skipped");
  assert.equal(L.takeNextFresh(q, now + 15000).id, "d");
  assert.equal(L.takeNextFresh(q, now + 15000), undefined); assert.equal(q.length, 0);
  assert.equal(L.takeNextFresh([], now), undefined);
  assert.equal(L.POPUP_QUEUE_MAX, 100);
  const popup = read("src/NexaInAppNotificationPopup.tsx");
  assert.equal((popup.match(/takeNextFresh\(pendingQueue\.current\)/g) || []).length, 2, "both queue-advance sites use the freshness check");
  assert.doesNotMatch(popup, /pendingQueue\.current\.shift\(\)/, "no unchecked shift remains");
});
test("M7735 only recent unread popup notifications qualify on the first fetch", async () => {
  const L = await popupLogic(); const now = Date.parse("2026-10-26T12:00:00.000Z");
  assert.equal(L.recentEnough(new Date(now - 179999).toISOString(), now), true);
  assert.equal(L.recentEnough(new Date(now - 180000).toISOString(), now), false, "exactly three minutes old is stale");
  assert.equal(L.recentEnough(new Date(now - 3600000).toISOString(), now), false);
  assert.equal(L.recentEnough(new Date(now).toISOString(), now), true);
  const popup = read("src/NexaInAppNotificationPopup.tsx");
  assert.match(popup, /n\.readAt==null && n\.data\?\.inAppPopup===true && recentEnough\(n\.createdAt\)/);
  assert.match(popup, /for\(const row of rows\) if\(!popupEligible\(row\)\) seenNotificationIds\.current\.add\(row\.id\)/, "stale rows are remembered so they never pop later");
});
test("M7736 malformed and future timestamps never qualify", async () => {
  const L = await popupLogic(); const now = Date.parse("2026-10-26T12:00:00.000Z");
  for (const bad of ["", "not a date", "2026-13-45T99:99:99Z", null, undefined, 12345, {}, [], true]) assert.equal(L.recentEnough(bad, now), false, String(bad));
  assert.equal(L.recentEnough(new Date(now + 1).toISOString(), now), false, "one millisecond ahead is rejected");
  assert.equal(L.recentEnough(new Date(now + 86400000).toISOString(), now), false);
  assert.equal(L.recentEnough(new Date(now).toISOString(), Number.NaN), false);
  assert.equal(L.takeNextFresh([{ createdAt: "garbage" }, { createdAt: new Date(now + 5000).toISOString() }], now), undefined);
  assert.equal(typeof L.recentEnough(new Date().toISOString()), "boolean", "default clock argument works");
});
test("M7737 reduced-motion behaviour is preserved in show and dismiss", () => {
  const popup = read("src/NexaInAppNotificationPopup.tsx");
  assert.match(popup, /opacity\.setValue\(reducedMotion\?1:0\); translateY\.setValue\(reducedMotion\?0:-18\)/);
  assert.match(popup, /if\(!reducedMotion && allows\('notification'\)\) Animated\.parallel/);
  assert.equal((popup.match(/reducedMotion\?MOTION_MS\.instant:MOTION_MS\.blinkOpen/g) || []).length, 2, "timer exit and dismiss both honour reduced motion");
  assert.match(popup, /accessibilityLiveRegion="polite"/);
  assert.match(popup, /accessibilityLabel="Dismiss notification"/);
});

// ---------------------------------------------------------------- M7738 .. M7740
test("M7738 the reward and notification state machine is documented against the real states", () => {
  const doc = read("docs/ZEEZA_REFERRAL_REWARD_AND_NOTIFICATION_STATE_MACHINE.md");
  for (const label of Object.values(growth.REWARD_STATUS_LABELS)) assert.ok(doc.includes(label), `doc names ${label}`);
  for (const phrase of ["account_type_review", "pending_review", "window_expired", "ledger", "immutable", "No credit is applied", "takeNextFresh", "NOT TESTED"]) assert.ok(doc.includes(phrase), `doc covers ${phrase}`);
});
test("M7739 the new contract is part of verify:contract", () => {
  const pkg = JSON.parse(read("package.json"));
  assert.match(pkg.scripts["verify:contract"], /server\/referralRewardAuditability\.contract\.test\.js/);
});
test("M7740 the evidence document and block statuses exist", () => {
  const evidence = read("docs/REFERRAL_REWARD_AUDITABILITY_EXECUTION_EVIDENCE.md");
  for (let n = 7716; n <= 7740; n++) assert.ok(evidence.includes(`M${n}`), `evidence lists M${n}`);
  const roadmap = read("MASTER_ROADMAP.md");
  const block = roadmap.slice(roadmap.indexOf("## REGISTERED FUTURE MAIN APP BLOCK — M7716–M7740"), roadmap.indexOf("## REGISTERED FUTURE MAIN APP BLOCK — M7741–M7765"));
  assert.doesNotMatch(block, /REGISTERED — NOT STARTED/, "no milestone in the executed block is left as not started");
});
