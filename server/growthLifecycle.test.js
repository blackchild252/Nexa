"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { DatabaseSync } = require("node:sqlite");
const growth = require("./growthLifecycle");
function db() { const d = new DatabaseSync(":memory:"); d.exec(`CREATE TABLE nexa_growth_events(id TEXT PRIMARY KEY,userId TEXT NOT NULL,eventName TEXT NOT NULL,idempotencyKey TEXT NOT NULL,context TEXT NOT NULL,createdAt TEXT NOT NULL,UNIQUE(userId,idempotencyKey)); CREATE TABLE nexa_referral_codes(id TEXT PRIMARY KEY,userId TEXT UNIQUE NOT NULL,codeHash TEXT UNIQUE NOT NULL,createdAt TEXT NOT NULL,disabledAt TEXT); CREATE TABLE nexa_referral_attributions(id TEXT PRIMARY KEY,referralId TEXT NOT NULL,referrerUserId TEXT NOT NULL,referredUserId TEXT UNIQUE NOT NULL,createdAt TEXT NOT NULL); CREATE TABLE nexa_zeeza_referral_campaigns(id TEXT PRIMARY KEY,userId TEXT NOT NULL UNIQUE,accountType TEXT NOT NULL DEFAULT 'unknown',campaignStartAt TEXT NOT NULL,campaignEndAt TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'active',createdAt TEXT NOT NULL,updatedAt TEXT NOT NULL); CREATE TABLE nexa_zeeza_referral_tokens(id TEXT PRIMARY KEY,userId TEXT NOT NULL,codeHash TEXT NOT NULL UNIQUE,createdAt TEXT NOT NULL,disabledAt TEXT);`); return d; }
test("growth onboarding locale and flags fail closed", () => { const c=growth.onboardingConfig({country:"ng",language:"yo-NG",env:{}}); assert.equal(c.country,"NG"); assert.equal(growth.normalizedCountry("JP"),"JP"); assert.equal(c.language,"yo"); assert.equal(c.flags.onboarding_v2,false); assert.equal(c.rollout.onboarding_v2,0); assert.equal(c.externalMessagingEnabled,false); });
test("growth event allowlist, privacy and idempotency", () => { const d=db(); const a=growth.recordEvent(d,{userId:"u1",eventName:"onboarding_completed",idempotencyKey:"signup:1",country:"NG",language:"yo",module:"dami",email:"secret@example.com"}); assert.equal(a.ok,true); assert.equal(a.duplicate,false); assert.equal(growth.recordEvent(d,{userId:"u1",eventName:"onboarding_completed",idempotencyKey:"signup:1"}).duplicate,true); assert.equal(growth.recordEvent(d,{userId:"u1",eventName:"arbitrary",idempotencyKey:"x"}).code,"EVENT_NOT_ALLOWED"); const row=d.prepare("SELECT context FROM nexa_growth_events").get(); assert.equal(row.context.includes("secret@example.com"),false); d.close(); });
test("referral tokens are hashed and attribution blocks self/duplicates", () => { const d=db(); const ref=growth.getOrCreateReferralCode(d,"u1"); assert.equal(ref.ok,true); const stored=d.prepare("SELECT codeHash FROM nexa_zeeza_referral_tokens").get(); assert.notEqual(stored.codeHash,ref.token); assert.equal(growth.attributeReferral(d,{userId:"u1",token:ref.token}).code,"INVALID_REFERRAL"); assert.equal(growth.attributeReferral(d,{userId:"u2",token:ref.token}).attributed,true); assert.equal(growth.attributeReferral(d,{userId:"u2",token:ref.token}).duplicate,true); d.close(); });
test("feature flags clamp rollout and remain off by default", () => { const c=growth.onboardingConfig({env:{NEXA_FLAG_ONBOARDING_V2:"true",NEXA_ROLLOUT_ONBOARDING_V2:"180"}}); assert.equal(c.flags.onboarding_v2,true); assert.equal(c.rollout.onboarding_v2,100); assert.equal(c.rollout.referral_invites,0); const a=growth.assignFeatureFlags("user-a",c.flags,c.rollout); const b=growth.assignFeatureFlags("user-a",c.flags,c.rollout); assert.deepEqual(a,b); assert.equal(a.onboarding_v2,true); });
test("growth readiness never enables financial or external messaging actions", () => { const r=growth.buildGrowthReadiness(db(),{}); assert.equal(r.authority,"NEXA Main"); assert.equal(r.readOnlyForAdmin,true); assert.equal(r.readiness.rewardsExecuted,false); assert.equal(r.readiness.externalMessagingEnabled,false); });

test("Zeeza referral links are reusable without invalidating previously shared tokens", () => {
  const d=db(); const a=growth.getOrCreateReferralCode(d,"u1"); const b=growth.getOrCreateReferralCode(d,"u1");
  assert.ok(a.token && b.token && a.token !== b.token);
  assert.equal(growth.attributeReferral(d,{userId:"u2",token:a.token}).attributed,true);
  assert.equal(growth.attributeReferral(d,{userId:"u3",token:b.token}).attributed,true);
  assert.equal(d.prepare("SELECT COUNT(*) AS n FROM nexa_zeeza_referral_tokens WHERE userId='u1'").get().n,2);
  d.close();
});
test("Zeeza campaign starts at generation and is not reset by later link generation", () => {
  const d=db(); const start=new Date("2026-10-11T10:00:00.000Z");
  const a=growth.ensureZeezaReferralCampaign(d,{userId:"vendor-1",accountType:"vendor",now:start});
  const b=growth.ensureZeezaReferralCampaign(d,{userId:"vendor-1",accountType:"vendor",now:new Date("2026-10-15T10:00:00.000Z")});
  assert.equal(a.created,true); assert.equal(b.created,false);
  assert.equal(b.campaign.campaignStartAt,start.toISOString());
  assert.equal(new Date(b.campaign.campaignEndAt).getTime()-start.getTime(),30*24*60*60*1000);
  d.close();
});
test("Zeeza referral qualification requires a referred user's activation event", () => {
  const d=db(); const ref=growth.getOrCreateReferralCode(d,"u1");
  growth.attributeReferral(d,{userId:"u2",token:ref.token});
  growth.ensureZeezaReferralCampaign(d,{userId:"u1",accountType:"user",now:new Date("2026-10-11T00:00:00.000Z")});
  let status=growth.getZeezaReferralCampaignStatus(d,{userId:"u1",now:new Date("2026-10-12T00:00:00.000Z")});
  assert.equal(status.qualifiedReferrals,0);
  growth.recordEvent(d,{userId:"u2",eventName:"activation",idempotencyKey:"activate-u2"});
  // recordEvent uses the real creation timestamp; query after it so the contract
  // is deterministic regardless of when the test suite runs.
  status=growth.getZeezaReferralCampaignStatus(d,{userId:"u1",now:new Date()});
  assert.equal(status.qualifiedReferrals,1);
  assert.equal(status.reward.status,"in_progress");
  d.close();
});
test("Zeeza referral follow-up list bounds limit and reports reward state without crediting", () => {
  const d=db(); growth.ensureZeezaReferralCampaign(d,{userId:"u1",accountType:"user",now:new Date("2026-10-11T00:00:00.000Z")});
  const rows=growth.listZeezaReferralFollowups(d,{limit:9999});
  assert.equal(rows.length,1); assert.equal(rows[0].userId,"u1"); assert.equal(rows[0].rewardStatus,"in_progress");
  assert.equal(d.prepare("SELECT status FROM nexa_zeeza_referral_campaigns WHERE userId='u1'").get().status,"active");
  d.close();
});

test("expired Zeeza campaign can restart when the owner generates a fresh referral link", () => {
  const d=db(); const start=new Date("2026-10-01T10:00:00.000Z");
  const first=growth.ensureZeezaReferralCampaign(d,{userId:"user-restart",accountType:"user",now:start});
  const next=growth.ensureZeezaReferralCampaign(d,{userId:"user-restart",accountType:"user",now:new Date("2026-11-02T10:00:00.000Z")});
  assert.equal(first.campaign.campaignStartAt,start.toISOString());
  assert.equal(next.restarted,true);
  assert.equal(next.campaign.campaignStartAt,"2026-11-02T10:00:00.000Z");
  assert.equal(new Date(next.campaign.campaignEndAt).getTime()-new Date(next.campaign.campaignStartAt).getTime(),30*24*60*60*1000);
  d.close();
});
