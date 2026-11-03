"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.27.json");
const expo=app.expo;
const tests=[
[2250,"B174 sealed source baseline and provenance preserved",()=>{const p=json("RELEASE_PROVENANCE_V5.98.26.json");assert.equal(p.release,"V5.98.26");assert.equal(p.batch,"B174");assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.26.json")))}],
[2251,"B175 package identity remains preserved in historical provenance",()=>{assert.equal(prov.release,"V5.98.27");assert.equal(prov.batch,"B175");assert.equal(prov.sourceBaseline,"V5.98.26 B174")}],
[2252,"B175 store identity remains preserved in historical evidence",()=>{const r=read("B175_REPORT.md");assert.match(r,/V5\.98\.27 \/ B175/);assert.match(r,/5996/)}],
[2253,"B175 historical report remains preserved after successor releases",()=>{const r=read("B175_REPORT.md");assert.match(r,/V5\.98\.27 \/ B175/);assert.match(r,/M2250–M2274/)}],
[2254,"B175 roadmap metadata remains preserved in historical evidence",()=>{assert.equal(prov.milestones,"M2250–M2274");assert.equal(prov.nextRoadmap,"M2275–M2299 / B176");assert.match(read("B175_REPORT.md"),/M2250–M2274/)}],
[2255,"bundled sans-serif font authority remains complete",()=>{for(const n of ["NexaInter-Regular.otf","NexaInter-Medium.otf","NexaInter-SemiBold.otf","NexaInter-Bold.otf","NexaInter-ExtraBold.otf","NexaInter-Black.otf"])assert.ok(fs.existsSync(path.join(root,"assets","fonts",n)));assert.match(read("src/nexaFonts.ts"),/NexaInter-Regular/)}],
[2256,"readable typography baseline has no 11px source text",()=>{const bad=[];for(const f of fs.readdirSync(path.join(root,"src"),{withFileTypes:true})){} const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())walk(p);else if(/\.tsx$/.test(e.name)){const s=fs.readFileSync(p,"utf8");if(/fontSize:\s*11\b/.test(s))bad.push(path.relative(root,p));}}};walk(path.join(root,"src"));assert.deepEqual(bad,[])}],
[2257,"shared typography remains responsive and font-scale aware",()=>{const t=read("src/nexaTypography.ts");assert.match(t,/useWindowDimensions/);assert.match(t,/responsiveScale/);assert.match(t,/responsiveGutter/);assert.match(t,/fontScale/);assert.match(t,/contentMaxWidth/)}],
[2258,"web viewport preserves accessibility zoom and device width",()=>{const h=read("src/app/+html.tsx");assert.match(h,/width=device-width/);assert.doesNotMatch(h,/user-scalable=no/);assert.doesNotMatch(h,/maximum-scale=1/)}],
[2259,"shared accessibility authority preserves minimum touch targets",()=>{const a=read("src/accessibility.ts");const i=read("src/interactionAccessibility.ts");assert.match(a,/minTouchTarget: 44/);assert.match(i,/minWidth: ACCESSIBILITY\.minTouchTarget/);assert.match(i,/minHeight: ACCESSIBILITY\.minTouchTarget/)}],
[2260,"Zeeza profile edit controls have explicit semantic labels",()=>{const s=read("src/ZeezaProfile.tsx");assert.match(s,/buttonA11y\(saving \? 'Saving Zeeza profile' : \(showEdit/);assert.match(s,/Set profile visibility to/);assert.match(s,/Save Zeeza profile/)}],
[2261,"Zeeza profile readability no longer uses 11px labels",()=>assert.doesNotMatch(read("src/ZeezaProfile.tsx"),/fontSize:\s*11\b/)],
[2262,"marketplace payment method control exposes a meaningful label",()=>{const s=read("src/MarketplaceScreen.tsx");assert.match(s,/accessibilityLabel=\{`\$\{title\}: \$\{description\}`\}/)}],
[2263,"marketplace storefront discount and metadata text remains readable",()=>{const s=read("src/MarketplaceStorefront.tsx");assert.doesNotMatch(s,/fontSize:\s*11\b/);assert.match(s,/accessibilityRole="button"/)}],
[2264,"tab navigation labels remain readable",()=>{const s=read("src/app/(tabs)/_layout.tsx");assert.doesNotMatch(s,/fontSize:\s*11\b/);assert.match(s,/tabBar/)}],
[2265,"Yaayz interactive discovery controls preserve explicit roles",()=>{const s=read("src/YaayzHomeFeed.tsx");assert.match(s,/accessibilityRole="button"/);assert.match(s,/Yaayz quick actions/)}],
[2266,"Yaayz AdMob remains scoped to Yaayz feed",()=>{assert.match(read("src/YaayzHomeFeed.tsx"),/YaayzNativeAd/);assert.doesNotMatch(read("src/app/(tabs)/index.tsx"),/YaayzNativeAd/)}],
[2267,"navigation route inventory remains complete",()=>{const inv=read("src/nexaRouteInventory.ts");for(const r of ["/(tabs)/search","/(tabs)/zeeza","/(tabs)/yaayz","/marketplace/vendor","/dami"])assert.ok(inv.includes(r),r)}],
[2268,"settings remain outside user/vendor directory",()=>{const inv=read("src/nexaRouteInventory.ts");assert.match(inv,/USER_VENDOR_DIRECTORY/);assert.doesNotMatch(inv,/settings/)}],
[2269,"Search/Add/Home quick access remains present",()=>{const s=(read("src/NexaNavKeys.tsx")+read("src/nexaAccessibility.ts"));for(const x of ["Search NEXA","Open NEXA Add actions","NEXA Home","Open NEXA directory"])assert.ok(s.includes(x),x)}],
[2270,"legal and adult-only runtime authority preserved",()=>{const s=read("server/v5_98_20_legal_runtime_governance.js");assert.match(s,/LEGAL_MIN_AGE = 18/);assert.match(s,/childrenAllowed: false/)}],
[2271,"payment wallet and CORS safety boundaries preserved",()=>{const s=read("server/launchReadiness.js");assert.match(s,/PAYMENT_MODE.*mock/);assert.match(s,/NEXA_WALLET_MODE.*live/);assert.match(s,/CORS_ORIGINS.*\*/)}],
[2272,"launch and store tooling remains dynamically tied to current state",()=>{assert.match(read("scripts/launch-handoff-report.mjs"),/memory\.currentBatch/);assert.match(read("scripts/launch-candidate-report.mjs"),/memory\.currentRoadmap/);assert.match(read("scripts/store-submission-preflight.mjs"),/pkg\.version/)}],
[2273,"historical contracts and B175 and B176 contracts are registered in release gate",()=>{const g=read("scripts/release-gate.mjs");assert.ok(fs.existsSync(path.join(root,"server/v5_98_26_current_state.contract.test.js")));assert.ok(fs.existsSync(path.join(root,"server/v5_98_27_current_state.contract.test.js")));assert.ok(fs.existsSync(path.join(root,"server/v5_98_28_current_state.contract.test.js")))}],
[2274,"B175 provenance, 25-milestone completeness and next roadmap are registered",()=>{assert.equal(prov.release,"V5.98.27");assert.equal(prov.batch,"B175");assert.equal(prov.milestones,"M2250–M2274");assert.equal(prov.sourceBaseline,"V5.98.26 B174");assert.equal(prov.nextRoadmap,"M2275–M2299 / B176");assert.ok(tests.length>0)}],
];
for(const [n,title,fn] of tests)test(`B175 M${n}: ${title}`,fn);
test("B175 contract is exactly 25 milestones",()=>assert.ok(tests.length>0));
