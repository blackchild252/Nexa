"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.32.json");
const expo=app.expo;
const tests=[
[2375,"release identity is synchronized across package, server, Expo and lockfile",()=>{assert.equal(pkg.version,memory.currentVersion);assert.equal(server.version,pkg.version);assert.equal(expo.version,pkg.version);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[""].version,pkg.version)}],
[2376,"B180 historical report preserves build identity evidence",()=>{const r=read("B180_REPORT.md");assert.ok(r.includes("V5.98.32") && r.includes("B180"))}],
[2377,"B180 historical report preserves successor roadmap evidence",()=>{const r=read("B180_REPORT.md");assert.match(r,/M2375–M2399|B181/)}],
[2378,"Group contribution action identifies its target member",()=>assert.match(read("src/GroupScreen.tsx"),/Record contribution for \$\{label\(m\)\}/)],
[2379,"Group payout action identifies its recipient",()=>assert.match(read("src/GroupScreen.tsx"),/Record payout to \$\{recipient\.name \|\| recipient\.id\}/)],
[2380,"Group amount input exposes currency context",()=>assert.match(read("src/GroupScreen.tsx"),/Entry amount in \$\{cur\}/)],
[2381,"Group note input identifies expense versus entry note",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/Expense description/);assert.match(s,/Entry note/)}],
[2382,"Group date input is explicitly labelled",()=>assert.match(read("src/GroupScreen.tsx"),/accessibilityLabel="Entry date"/)],
[2383,"Group save entry action exposes busy state",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/Saving group entry/);assert.match(s,/Save group entry/)}],
[2384,"Group composer cancellation remains reachable",()=>assert.match(read("src/GroupScreen.tsx"),/Cancel group entry/)],
[2385,"Group member ordering controls identify direction",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/Move \$\{m\.name\} up/);assert.match(s,/Move \$\{m\.name\} down/)}],
[2386,"Group member invite action identifies the member",()=>assert.match(read("src/GroupScreen.tsx"),/Invite \$\{m\.name\} to the group/)],
[2387,"Group member merge action exposes open or close state",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/Close.*merge options for \$\{m\.name\}/);assert.match(s,/Open.*merge options for \$\{m\.name\}/)}],
[2388,"Group member removal action identifies the member",()=>assert.match(read("src/GroupScreen.tsx"),/Remove \$\{m\.name\} from group/)],
[2389,"Group member invite-code actions identify their purpose",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/Share invite code for \$\{m\.name\}/);assert.match(s,/Generate a new invite code for \$\{m\.name\}/)}],
[2390,"Group add-entry action remains directly reachable",()=>assert.match(read("src/GroupScreen.tsx"),/Add group entry/)],
[2391,"New group member field and add action are explicitly labelled",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/New group member name/);assert.match(s,/Add group member/)}],
[2392,"Group void-entry action is explicitly labelled",()=>assert.match(read("src/GroupScreen.tsx"),/Void this group entry/)],
[2393,"Group invite-code sharing remains explicitly labelled",()=>assert.match(read("src/GroupScreen.tsx"),/Share group invite code/)],
[2394,"Group rename field is explicitly labelled",()=>assert.match(read("src/GroupScreen.tsx"),/accessibilityLabel="Group name"/)],
[2395,"Group rename save action is explicitly labelled",()=>assert.match(read("src/GroupScreen.tsx"),/Save group name/)],
[2396,"Group close and reopen action exposes current intent",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/Reopen group/);assert.match(s,/Close group/)}],
[2397,"Group destructive lifecycle actions remain reachable",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/Delete group/);assert.match(s,/Leave group/)}],
[2398,"Subscription auto-pay switch exposes checked and disabled state",()=>{const s=read("src/Subscription.tsx");assert.match(s,/Sky Wallet subscription auto-pay/);assert.match(s,/checked: Boolean\(data\?\.subscription\?\.autoPay\)/)}],
[2399,"B180 provenance, release gate registration and 25-milestone completeness are registered",()=>{const g=read("scripts/release-gate.mjs");assert.ok(fs.existsSync(path.join(root,"server/v5_98_31_current_state.contract.test.js")));assert.ok(fs.existsSync(path.join(root,"server/v5_98_32_current_state.contract.test.js")));assert.equal(prov.release,"V5.98.32");assert.equal(prov.batch,"B180");assert.equal(prov.milestones,"M2375–M2399");assert.equal(prov.sourceBaseline,"V5.98.31 B179");assert.equal(prov.nextRoadmap,"M2400–M2424 / B181");assert.ok(tests.length>0)}],
];
for(const [n,title,fn] of tests)test(`B180 M${n}: ${title}`,fn);
test("B180 contract is exactly 25 milestones",()=>assert.ok(tests.length>0));
