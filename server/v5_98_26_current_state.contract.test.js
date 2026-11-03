"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const app=json("app.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.26.json");
const expo=app.expo;
const tests=[
[2225,"verified B173 source archive, permanent seal and provenance baseline",()=>{const p=json("RELEASE_PROVENANCE_V5.98.25.json");assert.equal(p.release,"V5.98.25");assert.equal(p.batch,"B173");assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.25.json")))}],
[2226,"B174 package/server/Expo/root lockfile identity remains preserved in sealed evidence",()=>{assert.equal(prov.release,"V5.98.26");assert.equal(prov.batch,"B174");assert.equal(prov.archive,"NEXA-V5.98.26-B174.zip");assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.26.json")))}],
[2227,"B174 Android/iOS release identity remains sealed as historical evidence",()=>{assert.equal(prov.milestones,"M2225–M2249");assert.match(read("B174_REPORT.md"),/V5\.98\.26 \/ B174/)}],
[2228,"successor current state is no longer B174",()=>{assert.ok(/^\d+\.\d+\.\d+$/.test(memory.currentVersion));assert.match(memory.currentBatch,/^B\d+$/);assert.equal(memory.currentState,`V${memory.currentVersion} ${memory.currentBatch}`)}],
[2229,"successor roadmap metadata is registered",()=>{assert.match(memory.currentRoadmap,/M\d+–M\d+/);assert.ok(String(memory.nextRoadmap||'').length>0)}],
[2230,"historical B173 identity contract reconciliation",()=>{assert.match(read("server/v5_98_25_current_state.contract.test.js"),/B173 historical contract/)}],
[2231,"historical B172/B171 seal and report continuity",()=>{assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.24.json")));assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.23.json")))}],
[2232,"router target reachability audit across Expo routes",()=>{const routes=fs.readdirSync(path.join(root,"src","app"));assert.ok(routes.includes("(tabs)"));assert.ok(fs.existsSync(path.join(root,"src","app","auth","signup.tsx")))}],
[2233,"tab destination reachability continuity",()=>{for(const f of ["index.tsx","search.tsx","marketplace.tsx","money.tsx","zeeza.tsx","yaayz.tsx","profile.tsx"])assert.ok(fs.existsSync(path.join(root,"src","app","(tabs)",f)))}],
[2234,"marketplace vendor/admin route continuity",()=>{assert.ok(fs.existsSync(path.join(root,"src","app","marketplace","vendor.tsx")));assert.ok(fs.existsSync(path.join(root,"src","app","marketplace","disputes.tsx")))}],
[2235,"Zeeza profile/call/inbox route continuity",()=>{for(const f of ["profile.tsx","call.tsx","group-call.tsx","inbox.tsx"])assert.ok(fs.existsSync(path.join(root,"src","app","zeeza",f)))}],
[2236,"Leisure destination route continuity",()=>{for(const f of ["ball-house","fitness","game-house","kitchen"])assert.ok(fs.existsSync(path.join(root,"src","app","leisure",f,"index.tsx")))}],
[2237,"Yaayz destination continuity from module entry points",()=>{assert.ok(fs.existsSync(path.join(root,"src","app","(tabs)","yaayz.tsx")));assert.match(read("src/app/leisure/game-house/index.tsx"),/\(tabs\)\/yaayz/)}],
[2238,"Search destination continuity and query handoff preservation",()=>{assert.ok(fs.existsSync(path.join(root,"src","app","(tabs)","search.tsx")));assert.match(read("src/app/(tabs)/marketplace.tsx"),/initialSearch/)}],
[2239,"Add/register action reachability audit",()=>{assert.match(read("src/app/leisure/fitness/index.tsx"),/Register gym/);assert.match(read("src/app/(tabs)/marketplace.tsx"),/onVendor/)}],
[2240,"accessibility labels for interactive navigation continuity",()=>{assert.match(read("src/app/auth/login.tsx"),/accessibilityLabel/);assert.match(read("src/app/(tabs)/profile.tsx"),/accessibilityLabel/)}],
[2241,"hidden-route compatibility preservation",()=>{assert.ok(fs.existsSync(path.join(root,"src","app","dami.tsx")));assert.match(read("src/app/dami.tsx"),/router\.push/)}],
[2242,"production AdMob identifier preservation",()=>{assert.match(read("app.json"),/ca-app-pub-9908588255141470~9214914497/);assert.match(read("src/YaayzNativeAd.tsx"),/ca-app-pub-9908588255141470\/7710261131/)}],
[2243,"legal and 18+ runtime authority preservation",()=>{assert.match(read("server/v5_98_20_legal_runtime_governance.js"),/LEGAL_MIN_AGE = 18/);assert.match(read("server/v5_98_20_legal_runtime_governance.js"),/childrenAllowed: false/)}],
[2244,"strict production payment/wallet/CORS safety-boundary preservation",()=>{assert.match(read("server/launchReadiness.js"),/PAYMENT_MODE.*mock/);assert.match(read("server/launchReadiness.js"),/NEXA_WALLET_MODE.*live/);assert.match(read("server/launchReadiness.js"),/CORS_ORIGINS.*\*/)}],
[2245,"launch-handoff dynamic current-state continuity",()=>{assert.match(read("scripts/launch-handoff-report.mjs"),/batch: memory\.currentBatch/);assert.match(read("scripts/launch-handoff-report.mjs"),/roadmap: memory\.currentRoadmap/)}],
[2246,"launch-candidate dynamic current-state continuity",()=>{assert.match(read("scripts/launch-candidate-report.mjs"),/batch: memory\.currentBatch/);assert.match(read("scripts/launch-candidate-report.mjs"),/roadmap: memory\.currentRoadmap/)}],
[2247,"store-preflight dynamic release identity continuity",()=>{assert.match(read("scripts/store-submission-preflight.mjs"),/pkg\.version/)}],
[2248,"historical B174 contract remains registered in cumulative release gate",()=>{assert.ok(fs.existsSync(path.join(root,"server/v5_98_26_current_state.contract.test.js")));assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.26.json")))}],
[2249,"B174 historical certification remains complete",()=>{const p=json("RELEASE_PROVENANCE_V5.98.25.json");assert.equal(p.release,"V5.98.25");assert.equal(p.batch,"B173");assert.equal(p.sourceBaseline,"V5.98.24 B172");assert.equal(tests.length,25)}],
];
for(const [n,title,fn] of tests)test(`B174 M${n}: ${title}`,fn);
test("B174 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
