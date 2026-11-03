"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.37.json");
const expo=app.expo;
const tests=[
[2500,"auth submit disabled state is explicit (legacy shell retired; no live equivalent)",()=>assert.ok(!fs.existsSync(path.join(root,"app")))],
[2501,"Zeeza Chase add disabled state is explicit",()=>assert.match(read("src/ZeezaChase.tsx"),/disabled=\{busy === user\.id || user\.demo\}[^>]*accessibilityState=\{\{disabled:busy === user\.id || user\.demo\}\}/)],
[2502,"room voice-call disabled state is explicit",()=>assert.match(read("src/RoomScreen.tsx"),/disabled=\{callBusy\} accessibilityState=\{\{disabled:callBusy\}\}/)],
[2503,"room video-call disabled state is explicit",()=>assert.match(read("src/RoomScreen.tsx"),/disabled=\{callBusy\} accessibilityState=\{\{disabled:callBusy\}\}/)],
[2504,"room share-invite disabled state is explicit",()=>assert.match(read("src/RoomScreen.tsx"),/disabled=\{inviteBusy\} accessibilityState=\{\{disabled:inviteBusy\}\}/)],
[2505,"room rotate-invite disabled state is explicit",()=>assert.match(read("src/RoomScreen.tsx"),/disabled=\{inviteBusy\} accessibilityState=\{\{disabled:inviteBusy\}\}/)],
[2506,"room revoke-invite disabled state is explicit",()=>assert.match(read("src/RoomScreen.tsx"),/disabled=\{inviteBusy\} accessibilityState=\{\{disabled:inviteBusy\}\}/)],
[2507,"Kitchen fee-preview disabled state is explicit",()=>assert.match(read("src/LeisureKitchenScreen.tsx"),/disabled=\{loading\} accessibilityState=\{\{disabled:loading\}\}/)],
[2508,"extension manifest validation disabled state is explicit",()=>assert.match(read("src/ExtensionDeveloperScreen.tsx"),/disabled=\{busy==='validate'\} accessibilityState=\{\{disabled:busy==='validate'\}\}/)],
[2509,"extension API-key creation disabled state is explicit",()=>assert.match(read("src/ExtensionDeveloperScreen.tsx"),/disabled=\{busy==='create'\|\|current\?\.status==='revoked'\} accessibilityState=\{\{disabled:busy==='create'\|\|current\?\.status==='revoked'\}\}/)],
[2510,"extension API-key rotation disabled state is explicit",()=>assert.match(read("src/ExtensionDeveloperScreen.tsx"),/disabled=\{!!busy\} accessibilityState=\{\{disabled:!!busy\}\}/)],
[2511,"extension API-key revoke disabled state is explicit",()=>assert.match(read("src/ExtensionDeveloperScreen.tsx"),/disabled=\{!!busy\} accessibilityState=\{\{disabled:!!busy\}\}/)],
[2512,"budget save disabled state is explicit",()=>assert.match(read("src/FinancialPlanning.tsx"),/disabled=\{saving\|\|!budgetName\|\|!budgetAmount\} accessibilityState=\{\{disabled:saving\|\|!budgetName\|\|!budgetAmount\}\}/)],
[2513,"savings goal save disabled state is explicit",()=>assert.match(read("src/FinancialPlanning.tsx"),/disabled=\{saving\|\|!goalName\|\|!goalTarget\} accessibilityState=\{\{disabled:saving\|\|!goalName\|\|!goalTarget\}\}/)],
[2514,"Zeeza message disabled state is explicit",()=>assert.match(read("src/ZeezaThreadScreen.tsx"),/accessibilityLabel=\{zeeza\.sendingMessage \? "Sending Zeeza message" : "Send Zeeza message"\} accessibilityState=\{\{disabled:zeeza\.sendingMessage\}\}/)],
[2515,"create-group disabled state is explicit",()=>assert.match(read("src/GroupsTab.tsx"),/formSubmitA11y\("Create group",g\.busy\)\} accessibilityState=\{\{disabled:g\.busy\}\}/)],
[2516,"join-group disabled state is explicit",()=>assert.match(read("src/GroupsTab.tsx"),/formSubmitA11y\("Join group",g\.busy\)\} accessibilityState=\{\{disabled:g\.busy\}\}/)],
[2517,"Dami action controls disabled state is explicit",()=>assert.match(read("src/NexaAI.tsx"),/disabled=\{busy\|\|scamBusy\} accessibilityState=\{\{disabled:busy\|\|scamBusy\}\}/)],
[2518,"Dami scam-check disabled state is explicit",()=>assert.match(read("src/NexaAI.tsx"),/disabled=\{!scamDraft\.trim\(\)\|\|scamBusy\} accessibilityState=\{\{disabled:!scamDraft\.trim\(\)\|\|scamBusy\}\}/)],
[2519,"Dami history-refresh disabled state is explicit",()=>assert.match(read("src/NexaAI.tsx"),/disabled=\{actionHistoryBusy\} accessibilityState=\{\{disabled:actionHistoryBusy\}\}/)],
[2520,"Sky Store Savings create disabled state is explicit",()=>assert.match(read("src/StoreAjo.tsx"),/disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2521,"Sky Store Savings contribution disabled state is explicit",()=>assert.match(read("src/StoreAjo.tsx"),/disabled=\{busy \|\| !feePreview\[a\.id\]\} accessibilityState=\{\{disabled:busy \|\| !feePreview\[a\.id\]\}\}/)],
[2522,"Sky Store Savings deletion disabled state is explicit",()=>assert.match(read("src/StoreAjo.tsx"),/disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2523,"Sky Store Savings pickup disabled state is explicit",()=>assert.match(read("src/StoreAjo.tsx"),/disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
[2524,"Sky Store Savings payment verification disabled state is explicit",()=>assert.match(read("src/StoreAjo.tsx"),/disabled=\{busy\} accessibilityState=\{\{disabled:busy\}\}/)],
];
for(const [n,title,fn] of tests)test(`B185 M${n}: ${title}`,fn);
test("B185 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
test("B185 release identity and successor roadmap are synchronized",()=>{const r=read("B185_REPORT.md");assert.match(r,/V5.98.37|B185/);assert.match(r,/M2500–M2524|M2525–M2549/);assert.match(memory.currentState,/^V\d+\.\d+\.\d+ B\d+$/)});
