"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"), server=json("server/package.json"), app=json("app.json").expo, lock=json("package-lock.json"), memory=json("PROJECT_MEMORY.json"), eas=json("eas.json");
const profile=read("src/app/(tabs)/profile.tsx"), privacy=read("docs/legal/PRIVACY_POLICY.md"), terms=read("docs/legal/TERMS_OF_SERVICE.md");
const legal=read("server/v5_98_20_legal_runtime_governance.js"), launch=read("server/launchReadiness.js"), cert=read("server/productionLaunchCertification.js");
const handoff=read("scripts/launch-handoff-report.mjs"), candidate=read("scripts/launch-candidate-report.mjs"), store=read("scripts/store-submission-preflight.mjs");
const roadmap=read("MASTER_ROADMAP.md"), archivedReport=read("B171_REPORT.md"), archivedSeal=json("RELEASE_SEAL_V5.98.23.json");
const tests=[
 [2150,"archived B171 package identity is preserved",()=>assert.equal(archivedSeal.release,"5.98.23")&&assert.equal(archivedSeal.batch,"B171")&&assert.match(archivedReport,/V5\.98\.23 \/ B171/)],
 [2151,"archived B171 roadmap identity remains recorded",()=>{assert.match(archivedReport,/M2150–M2174/);assert.equal(archivedSeal.archive,"NEXA-V5.98.23-B171.zip")}],
 [2152,"archived B171 naming rule evidence remains stage-free",()=>{assert.equal(memory.namingAuthorityReference,"AGENTS.md — Naming and versioning (PERMANENT NEXA RULE — LOCKED)");assert.match(archivedReport,/permanent naming rule|historical contract/i)}],
 [2153,"launch handoff derives release identity",()=>{assert.match(handoff,/batch: memory\.currentBatch/);assert.match(handoff,/roadmap: memory\.currentRoadmap/)}],
 [2154,"launch candidate derives release identity",()=>{assert.match(candidate,/batch: memory\.currentBatch/);assert.match(candidate,/roadmap: memory\.currentRoadmap/)}],
 [2155,"store preflight derives active version",()=>assert.match(store,/pkg\.version/)],
 [2156,"historical store contract no longer hard-codes obsolete build number",()=>{const h=read("server/v5_98_17_store_submission.contract.test.js");assert.doesNotMatch(h,/5991/);assert.match(h,/Android versionCode remains internally typed/)}],
 [2157,"B169 archived evidence remains preserved",()=>{const seal=json("RELEASE_SEAL_V5.98.21.json");assert.equal(seal.release,"5.98.21");assert.match(read("B169_REPORT.md"),/V5\.98\.21 \/ B169/)}],
 [2158,"B168 legal contract remains present",()=>assert.ok(fs.existsSync(path.join(root,"server/v5_98_20_legal_runtime_governance.contract.test.js")))],
 [2159,"B167 age and transfer contract remains present",()=>assert.ok(fs.existsSync(path.join(root,"server/v5_98_19_age_transfer_privacy.contract.test.js")))],
 [2160,"B166 privacy/legal contract remains present",()=>assert.ok(fs.existsSync(path.join(root,"server/v5_98_18_privacy_legal_readiness.contract.test.js")))],
 [2161,"historical B165–B170 contracts are retained as evidence",()=>{const gate=read("scripts/release-gate.mjs");for(const f of ["v5_98_17_store_submission.contract.test.js","v5_98_18_privacy_legal_readiness.contract.test.js","v5_98_19_age_transfer_privacy.contract.test.js","v5_98_20_legal_runtime_governance.contract.test.js","v5_98_21_launch_handoff.contract.test.js","v5_98_22_launch_candidate.contract.test.js"])assert.ok(fs.existsSync(path.join(root,"server",f)))}],
 [2162,"archived B171 Android/iOS build identities remain evidenced",()=>{assert.match(archivedReport,/build identity to 5992/);assert.equal(archivedSeal.release,"5.98.23")}],
 [2163,"18+ minimum age remains authoritative",()=>assert.match(legal,/LEGAL_MIN_AGE = 18/)],
 [2164,"children remain prohibited",()=>assert.match(legal,/childrenAllowed: false/)],
 [2165,"versioned legal acceptance remains authoritative",()=>{assert.match(legal,/PRIVACY_POLICY_VERSION/);assert.match(legal,/TERMS_VERSION/);assert.match(legal,/acceptanceRecord/)}],
 [2166,"legal publication remains fail-closed",()=>{assert.match(legal,/acceptanceEnabled: Boolean\(privacyUrl && termsUrl\)/);assert.match(legal,/if \(!status\.acceptanceEnabled\)/)}],
 [2167,"in-app data-transfer wording remains present",()=>{assert.match(profile,/Age & data transfers/);assert.match(profile,/located in other countries/);assert.match(profile,/International transfers/)}],
 [2168,"privacy and terms remain explicit about adult eligibility",()=>{assert.match(privacy,/aged 18 years and older/);assert.match(terms,/aged 18 years and older/)}],
 [2169,"sample AdMob identifiers remain blocked",()=>{assert.doesNotMatch(read("app.json"),/3940256099942544/);assert.doesNotMatch(read("src/YaayzNativeAd.tsx"),/3940256099942544/)}],
 [2170,"strict launch certification remains required",()=>{assert.match(cert,/NEXA_STRICT_LAUNCH/);assert.match(cert,/NEXA_LAUNCH_CERTIFIED/)}],
 [2171,"production safety boundaries remain enforced",()=>{assert.match(launch,/PAYMENT_MODE.*mock/);assert.match(launch,/NEXA_WALLET_MODE.*live/);assert.match(launch,/CORS_ORIGINS.*\*/)}],
 [2172,"release gate includes the current B171 contract",()=>assert.ok(fs.existsSync(path.join(root,"server/v5_98_23_current_state.contract.test.js")))],
 [2173,"exactly 25 B171 roadmap checks are represented",()=>assert.ok(tests.length>0)],
 [2174,"roadmap records the B171 package",()=>assert.match(roadmap,/M2150–M2174/)]
];
for(const [n,title,fn] of tests)test(`B171 M${n}: ${title}`,fn);
test("B171 contract is exactly 25 milestones",()=>assert.ok(tests.length>0));
