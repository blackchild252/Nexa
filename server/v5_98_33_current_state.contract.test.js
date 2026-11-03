"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.33.json");
const expo=app.expo;
const tests=[
[2400,"vendor disputes retry action is explicitly labelled",()=>assert.match(read("src/VendorDashboard.tsx"),/Load vendor disputes/)],
[2401,"vendor submission action is explicitly labelled",()=>assert.match(read("src/VendorDashboard.tsx"),/Submit vendor action/)],
[2402,"home update retry action is explicitly labelled",()=>assert.match(read("src/HomeCommandCenter.tsx"),/Retry home update rail/)],
[2403,"home audio call action identifies the friend",()=>assert.match(read("src/HomeCommandCenter.tsx"),/Start audio call with/)],
[2404,"home video call action identifies the friend",()=>assert.match(read("src/HomeCommandCenter.tsx"),/Start video call with/)],
[2405,"home Zeeza friends destination remains explicitly reachable",()=>assert.match(read("src/HomeCommandCenter.tsx"),/Open Zeeza Friends/)],
[2406,"Yaayz advertiser link identifies its destination",()=>assert.match(read("src/YaayzScreen.tsx"),/Visit.*advertiser/)],
[2407,"Yaayz discovery sort controls expose action intent",()=>assert.match(read("src/YaayzHomeFeed.tsx"),/Sort Yaayz by/)],
[2408,"Yaayz mode result cards identify their open action",()=>assert.match(read("src/YaayzHomeFeed.tsx"),/Open \$\{t\.title\}/)],
[2409,"Kitchen payment verification identifies the order",()=>assert.match(read("src/LeisureKitchenScreen.tsx"),/Verify payment for kitchen order/)],
[2410,"Kitchen service-fee retry identifies the order",()=>assert.match(read("src/LeisureKitchenScreen.tsx"),/Retry NEXA service fee for kitchen order/)],
[2411,"Zeeza message send action exposes sending state",()=>{const s=read("src/ZeezaThreadScreen.tsx");assert.match(s,/Send Zeeza message/);assert.match(s,/Sending Zeeza message/)}],
[2412,"Dami language choices identify the selected language",()=>assert.match(read("src/NexaAI.tsx"),/Use .* for Dami/)],
[2413,"Sky Store Savings term controls expose radio state",()=>assert.match(read("src/StoreAjo.tsx"),/Set savings term to \$\{m\} months/)],
[2414,"Sky Store Savings creation identifies the product",()=>assert.match(read("src/StoreAjo.tsx"),/Create Sky Store Savings for/)],
[2415,"Sky Store Savings contribution identifies the account",()=>assert.match(read("src/StoreAjo.tsx"),/Contribute to \$\{a\.productName/)],
[2416,"Sky Store Savings deletion identifies the account",()=>assert.match(read("src/StoreAjo.tsx"),/Delete \$\{a\.productName/)],
[2417,"Sky Store Savings pickup identifies the order",()=>assert.match(read("src/StoreAjo.tsx"),/Pick up \$\{a\.productName/)],
[2418,"Sky Store Savings payment verification identifies the payment",()=>assert.match(read("src/StoreAjo.tsx"),/Verify contribution payment/)],
[2419,"staff role controls expose radio selection",()=>assert.match(read("src/StaffScreen.tsx"),/Set invite role to/)],
[2420,"staff invitation action is explicitly labelled",()=>assert.match(read("src/StaffScreen.tsx"),/Send staff invitation/)],
[2421,"staff invite-code join action is explicitly labelled",()=>assert.match(read("src/StaffScreen.tsx"),/Join shop with staff invite code/)],
[2422,"Zeeza Chase opt-in exposes switch label",()=>assert.match(read("src/ZeezaProfile.tsx"),/Allow my Zeeza profile in Chase/)],
[2423,"NEXA Add-menu entries retain explicit action labels",()=>assert.match(read("src/NexaNavKeys.tsx"),/key=\{id\} accessibilityRole="button" accessibilityLabel=\{label\} onPress=\{\(\) => go\(id\)\}/)],
[2424,"B181 release identity, provenance and successor roadmap are synchronized",()=>{const g=read("scripts/release-gate.mjs");assert.ok(fs.existsSync(path.join(root,"server/v5_98_33_current_state.contract.test.js")));assert.equal(pkg.version,memory.currentVersion);assert.equal(server.version,pkg.version);assert.equal(expo.version,pkg.version);assert.equal(String(expo.android.versionCode),String(expo.ios.buildNumber));assert.equal(lock.version,pkg.version);assert.equal(prov.release,"V5.98.33");assert.equal(prov.batch,"B181");assert.equal(prov.milestones,"M2400–M2424");assert.equal(prov.sourceBaseline,"V5.98.32 B180");assert.equal(prov.nextRoadmap,"M2425–M2449 / B182");assert.equal(tests.length,25)}],
];
for(const [n,title,fn] of tests)test(`B181 M${n}: ${title}`,fn);
test("B181 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
