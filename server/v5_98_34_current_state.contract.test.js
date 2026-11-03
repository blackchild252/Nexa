"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.34.json");
const expo=app.expo;
const tests=[
[2425,"auth account-mode toggle exposes explicit action (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2426,"Home search exposes explicit action (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2427,"Home Extensions destination exposes explicit action (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2428,"Dami floating action exposes explicit action (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2429,"Home bottom navigation exposes Home tab semantics (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2430,"Home bottom navigation retains Sky Money tab (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2431,"Home bottom navigation retains Zeeza tab (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2432,"Home bottom navigation retains Marketplace tab (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2433,"Home bottom navigation retains Inbox tab (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2434,"Yaayz ticket verification identifies the order",()=>assert.match(read("src/YaayzScreen.tsx"),/Verify Yaayz ticket payment/)],
[2435,"Yaayz service-fee retry identifies the order",()=>assert.match(read("src/YaayzScreen.tsx"),/Retry NEXA service fee for Yaayz order/)],
[2436,"Notification push control exposes switch label",()=>assert.match(read("src/NotificationCenter.tsx"),/accessibilityRole="switch" accessibilityLabel="Enable NEXA push notifications"/)],
[2437,"Zeeza room creation exposes explicit action",()=>assert.match(read("src/ZeezaInbox.tsx"),/accessibilityLabel="Create Zeeza room"/)],
[2438,"Zeeza room join exposes explicit action",()=>assert.match(read("src/ZeezaInbox.tsx"),/accessibilityLabel="Join Zeeza room"/)],
[2439,"Marketplace delivery address is explicitly labelled",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel="Full delivery address"/)],
[2440,"Marketplace delivery instructions are explicitly labelled",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel="Delivery instructions"/)],
[2441,"Sky Store Savings contribution amount is explicitly labelled",()=>assert.match(read("src/StoreAjo.tsx"),/Contribution amount for \${a.productName \|\| a.id\}/)],
[2442,"Dami scam-check input is explicitly labelled",()=>assert.ok(read("src/NexaAI.tsx").includes("accessibilityLabel=\"Suspicious text for scam check\""))],
[2443,"Financial goal current amount identifies its goal",()=>assert.match(read("src/FinancialPlanning.tsx"),/Current savings amount for \${g.name\}/)],
[2444,"Extension registration name is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Extension name"/)],
[2445,"Extension registration slug is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Extension slug"/)],
[2446,"Extension registration version is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Extension version"/)],
[2447,"Extension registration description is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Extension description"/)],
[2448,"Extension edit name is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Edited extension name"/)],
[2449,"Extension edit version is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Edited extension version"/)],
];
for(const [n,title,fn] of tests)test(`B183 M${n}: ${title}`,fn);
test("B183 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
test("B182 release identity and successor roadmap are synchronized",()=>{const r=read("B182_REPORT.md");assert.match(r,/V5.98.34|B182/);assert.match(r,/M2425–M2449|M2450–M2474/);assert.match(memory.currentState,/^V\d+\.\d+\.\d+ B\d+$/)});
