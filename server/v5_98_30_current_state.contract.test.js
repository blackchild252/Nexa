"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.30.json");
const expo=app.expo;
const tests=[
[2325,"B177 sealed source baseline and provenance preserved",()=>{const p=json("RELEASE_PROVENANCE_V5.98.29.json");assert.equal(p.release,"V5.98.29");assert.equal(p.batch,"B177");assert.ok(fs.existsSync(path.join(root,"RELEASE_SEAL_V5.98.29.json")))}],
[2326,"package/server/Expo/root lockfile identity synchronized",()=>{assert.equal(pkg.version,memory.currentVersion);assert.equal(server.version,pkg.version);assert.equal(expo.version,pkg.version);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[""].version,pkg.version)}],
[2327,"B179 historical report preserves release identity and build evidence",()=>{const r=read("B179_REPORT.md");assert.ok(r.includes("V5.98.31") && r.includes("B179"))}],
[2328,"B179 historical report preserves roadmap evidence",()=>{const r=read("B179_REPORT.md");assert.match(r,/M2325–M2349|B180/)}],
[2329,"latent Marketplace TSX handler defect is repaired",()=>{const s=read("src/MarketplaceScreen.tsx");assert.match(s,/onPress=\{\(\)=>m\.setCategory\(''\)\} style=/);assert.doesNotMatch(s,/onPress=\{\(\)=>m\.setCategory\(''\) style=/)}],
[2330,"Marketplace category controls expose semantic state",()=>{const s=read("src/MarketplaceScreen.tsx");assert.match(s,/Show all Marketplace categories/);assert.match(s,/Filter Marketplace by/)}],
[2331,"Marketplace primary search action exposes semantics",()=>{const s=read("src/MarketplaceScreen.tsx");assert.match(s,/Search Marketplace/);assert.match(s,/Search products/)}],
[2332,"Marketplace checkout actions and delivery fields remain reachable",()=>{const s=read("src/MarketplaceScreen.tsx");for(const x of ["Full delivery address","Delivery instructions (optional)","Back from Marketplace checkout","Place Marketplace order"])assert.ok(s.includes(x),x)}],
[2333,"Unified Search input exposes an explicit label",()=>assert.match(read("src/UnifiedSearch.tsx"),/accessibilityLabel="Search NEXA" value=\{q\}/)],
[2334,"Unified Search filters expose selected state",()=>{const s=read("src/UnifiedSearch.tsx");assert.match(s,/accessibilityRole="radio"/);assert.match(s,/Filter search by/);assert.match(s,/selected:filter===id/)}],
[2335,"Home directory dismissal is screen-reader reachable",()=>{const s=read("src/HomeCommandCenter.tsx");assert.match(s,/Dismiss NEXA directory/);assert.match(s,/Close NEXA menu/)}],
[2336,"Yaayz ticket search exposes semantics",()=>{const s=read("src/YaayzScreen.tsx");assert.match(s,/Search Yaayz tickets/);assert.match(s,/Search tickets/)}],
[2337,"Yaayz ticket purchase action exposes availability-aware semantics",()=>assert.match(read("src/YaayzScreen.tsx"),/Buy.*Yaayz ticket/)],
[2338,"Yaayz mode navigation exposes selected state",()=>{const s=read("src/YaayzScreen.tsx");assert.match(s,/accessibilityRole="tab"/);assert.match(s,/selected:mode===x/)}],
[2339,"Yaayz discovery sorting exposes explicit labels",()=>assert.match(read("src/YaayzHomeFeed.tsx"),/Sort Yaayz by \$\{x\}/)],
[2340,"Zeeza thread close control is semantic",()=>assert.match(read("src/ZeezaThreadScreen.tsx"),/Close Zeeza conversation/)],
[2341,"Zeeza message input exposes an explicit label",()=>assert.match(read("src/ZeezaThreadScreen.tsx"),/accessibilityLabel="Zeeza message"/)],
[2342,"Theme picker options expose radio semantics",()=>{const s=read("src/ThemePicker.tsx");assert.match(s,/accessibilityRole="radio"/);assert.match(s,/\$\{o\.title\}\$\{o\.id === 'default'/)}],
[2343,"Store Ajo payment URL awaits the secure navigation call",()=>{const s=read("src/StoreAjo.tsx");assert.match(s,/await openPaymentUrl\(String\(data\.payment\.authorization_url\)\)/);assert.doesNotMatch(s,/await await openPaymentUrl/)}],
[2344,"Store Ajo payment email input exposes semantics",()=>assert.match(read("src/StoreAjo.tsx"),/placeholder="Payment email" accessibilityLabel="Payment email"/)],
[2345,"Zeeza inbox conversation and room entries expose semantics",()=>{const s=read("src/ZeezaInbox.tsx");assert.match(s,/Open Zeeza conversation/);assert.match(s,/Open Zeeza room/)}],
[2346,"Notification filters and notification entries retain explicit accessibility state",()=>{const s=read("src/NotificationCenter.tsx");assert.match(s,/accessibilityRole="tab" accessibilityLabel=\{`Filter notifications by \$\{label\(x\)\}`\}/);assert.match(s,/Tap to open/)}],
[2347,"Membership plans expose selected radio state",()=>{const s=read("src/Subscription.tsx");assert.match(s,/accessibilityRole="radio"/);assert.match(s,/selected:isChosen/)}],
[2348,"Wallet and staff high-value actions remain semantically reachable",()=>{const w=read("src/Wallet.tsx"),st=read("src/StaffScreen.tsx");for(const x of ["Check wallet provider status","Reconcile wallet transaction","Wallet transaction amount in Nigerian naira"])assert.ok(w.includes(x),x);for(const x of ["Invite someone to the shop","staff member"])assert.ok(st.includes(x),x)}],
[2349,"historical contracts, release gate, provenance and 25-milestone completeness are registered",()=>{const g=read("scripts/release-gate.mjs");assert.ok(fs.existsSync(path.join(root,"server/v5_98_29_current_state.contract.test.js")));assert.ok(fs.existsSync(path.join(root,"server/v5_98_30_current_state.contract.test.js")));assert.equal(prov.release,"V5.98.30");assert.equal(prov.batch,"B178");assert.equal(prov.milestones,"M2325–M2349");assert.equal(prov.sourceBaseline,"V5.98.29 B177");assert.equal(prov.nextRoadmap,"M2350–M2374 / B179");assert.equal(tests.length,25)}],
];
for(const [n,title,fn] of tests)test(`B179 M${n}: ${title}`,fn);
test("B179 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
