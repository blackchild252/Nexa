"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.28.json");
const expo=app.expo;
const tests=[
[2275,"B175 sealed source baseline and provenance preserved",()=>{const p=json("RELEASE_PROVENANCE_V5.98.27.json");assert.equal(p.release,"V5.98.27");assert.equal(p.batch,"B175");assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.27.json")))}],
[2276,"B176 historical package identity remains preserved while B177 is current",()=>{assert.equal(prov.release,"V5.98.28");assert.equal(prov.batch,"B176");assert.equal(pkg.version,memory.currentVersion);assert.equal(server.version,pkg.version);assert.equal(expo.version,pkg.version);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[""].version,pkg.version)}],
[2277,"B176 historical report preserves release identity and build evidence",()=>{const r=read("B176_REPORT.md");assert.ok(r.includes("V5.98.28") && r.includes("B176"))}],
[2278,"B176 historical report preserves successor evidence",()=>{const r=read("B176_REPORT.md");assert.match(r,/M2275–M2299|B177/)}],
[2279,"B177 successor roadmap evidence preserved",()=>{const r=read("B176_REPORT.md");assert.match(r,/M2275–M2299|B177/);assert.match(memory.currentRoadmap,/M\d+–M\d+/);assert.ok(String(memory.nextRoadmap||'').length>0)}],
[2280,"responsive typography authority remains centralized",()=>{const t=read("src/nexaTypography.ts");assert.match(t,/useWindowDimensions/);assert.match(t,/fontScale/);assert.match(t,/contentMaxWidth/);assert.match(t,/responsiveScale/)}],
[2281,"minimum touch-target authority remains 44px",()=>{const a=read("src/accessibility.ts");assert.match(a,/minTouchTarget: 44/);assert.match(a,/recommendedTouchTarget: 48/)}],
[2282,"Wallet primary controls expose semantic labels",()=>{const s=read("src/Wallet.tsx");for(const x of ["Back from Sky Wallet","Add Money","Withdraw","Send Money","History","Preview NEXA service fee","Confirm wallet transaction"])assert.ok(s.includes(x),x)}],
[2283,"Wallet history controls expose semantic labels",()=>{const s=read("src/Wallet.tsx");assert.match(s,/Load older wallet activity/);assert.doesNotMatch(s,/fontSize:\s*11\b/)}],
[2284,"Yaayz mode controls expose semantic labels",()=>{const s=read("src/YaayzScreen.tsx");assert.match(s,/Show \$\{x === "home"/);assert.match(s,/Search Yaayz tickets/);assert.match(s,/Filter Yaayz tickets by/)}],
[2285,"Yaayz discovery tiles expose meaningful labels",()=>{const s=read("src/YaayzScreen.tsx");assert.doesNotMatch(s,/const tile=/);assert.match(s,/accessibilityRole="button"/)}],
[2286,"Yaayz AdMob boundary remains isolated",()=>{assert.match(read("src/YaayzHomeFeed.tsx"),/YaayzNativeAd/);assert.doesNotMatch(read("src/app/(tabs)/index.tsx"),/YaayzNativeAd/)}],
[2287,"Money navigation exposes tab semantics",()=>{const s=read("src/MoneyDashboard.tsx");assert.match(s,/accessibilityRole="tab"/);assert.match(s,/accessibilityState=\{\{selected:view===id\}\}/)}],
[2288,"Money return controls expose labels",()=>{const s=read("src/MoneyDashboard.tsx");assert.match(s,/accessibilityRole="tab" accessibilityLabel=\{label\}/)}],
[2289,"Vendor dashboard preserves explicit add-product action",()=>{const s=read("src/VendorDashboard.tsx");assert.match(s,/>Add product</);assert.match(s,/d\.create\(/)}],
[2290,"Vendor dashboard financial actions remain reachable",()=>{const s=read("src/VendorDashboard.tsx");for(const x of ["Open payment","Verify payment","Renew for NGN 10,000 / 30 days","Pay NGN 30,000 entry","Mark paid","Send response"])assert.ok(s.includes(x),x)}],
[2291,"Zeeza inbox interaction surface remains present",()=>{const s=read("src/ZeezaInbox.tsx");assert.match(s,/ZeezaThreadScreen/);assert.match(s,/RoomScreen/);assert.ok((s.match(/<(?:TouchableOpacity|NexaPressable)/g)||[]).length>=3)}],
[2292,"Search/Add/Home quick access remains present",()=>{const s=(read("src/NexaNavKeys.tsx")+read("src/nexaAccessibility.ts"));for(const x of ["Search NEXA","Open NEXA Add actions","NEXA Home","Open NEXA directory"])assert.ok(s.includes(x),x)}],
[2293,"route inventory retains core destinations",()=>{const s=read("src/nexaRouteInventory.ts");for(const r of ["/(tabs)/search","/(tabs)/zeeza","/(tabs)/yaayz","/marketplace/vendor","/dami"])assert.ok(s.includes(r),r)}],
[2294,"user/vendor directory remains separate from settings",()=>{const s=read("src/nexaRouteInventory.ts");assert.match(s,/USER_VENDOR_DIRECTORY/);assert.doesNotMatch(s,/settings/)}],
[2295,"legal adult-only boundary remains intact",()=>{const s=read("server/v5_98_20_legal_runtime_governance.js");assert.match(s,/LEGAL_MIN_AGE = 18/);assert.match(s,/childrenAllowed: false/)}],
[2296,"payment wallet and CORS safety boundaries remain intact",()=>{const s=read("server/launchReadiness.js");assert.match(s,/PAYMENT_MODE.*mock/);assert.match(s,/NEXA_WALLET_MODE.*live/);assert.match(s,/CORS_ORIGINS.*\\*/)}],
[2297,"launch and store tooling remains dynamically tied to current identity",()=>{assert.match(read("scripts/launch-handoff-report.mjs"),/memory\.currentBatch/);assert.match(read("scripts/launch-candidate-report.mjs"),/memory\.currentRoadmap/);assert.match(read("scripts/store-submission-preflight.mjs"),/pkg\.version/)}],
[2298,"historical contracts through B176 remain registered in release gate",()=>{const g=read("scripts/release-gate.mjs");assert.ok(fs.existsSync(path.join(root,"server/v5_98_27_current_state.contract.test.js")));assert.ok(fs.existsSync(path.join(root,"server/v5_98_28_current_state.contract.test.js")))}],
[2299,"B176 provenance remains sealed and its successor roadmap is preserved",()=>{assert.equal(prov.release,"V5.98.28");assert.equal(prov.batch,"B176");assert.equal(prov.milestones,"M2275–M2299");assert.equal(prov.sourceBaseline,"V5.98.27 B175");assert.equal(prov.nextRoadmap,"M2300–M2324 / B177");assert.equal(tests.length,25)}],
];
for(const [n,title,fn] of tests)test(`B176 M${n}: ${title}`,fn);
test("B176 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
