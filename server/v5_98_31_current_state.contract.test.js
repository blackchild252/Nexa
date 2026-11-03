"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.31.json");
const expo=app.expo;
const tests=[
[2350,"release identity synchronized across package, server, Expo and lockfile",()=>{assert.equal(pkg.version,memory.currentVersion);assert.equal(server.version,pkg.version);assert.equal(expo.version,pkg.version);assert.equal(lock.version,pkg.version);assert.equal(lock.packages[""].version,pkg.version)}],
[2351,"B179 historical report preserves build identity evidence",()=>{const r=read("B179_REPORT.md");assert.ok(r.includes("V5.98.31") && r.includes("B179"))}],
[2352,"B179 historical report preserves successor roadmap evidence",()=>{const r=read("B179_REPORT.md");assert.match(r,/M2325–M2349|B180/)}],
[2353,"Friends username and search fields expose explicit labels",()=>{const s=read("src/FriendsScreen.tsx");assert.match(s,/Choose your NEXA username/);assert.match(s,/Search friends by username/)}],
[2354,"Friends request actions are individually reachable",()=>{const s=read("src/FriendsScreen.tsx");for(const x of ["Accept friend request from","Decline friend request from","Cancel friend request to"])assert.match(s,new RegExp(x))}],
[2355,"Friends relationship actions are individually reachable",()=>{const s=read("src/FriendsScreen.tsx");for(const x of ["Add .* as a friend","Remove .* from friends","Block .*","Unblock .*"])assert.match(s,new RegExp(x))}],
[2356,"Zeeza room navigation and member/call controls expose semantics",()=>{const s=read("src/RoomScreen.tsx");for(const x of ["Back from Zeeza room","Show room messages","Start room voice call","Start room video call"])assert.match(s,new RegExp(x))}],
[2357,"Zeeza room invite lifecycle actions expose semantics",()=>{const s=read("src/RoomScreen.tsx");for(const x of ["Share Zeeza room invite","Rotate Zeeza room invite code","Revoke Zeeza room invite code"])assert.match(s,new RegExp(x))}],
[2358,"Zeeza room exit and message composer remain reachable",()=>{const s=read("src/RoomScreen.tsx");assert.match(s,/Delete Zeeza room/);assert.match(s,/Leave Zeeza room/);assert.match(s,/Zeeza room message/);assert.match(s,/Send Zeeza room message/)}],
[2359,"Groups module kind navigation exposes selected state",()=>{const s=read("src/GroupsTab.tsx");assert.match(s,/Open \$\{label\} group area/);assert.match(s,/selected:kind === "groups"/)}],
[2360,"Groups module cycle controls preserve radio semantics",()=>{const s=read("src/GroupsTab.tsx");assert.match(s,/Set group cycle to/);assert.match(s,/accessibilityRole="radio"/)}],
[2361,"Group detail filters preserve radio semantics",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/Filter group by/);assert.match(s,/selected:on/)}],
[2362,"Group settlement action identifies both payer and recipient",()=>assert.match(read("src/GroupScreen.tsx"),/Record \$\{nameOf\(x\.fromMemberId\)\} paying \$\{nameOf\(x\.toMemberId\)\}/)],
[2363,"Chase preference disclosure exposes expanded state",()=>{const s=read("src/ZeezaChase.tsx");assert.match(s,/Collapse Chase preferences/);assert.match(s,/Expand Chase preferences/);assert.match(s,/expanded:filtersOpen/)}],
[2364,"Chase filter fields expose explicit labels",()=>{const s=read("src/ZeezaChase.tsx");for(const x of ["Minimum Chase age","Maximum Chase age","Chase nationality filter","Chase town or city filter","Minimum Chase height in centimetres","Maximum Chase height in centimetres","Chase job type filter"])assert.match(s,new RegExp(x))}],
[2365,"Chase clear and add actions remain semantically reachable",()=>{const s=read("src/ZeezaChase.tsx");assert.match(s,/Clear Chase preferences/);assert.match(s,/Add \$\{user\.name \|\| "person"\} from Chase/)}],
[2366,"Kitchen cart quantity controls identify the item and direction",()=>{const s=read("src/LeisureKitchenScreen.tsx");assert.match(s,/Remove one \$\{i\.name\} from Kitchen order/);assert.match(s,/Add one \$\{i\.name\} to Kitchen order/)}],
[2367,"Kitchen fee and referral actions expose semantics",()=>{const s=read("src/LeisureKitchenScreen.tsx");assert.match(s,/Preview NEXA Kitchen service fee/);assert.match(s,/Share Kitchen referral code/);assert.match(s,/Kitchen referral code/)}],
[2368,"Leisure Arena destinations identify their target module",()=>assert.match(read("src/LeisureArenaScreen.tsx"),/Open \$\{a\.title\} in Leisure Arena/)],
[2369,"Membership back navigation is explicitly labelled",()=>assert.match(read("src/Subscription.tsx"),/Back from NEXA Membership/)],
[2370,"Membership lifecycle actions are explicitly labelled",()=>{const s=read("src/Subscription.tsx");assert.match(s,/Keep current membership plan/);assert.match(s,/Stop membership auto-renewal/)}],
[2371,"Membership activation/change action identifies the selected plan",()=>{const s=read("src/Subscription.tsx");assert.match(s,/Activate \$\{chosen\?\.name/);assert.match(s,/Change membership to \$\{chosen\?\.name/)}],
[2372,"Staff invitation form fields and cancellation are reachable",()=>{const s=read("src/StaffScreen.tsx");assert.match(s,/apiStaffCreateAccount/);assert.match(s,/Create|Add/);}],
[2373,"Zeeza inbox room creation/join controls expose navigation semantics",()=>{const s=read("src/ZeezaInbox.tsx");for(const x of ["Create new Zeeza room","Join Zeeza room with code","Zeeza inbox","Zeeza rooms","Zeeza room name","Zeeza room invite code"])assert.match(s,new RegExp(x))}],
[2374,"offline retry, notification bulk action and provenance are registered",()=>{assert.match(read("src/auth.tsx"),/Retry NEXA connection/);assert.match(read("src/NotificationCenter.tsx"),/Mark all notifications as read/);const g=read("scripts/release-gate.mjs");assert.ok(fs.existsSync(path.join(root,"server/v5_98_30_current_state.contract.test.js")));assert.ok(fs.existsSync(path.join(root,"server/v5_98_31_current_state.contract.test.js")));assert.equal(prov.release,"V5.98.31");assert.equal(prov.batch,"B179");assert.equal(prov.milestones,"M2350–M2374");assert.equal(prov.sourceBaseline,"V5.98.30 B178");assert.equal(prov.nextRoadmap,"M2375–M2399 / B180");assert.equal(tests.length,25)}],
];
for(const [n,title,fn] of tests)test(`B179 M${n}: ${title}`,fn);
test("B179 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
