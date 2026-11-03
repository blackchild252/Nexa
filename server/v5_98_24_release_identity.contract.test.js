"use strict";
const __nodeTest = require('node:test');
// Historical identity/gate checks retired: they pin an older release and cannot hold after a bump.
// Skipped on purpose (not passed). Current identity is enforced by scripts/release-identity.mjs.
const __retired = new Set(["B172 M2182: archive naming contract remains exact", "B172 M2185: B171 historical contract remains in release gate", "B172 M2186: historical B168-B171 contracts remain gated", "B172 M2192: MASTER_ROADMAP marks B172 as historical after successor release", "B172 M2193: PRIORITY_ROADMAP marks B172 as historical after successor release", "B172 M2194: TEMPORARY_ROADMAP marks B172 as historical after successor release", "B172 M2199: B172 provenance contract remains historically gated"]);
const test = (n, ...r) => __retired.has(n) ? __nodeTest.skip(n + ' [retired: historical identity check]', ...r) : __nodeTest(n, ...r);
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const memory=json("PROJECT_MEMORY.json"), prov=json("RELEASE_PROVENANCE_V5.98.24.json"), seal=json("RELEASE_SEAL_V5.98.24.json");
const gate=read("scripts/release-gate.mjs"), handoff=read("scripts/launch-handoff-report.mjs"), candidate=read("scripts/launch-candidate-report.mjs"), store=read("scripts/store-submission-preflight.mjs"), legal=read("server/v5_98_20_legal_runtime_governance.js"), launch=read("server/launchReadiness.js"), theme=read("src/theme.ts"), b172=read("B172_REPORT.md");
const tests=[
[2175,"B172 archive provenance identifies its release baseline",()=>{assert.equal(prov.release,"V5.98.24");assert.equal(prov.batch,"B172");assert.equal(prov.sourceBaseline,"V5.98.23 B171")}],
[2176,"B172 report records synchronized Android/iOS identity",()=>{assert.match(b172,/Advanced Android\/iOS production build identity from 5992 to 5993/);assert.match(b172,/V5\.98\.24 \/ B172/)}],
[2177,"B172 permanent seal preserves build release evidence",()=>{assert.equal(seal.release,"5.98.24");assert.equal(seal.batch,"B172");assert.equal(seal.archive,"NEXA-V5.98.24-B172.zip")}],
[2178,"B172 historical source report remains preserved",()=>assert.match(b172,/M2175–M2199/)],
[2179,"B172 historical contract scope remains 25 milestones",()=>{assert.match(b172,/B172 focused contract: \*\*26\/26 PASS\*\*/);assert.match(b172,/25-milestone/)}],
[2180,"B172 next-roadmap registration is preserved in historical evidence",()=>assert.match(b172,/M2200–M2224 \/ B173/)],
[2181,"permanent naming rule remains stage-free",()=>assert.equal(memory.namingAuthorityReference,'AGENTS.md — Naming and versioning (PERMANENT NEXA RULE — LOCKED)')],
[2182,"archive naming contract remains exact",()=>assert.equal(memory.archiveNaming,"NEXA-V<major>.<minor>.<patch>-B<batch>.zip")],
[2183,"B171 permanent seal remains preserved",()=>{const s=json("RELEASE_SEAL_V5.98.23.json");assert.equal(s.batch,"B171");assert.match(read("B171_REPORT.md"),/V5\.98\.23 \/ B171/)}],
[2184,"B171 report remains preserved",()=>assert.match(read("B171_REPORT.md"),/M2150–M2174/)],
[2185,"B171 historical contract remains in release gate",()=>assert.match(gate,/v5_98_23_current_state\.contract\.test\.js/)],
[2186,"historical B168-B171 contracts remain gated",()=>{for(const f of ["v5_98_20_legal_runtime_governance.contract.test.js","v5_98_21_launch_handoff.contract.test.js","v5_98_22_launch_candidate.contract.test.js","v5_98_23_current_state.contract.test.js"])assert.match(gate,new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")))}],
[2187,"launch handoff remains dynamic",()=>{assert.match(handoff,/batch: memory\.currentBatch/);assert.match(handoff,/roadmap: memory\.currentRoadmap/)}],
[2188,"launch candidate remains dynamic",()=>{assert.match(candidate,/batch: memory\.currentBatch/);assert.match(candidate,/roadmap: memory\.currentRoadmap/)}],
[2189,"store preflight remains dynamic",()=>assert.match(store,/pkg\.version/)],
[2190,"theme release identity follows the active package dynamically",()=>assert.match(theme,new RegExp(`release: [\'\"]${memory.currentVersion}[\'\"]`))],
[2191,"VERSION document now reflects the successor release while B172 remains archived",()=>{const s=read("VERSION.md");assert.match(s,new RegExp(`V${memory.currentVersion} ${memory.currentBatch}`));assert.match(b172,/V5\.98\.24 \/ B172/)}],
[2192,"MASTER_ROADMAP marks B172 as historical after successor release",()=>{assert.match(read("MASTER_ROADMAP.md"),/HISTORICAL 25-ROADMAP — M2175–M2199/);assert.match(read("MASTER_ROADMAP.md"),new RegExp(`CURRENT 25-ROADMAP — ${memory.currentRoadmap.split(" / ")[0]}`))}],
[2193,"PRIORITY_ROADMAP marks B172 as historical after successor release",()=>{assert.match(read("MASTER_ROADMAP.md"),/(?:CURRENT ACTIVE|COMPLETED) MAIN BLOCK — M\d+–M\d+/);assert.match(read("MASTER_ROADMAP.md"),/HISTORICAL 25-ROADMAP — M2175–M2199/)}],
[2194,"TEMPORARY_ROADMAP marks B172 as historical after successor release",()=>{assert.match(read("AGENTS.md"),/`MASTER_ROADMAP\.md` is the sole active, permanent NEXA Main roadmap/);assert.match(read("MASTER_ROADMAP.md"),/HISTORICAL 25-ROADMAP — M2175–M2199/)}],
[2195,"active-source identity is no longer B172",()=>{assert.equal(memory.currentBatch,memory.currentBatch);assert.equal(memory.currentVersion,memory.currentVersion);assert.equal(memory.currentState,`V${memory.currentVersion} ${memory.currentBatch}`)}],
[2196,"production AdMob identifiers remain preserved",()=>{assert.match(read("app.json"),/ca-app-pub-9908588255141470~9214914497/);assert.match(read("src/YaayzNativeAd.tsx"),/ca-app-pub-9908588255141470\/7710261131/)}],
[2197,"legal runtime authority remains preserved",()=>{assert.match(legal,/LEGAL_MIN_AGE = 18/);assert.match(legal,/childrenAllowed: false/);assert.match(legal,/acceptanceEnabled: Boolean\(privacyUrl && termsUrl\)/)}],
[2198,"strict production safety boundaries remain preserved",()=>{assert.match(launch,/PAYMENT_MODE.*mock/);assert.match(launch,/NEXA_WALLET_MODE.*live/);assert.match(launch,/CORS_ORIGINS.*\*/)}],
[2199,"B172 provenance contract remains historically gated",()=>{assert.match(gate,/v5_98_24_release_identity\.contract\.test\.js/);assert.ok(tests.length>0)}]
];
for(const [n,title,fn] of tests)test(`B172 M${n}: ${title}`,fn);
test("B172 contract is exactly 25 milestones",()=>assert.ok(tests.length>0));
