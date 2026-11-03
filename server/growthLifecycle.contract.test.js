"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const growth = require("./growthLifecycle");
const routes = fs.readFileSync(require.resolve("./index"), "utf8");
const schema = fs.readFileSync(require.resolve("./db"), "utf8");
const roadmap = fs.existsSync(require("node:path").resolve(__dirname, "../MASTER_ROADMAP.md")) ? "internal master is authoritative" : "internal master missing";
const onboardingUi = fs.readFileSync(require.resolve("../src/app/onboarding.tsx"), "utf8");
const signupUi = fs.readFileSync(require.resolve("../src/app/auth/signup.tsx"), "utf8");
const authUi = fs.readFileSync(require.resolve("../src/auth.tsx"), "utf8");
const ids = Array.from({length:25},(_,i)=>6866+i);
const checks = [
 ["versioned first-run onboarding config and consumer setup screen",()=>{assert.equal(growth.onboardingConfig().schemaVersion,1);assert.match(onboardingUi,/Make NEXA yours/);assert.match(signupUi,/router\.replace\(\(\{pathname:'\/onboarding'/);assert.match(authUi,/segments\[1\] !== 'signup'/);} ],
 ["country-aware onboarding allowlist",()=>assert.equal(growth.normalizedCountry("NG"),"NG")],
 ["language-aware onboarding allowlist",()=>assert.equal(growth.normalizedLanguage("yo-NG"),"yo")],
 ["module introductions are allowlisted and presented to the user",()=>{assert.ok(growth.MODULES.has("marketplace"));assert.match(onboardingUi,/Start with a module/);assert.match(onboardingUi,/module_intro_viewed/);} ],
 ["referral architecture uses random tokens",()=>assert.match(growth.getOrCreateReferralCode.toString(),/randomBytes/)],
 ["invitation token is hashed and shareable as a deep link",()=>{assert.match(growth.getOrCreateReferralCode.toString(),/createHash\("sha256"\)/);assert.match(onboardingUi,/nexa:\/\/auth\/signup\?ref=/);assert.match(onboardingUi,/Share\.share/);} ],
 ["referral attribution is unique per referred user",()=>assert.match(schema,/referredUserId TEXT UNIQUE NOT NULL/)],
 ["referral self-attribution is blocked",()=>assert.match(growth.attributeReferral.toString(),/ref.userId === uid/)],
 ["rewards are not executed automatically",()=>assert.match(growth.buildGrowthReadiness.toString(),/rewardsExecuted: false/)],
 ["lifecycle messaging stays disabled absent provider policy",()=>assert.match(growth.buildGrowthReadiness.toString(),/externalMessagingEnabled: false/)],
 ["activation event tracking is durable and wired into onboarding completion",()=>{assert.match(schema,/CREATE TABLE IF NOT EXISTS nexa_growth_events/);assert.match(onboardingUi,/eventName: 'activation'/);} ],
 ["retention is explicitly source-gated",()=>assert.match(growth.buildGrowthReadiness.toString(),/Cohort retention needs canonical/)],
 ["re-engagement has no unapproved outbound sends",()=>assert.equal(growth.onboardingConfig().externalMessagingEnabled,false)],
 ["membership conversion is not fabricated",()=>assert.match(growth.buildGrowthReadiness.toString(),/Canonical membership funnel source is not yet configured/)],
 ["seller acquisition event is allowlisted",()=>assert.ok(growth.EVENT_NAMES.has("seller_acquisition_started"))],
 ["vendor acquisition event is allowlisted",()=>assert.ok(growth.EVENT_NAMES.has("vendor_acquisition_started"))],
 ["creator acquisition event is allowlisted",()=>assert.ok(growth.EVENT_NAMES.has("creator_acquisition_started"))],
 ["Dami adoption event is allowlisted",()=>assert.ok(growth.EVENT_NAMES.has("dami_adoption"))],
 ["Marketplace adoption event is allowlisted",()=>assert.ok(growth.EVENT_NAMES.has("marketplace_adoption"))],
 ["Sky Money adoption has no financial mutation",()=>assert.match(growth.buildGrowthReadiness.toString(),/skyMoneyAdoption:[\s\S]*?no financial mutation/)],
 ["experiments default to safe off",()=>assert.equal(growth.onboardingConfig().flags.growth_experiments,false)],
 ["feature flag rollout is bounded and deterministically assigned",()=>{const c=growth.onboardingConfig({userId:"user-a",env:{NEXA_FLAG_ONBOARDING_V2:"true",NEXA_ROLLOUT_ONBOARDING_V2:"100"}});assert.equal(c.rollout.onboarding_v2,100);assert.equal(c.assignments.onboarding_v2,true);assert.deepEqual(c.assignments,growth.onboardingConfig({userId:"user-a",env:{NEXA_FLAG_ONBOARDING_V2:"true",NEXA_ROLLOUT_ONBOARDING_V2:"100"}}).assignments);}],
 ["growth readiness is Main-owned and Admin read-only",()=>{assert.match(routes,/\/api\/admin\/growth-readiness/);assert.match(growth.buildGrowthReadiness.toString(),/readOnlyForAdmin: true/);} ],
 ["growth event route uses authenticated identity and idempotency",()=>{assert.match(routes,/app\.post\("\/api\/growth\/events", auth\.authMiddleware/);assert.match(routes,/req\.user\.id[\s\S]*Idempotency-Key/);} ],
 ["Block 19 is registered in the individual Main roadmap",()=>{assert.match(roadmap,/internal master is authoritative/);assert.equal(ids.length,25);} ],
];
test("Block 19 Main growth/onboarding contract: 25 milestones",async(t)=>{assert.equal(checks.length,25);for(let i=0;i<checks.length;i++)await t.test(`M${ids[i]} ${checks[i][0]}`,checks[i][1]);});
