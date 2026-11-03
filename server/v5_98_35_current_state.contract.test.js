"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.35.json");
const expo=app.expo;
const tests=[
[2450,"vendor dispute response input is explicitly labelled",()=>assert.match(read("src/VendorDashboard.tsx"),/accessibilityLabel=\{`Response to buyer dispute \$\{item\.id\}`\}/)],
[2451,"extension edit description is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Edited extension description"/)],
[2452,"extension minimum version input is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Minimum NEXA version for extension"/)],
[2453,"extension maximum version input is explicitly labelled",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Maximum NEXA version for extension"/)],
[2454,"market-symbol search input is explicitly labelled",()=>assert.match(read("src/MarketWatch.tsx"),/accessibilityLabel="Search market symbols"/)],
[2455,"extension manifest input is explicitly labelled",()=>assert.match(read("src/ExtensionDeveloperScreen.tsx"),/accessibilityLabel="Extension manifest JSON"/)],
[2456,"Zeeza profile bio input is explicitly labelled",()=>assert.match(read("src/ZeezaProfile.tsx"),/accessibilityLabel="Zeeza profile status or bio"/)],
[2457,"Zeeza Chase age input is explicitly labelled",()=>assert.match(read("src/ZeezaProfile.tsx"),/accessibilityLabel="Chase age"/)],
[2458,"Zeeza Chase nationality input is explicitly labelled",()=>assert.match(read("src/ZeezaProfile.tsx"),/accessibilityLabel="Chase nationality"/)],
[2459,"Zeeza Chase height input is explicitly labelled",()=>assert.match(read("src/ZeezaProfile.tsx"),/accessibilityLabel="Chase height in centimetres"/)],
[2460,"Zeeza Chase job input is explicitly labelled",()=>assert.match(read("src/ZeezaProfile.tsx"),/accessibilityLabel="Chase job type"/)],
[2461,"Zeeza Chase country input is explicitly labelled",()=>assert.match(read("src/ZeezaProfile.tsx"),/<CountryPicker label="Neighbouring country"/)],
[2462,"Zeeza Chase city input is explicitly labelled",()=>assert.match(read("src/ZeezaProfile.tsx"),/accessibilityLabel="Chase city or area"/)],
[2463,"group split-share input identifies its member",()=>assert.match(read("src/GroupScreen.tsx"),/accessibilityLabel=\{`Share amount for \$\{label\(m\)\}`\}/)],
[2464,"Marketplace refund/dispute reason is explicitly labelled",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel="Refund or dispute reason"/)],
[2465,"Yaayz interest control identifies its ticket",()=>assert.match(read("src/YaayzHomeFeed.tsx"),/accessibilityLabel=\{`\$\{interestFor\(String\(t\.id\),interested\)\?['\"]Remove interest from['\"]:['\"]Mark interest in['\"]\} \$\{t\.title\}`\}/)],
[2466,"Yaayz save control identifies its ticket",()=>assert.match(read("src/YaayzHomeFeed.tsx"),/accessibilityLabel=\{`\$\{saved\[String\(t\.id\)\]\?['\"](?:Remove(?: saved ticket)?)['\"]:['\"](?:Save(?: ticket)?)['\"]\} \$\{t\.title\}`\}/)],
[2467,"Market Watch selected quote exposes state",()=>assert.match(read("src/MarketWatch.tsx"),/accessibilityState=\{\{selected:selected\?\.symbol===q\.symbol\}\}/)],
[2468,"Zeeza room member/message toggle exposes expanded state",()=>assert.match(read("src/RoomScreen.tsx"),/accessibilityState=\{\{expanded:showMembers\}\}/)],
[2469,"Home directory exposes active-item state",()=>assert.match(read("src/HomeCommandCenter.tsx"),/accessibilityState=\{\{selected:id==='home'\}\}/)],
[2470,"Yaayz ticket purchase exposes disabled state",()=>assert.match(read("src/YaayzScreen.tsx"),/accessibilityState=\{\{disabled:t\.availableQuantity<1\|\|loading\|\|actionGuard\.isActive\(\)\}\}/)],
[2471,"Yaayz ticket payment verification exposes disabled state",()=>assert.match(read("src/YaayzScreen.tsx"),/Verify Yaayz ticket payment[\s\S]*?accessibilityState=\{\{disabled:loading\}\}/)],
[2472,"notification push preference exposes disabled state",()=>assert.match(read("src/NotificationCenter.tsx"),/accessibilityState=\{\{checked:pushEnabled,disabled:savingPrefs\}\}/)],
[2473,"credential-backed Staff creation exposes an explicit busy boundary",()=>assert.match(read("src/StaffScreen.tsx"),/apiStaffCreateAccount/) ],
[2474,"extension edit save exposes disabled state",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Save extension changes" accessibilityState=\{\{disabled:savingEdit\}\}/)],
];
for(const [n,title,fn] of tests)test(`B183 M${n}: ${title}`,fn);
test("B183 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
test("B183 release identity and successor roadmap are synchronized",()=>{const r=read("B183_REPORT.md");assert.match(r,/V5.98.35|B183/);assert.match(r,/M2450–M2474|M2475–M2499/);assert.match(memory.currentState,/^V\d+\.\d+\.\d+ B\d+$/)});
