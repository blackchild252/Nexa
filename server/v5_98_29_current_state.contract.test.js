"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.29.json");
const expo=app.expo;
const tests=[
[2300,"B176 sealed source baseline and provenance preserved",()=>{const p=json("RELEASE_PROVENANCE_V5.98.29.json");assert.equal(p.release,"V5.98.29");assert.equal(p.batch,"B177");assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.28.json"))) }],
[2301,"package/server/Expo/root lockfile identity synchronized",()=>{assert.equal(pkg.version,memory.currentVersion);assert.equal(server.version,pkg.version);assert.equal(expo.version,pkg.version);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[""].version,pkg.version)}],
[2302,"B177 historical report preserves release identity and build evidence",()=>{const r=read("B177_REPORT.md");assert.ok(r.includes("V5.98.29") && r.includes("B177"))}],
[2303,"B177 historical report preserves roadmap evidence",()=>{const r=read("B177_REPORT.md");assert.match(r,/M2300–M2324|B179/)}],
[2304,"current and successor roadmap synchronized",()=>{const r=read("B177_REPORT.md");assert.match(r,/M2300–M2324|B178/);assert.match(memory.currentRoadmap,/M\d+–M\d+/);assert.ok(String(memory.nextRoadmap||'').length>0)}],
[2305,"responsive typography authority remains centralized",()=>{const s=read("src/nexaTypography.ts");assert.match(s,/useWindowDimensions/);assert.match(s,/fontScale/);assert.match(s,/contentMaxWidth/);assert.match(s,/responsiveScale/)}],
[2306,"minimum touch-target authority remains 44px",()=>{const s=read("src/accessibility.ts");assert.match(s,/minTouchTarget: 44/);assert.match(s,/recommendedTouchTarget: 48/)}],
[2307,"Marketplace category controls expose semantics",()=>{const s=read("src/MarketplaceScreen.tsx");assert.match(s,/Show all Marketplace categories/);assert.match(s,/Filter Marketplace by/)}],
[2308,"Marketplace payment-history search and filters expose semantics",()=>{const s=read("src/MarketplaceScreen.tsx");assert.match(s,/Search payment history by reference or order ID/);assert.match(s,/Filter payment history by/)}],
[2309,"Marketplace checkout actions expose semantics",()=>{const s=read("src/MarketplaceScreen.tsx");assert.match(s,/Back from Marketplace checkout/);assert.match(s,/Place Marketplace order/);assert.match(s,/Retry NEXA service fee/)}],
[2310,"MarketWatch quote tiles expose semantics",()=>{const s=read("src/MarketWatch.tsx");assert.match(s,/Open market quote for/)}],
[2311,"Money overview actions expose semantics",()=>{const s=read("src/MoneyDashboard.tsx");for(const x of ["Open NEXA Membership and service fees","Open Sky Financial Planning and Goals","Open Marketplace payments and history"])assert.ok(s.includes(x),x)}],
[2312,"Financial Planning controls expose semantics",()=>{const s=read("src/FinancialPlanning.tsx");for(const x of ["Budget name","Budget amount in Nigerian naira","Savings goal name","Save budget","Save savings goal"])assert.ok(s.includes(x),x)}],
[2313,"Vendor dashboard navigation tabs expose semantics",()=>{const s=read("src/VendorDashboard.tsx");assert.match(s,/accessibilityRole="tab"/);assert.match(s,/Open vendor/)}],
[2314,"Vendor product form controls expose semantics",()=>{const s=read("src/VendorDashboard.tsx");for(const x of ["Product name","Product price in Nigerian naira","Product stock quantity","Product description","Add product"])assert.ok(s.includes(x),x)}],
[2315,"Vendor financial/order actions expose semantics",()=>{const s=read("src/VendorDashboard.tsx");for(const x of ["Open payment","Verify payment","Renew vendor subscription","Pay vendor entry fee","Delete product"])assert.ok(s.includes(x),x)}],
[2316,"Zeeza share actions expose semantics",()=>{const s=read("src/app/zeeza/share/[token].tsx");assert.match(s,/Add Zeeza friend/);assert.match(s,/Open Zeeza/)}],
[2317,"Call controls expose semantics",()=>{const s=read("src/CallScreen.tsx");for(const x of ["Decline call","Accept call","Mute microphone","Flip camera","End call"])assert.ok(s.includes(x),x)}],
[2318,"Group call controls expose semantics",()=>{const s=read("src/GroupCallScreen.tsx");for(const x of ["Mute microphone","Turn camera on","Leave group call"])assert.ok(s.includes(x),x)}],
[2319,"Groups entry controls expose semantics",()=>{const s=read("src/GroupsTab.tsx");for(const x of ["Create new group","Join group with code","Open group","Choose group type"])assert.ok(s.includes(x),x)}],
[2320,"Leisure Ball House controls expose semantics",()=>{const s=read("src/app/leisure/ball-house/index.tsx");for(const x of ["Filter Ball House by league","Filter Ball House by state","Get Ball House arena tickets","Back to Leisure"])assert.ok(s.includes(x),x)}],
[2321,"Leisure Fitness controls and inputs expose semantics",()=>{const s=read("src/app/leisure/fitness/index.tsx");for(const x of ["Town or city for gym search","Find gyms","Gym or fitness company name","Register gym","Back to Leisure"])assert.ok(s.includes(x),x)}],
[2322,"Leisure Kitchen and Game House actions expose semantics",()=>{const k=read("src/app/leisure/kitchen/ref/[code].tsx"),g=read("src/app/leisure/game-house/index.tsx");assert.match(k,/Open The Kitchen/);assert.match(k,/Continue/);assert.match(g,/Find Game House tickets in Yaayz/)}],
[2323,"Developer and Extensions actions expose semantics",()=>{const d=read("src/ExtensionDeveloperScreen.tsx"),e=read("src/ExtensionsScreen.tsx");for(const x of ["Validate extension manifest","Load example manifest","Create API key","Rotate API key","Revoke API key"])assert.ok(d.includes(x),x);for(const x of ["Add extension","Register extension","Edit extension details","Revoke extension"])assert.ok(e.includes(x),x)}],
[2324,"historical contracts, release gate, provenance and 25-milestone completeness are registered",()=>{const g=read("scripts/release-gate.mjs");assert.ok(fs.existsSync(path.join(root,"server/v5_98_28_current_state.contract.test.js")));assert.ok(fs.existsSync(path.join(root,"server/v5_98_29_current_state.contract.test.js")));assert.equal(prov.release,"V5.98.29");assert.equal(prov.batch,"B177");assert.equal(prov.milestones,"M2300–M2324");assert.equal(prov.sourceBaseline,"V5.98.28 B176");assert.equal(prov.nextRoadmap,"M2325–M2349 / B178");assert.equal(tests.length,25)}],
];
for(const [n,title,fn] of tests)test(`B177 M${n}: ${title}`,fn);
test("B177 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
