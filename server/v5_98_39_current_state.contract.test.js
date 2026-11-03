"use strict";
const test=require("node:test"); const assert=require("node:assert/strict"); const fs=require("node:fs"); const path=require("node:path");
const root=path.join(__dirname,".."); const read=f=>fs.readFileSync(path.join(root,f),"utf8"); const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json");
const tests=[
[2550,"Marketplace storefront sold-out action state",()=>assert.match(read("src/MarketplaceStorefront.tsx"),/accessibilityLabel=\{out\?`\$\{p\.name\} is sold out`:.*accessibilityState=\{\{disabled:out\}\}/)],
[2551,"Marketplace quantity decrease state",()=>assert.match(read("src/MarketplaceStorefront.tsx"),/accessibilityLabel="Decrease quantity" disabled=\{!canBuy\|\|qty<=1\} accessibilityState=\{\{disabled:!canBuy\|\|qty<=1\}\}/)],
[2552,"Marketplace quantity increase state",()=>assert.match(read("src/MarketplaceStorefront.tsx"),/accessibilityLabel="Increase quantity" disabled=\{!canBuy\|\|qty>=cap\} accessibilityState=\{\{disabled:!canBuy\|\|qty>=cap\}\}/)],
[2553,"Marketplace add-cart target state",()=>{const s=read("src/MarketplaceStorefront.tsx");assert.match(s,/Choose size or colour first/);assert.match(s,/disabled=\{!canBuy\} accessibilityState=\{\{disabled:!canBuy\}\}/)}],
[2554,"Marketplace buy-now state",()=>assert.match(read("src/MarketplaceStorefront.tsx"),/accessibilityLabel=\{`Buy \$\{p\.name\} now`\} disabled=\{!canBuy\} accessibilityState=\{\{disabled:!canBuy\}\}/)],
[2555,"Marketplace seller-question busy state",()=>assert.match(read("src/MarketplaceStorefront.tsx"),/accessibilityLabel="Send question to seller" disabled=\{asking\} accessibilityState=\{\{disabled:asking\}\}/)],
[2556,"Zeeza room creation target state",()=>assert.match(read("src/ZeezaInbox.tsx"),/accessibilityLabel="Create Zeeza room"[\s\S]*?disabled=\{zeeza\.creatingRoom \|\| !name\.trim\(\)\} accessibilityState=\{\{disabled:zeeza\.creatingRoom \|\| !name\.trim\(\)\}\}/)],
[2557,"Zeeza room join target state",()=>assert.match(read("src/ZeezaInbox.tsx"),/accessibilityLabel="Join Zeeza room"[\s\S]*?disabled=\{zeeza\.joiningRoom \|\| code\.length !== 8\} accessibilityState=\{\{disabled:zeeza\.joiningRoom \|\| code\.length !== 8\}\}/)],
[2558,"Zeeza room message state",()=>{const s=read("src/RoomScreen.tsx");assert.ok(s.includes('accessibilityLabel="Send Zeeza room message"'));assert.ok(s.includes('accessibilityState={{disabled:!input.trim() || zeeza.sendingRoomMessage}}'))}],
[2559,"Notification preference save state",()=>{const s=read("src/NotificationCenter.tsx");assert.match(s,/disabled=\{savingPrefs\}/);assert.match(s,/accessibilityState=\{\{checked:pushEnabled,disabled:savingPrefs\}\}/)}],
[2560,"Membership scheduled-change cancellation state",()=>assert.match(read("src/Subscription.tsx"),/accessibilityLabel="Keep current membership plan"[\s\S]*?disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2561,"Membership auto-renewal stop state",()=>assert.match(read("src/Subscription.tsx"),/accessibilityLabel="Stop membership auto-renewal"[\s\S]*?disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2562,"Friends username action state",()=>assert.match(read("src/FriendsScreen.tsx"),/disabled=\{friends\.usernameSaving \|\| !check\?\.available\} accessibilityState=\{\{disabled:friends\.usernameSaving \|\| !check\?\.available\}\}/)],
[2563,"Friends request busy state",()=>assert.match(read("src/FriendsScreen.tsx"),/disabled=\{friends\.sendingRequest\} accessibilityState=\{\{disabled:friends\.sendingRequest\}\}/)],
[2564,"Marketplace screen source-card state",()=>assert.match(read("src/MarketplaceScreen.tsx"),/disabled=\{out\} accessibilityState=\{\{disabled:out\}\}/)],
[2565,"Marketplace checkout back state",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel="Back from Marketplace checkout"[\s\S]*?disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2566,"Marketplace checkout submit state",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel=\{pay==='online'\?'Place Marketplace order and pay online':'Place Marketplace order'\}[\s\S]*?accessibilityState=\{\{disabled:busy\|\|!m\.cart\.length\|\|!address\.trim\(\)\|\|!m\.feePreview\}\}/)],
[2567,"Vendor photo cover state",()=>assert.match(read("src/VendorPhotos.tsx"),/accessibilityLabel=\{`Make photo \$\{i\+1\} the cover`\} disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2568,"Vendor photo removal state",()=>assert.match(read("src/VendorPhotos.tsx"),/accessibilityLabel=\{`Remove photo \$\{i\+1\}`\} disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2569,"Vendor photo add state",()=>assert.match(read("src/VendorPhotos.tsx"),/accessibilityLabel="Add a product photo" disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2570,"Dami realtime action state",()=>assert.match(read("src/NexaAI.tsx"),/accessibilityLabel=\{realtimeStatus==='connected'\?'Stop live voice':'Start live voice'\}[\s\S]*?accessibilityState=\{\{disabled:!!recording\|\|busy\|\|realtimeStatus===\'connecting\'\}\}/)],
[2571,"Dami recording action state",()=>assert.match(read("src/NexaAI.tsx"),/accessibilityLabel=\{recording\?'Stop and send recorded voice':'Record a voice command'\}[\s\S]*?accessibilityState=\{\{disabled:busy&&!recording\|\|!!realtime\}\}/)],
[2572,"Dami message send state",()=>assert.match(read("src/NexaAI.tsx"),/accessibilityLabel="Send message to Dami"[\s\S]*?disabled=\{busy\|\|!!recording\} accessibilityState=\{\{disabled:busy\|\|!!recording\}\}/)],
[2573,"Zeeza shared-profile friend action state",()=>assert.match(read("src/app/zeeza/share/[token].tsx"),/accessibilityLabel="Add Zeeza friend" disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2574,"Fitness search state",()=>assert.match(read("src/app/leisure/fitness/index.tsx"),/accessibilityLabel="Find gyms"[\s\S]*?onPress=\{findGyms\} disabled=\{loading\} accessibilityState=\{\{disabled:loading\}\}/)]
];
for(const [n,title,fn] of tests)test(`B187 M${n}: ${title}`,fn);
test("B187 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
test("B187 historical release evidence remains preserved",()=>{const r=read("B187_REPORT.md");assert.ok(r.includes("V5.98.39") && r.includes("B187"));});
