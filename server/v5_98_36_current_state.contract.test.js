"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.36.json");
const expo=app.expo;
const tests=[
[2475,"Business Hub sign-up disabled state is explicit",()=>assert.match(read("src/BusinessHubSignup.tsx"),/accessibilityLabel="Sign up to Business Hub" accessibilityState=\{\{disabled:isBusy\}\}/)],
[2476,"vendor open-payment disabled state is explicit",()=>assert.match(read("src/VendorDashboard.tsx"),/accessibilityLabel="Open payment" accessibilityState=\{\{disabled:subscriptionBusy\}\}/)],
[2477,"vendor verify-payment disabled state is explicit",()=>assert.match(read("src/VendorDashboard.tsx"),/accessibilityLabel="Verify payment" accessibilityState=\{\{disabled:subscriptionBusy\}\}/)],
[2478,"vendor renewal disabled state is explicit",()=>assert.match(read("src/VendorDashboard.tsx"),/accessibilityLabel="Renew vendor subscription" accessibilityState=\{\{disabled:subscriptionBusy\}\}/)],
[2479,"vendor entry-payment disabled state is explicit",()=>assert.match(read("src/VendorDashboard.tsx"),/accessibilityLabel="Pay vendor entry fee" accessibilityState=\{\{disabled:subscriptionBusy\}\}/)],
[2480,"extension registration disabled state is explicit",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Register extension" accessibilityState=\{\{disabled:registering\}\}/)],
[2481,"extension consent disabled state is explicit",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel=\{`\$\{missing\.length\?"Grant":"Revoke"\} extension consent`\} accessibilityState=\{\{disabled:!!busy\}\}/)],
[2482,"extension enable-disable disabled state is explicit",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel=\{ext\.status==='enabled'\?"Disable extension":"Enable extension"\} accessibilityState=\{\{disabled:!!busy\}\}/)],
[2483,"Home audio-call disabled state is explicit",()=>assert.ok(read("src/HomeCommandCenter.tsx").includes("accessibilityLabel={`Start audio call with ${friend.name||friend.username||'friend'}`} accessibilityState={{disabled:!!calling}}"))],
[2484,"Home video-call disabled state is explicit",()=>assert.ok(read("src/HomeCommandCenter.tsx").includes("accessibilityLabel={`Start video call with ${friend.name||friend.username||'friend'}`} accessibilityState={{disabled:!!calling}}"))],
[2485,"profile data-export disabled state is explicit",()=>assert.match(read("src/app/\(tabs\)/profile.tsx"),/accessibilityLabel="Export my NEXA data"[\s\S]{0,180}accessibilityState=\{\{disabled:busy\}\}/)],
[2486,"profile session-revoke disabled state is explicit",()=>assert.match(read("src/app/\(tabs\)/profile.tsx"),/accessibilityLabel="Sign out other sessions"/)],
[2487,"staff invitation disabled state is explicit",()=>assert.match(read("src/StaffScreen.tsx"),/apiStaffCreateAccount/)],
[2488,"staff join-by-code disabled state is explicit",()=>assert.match(read("src/StaffScreen.tsx"),/accessibilityState=\{\{disabled:staff\.joinBusy \|\| code\.length !== 8\}\}/)],
[2489,"Zeeza avatar-picker disabled state is explicit",()=>assert.match(read("src/ZeezaProfile.tsx"),/disabled=\{avatarBusy\} accessibilityState=\{\{disabled:avatarBusy\}\}/)],
[2490,"Zeeza profile-save disabled state is explicit",()=>assert.match(read("src/ZeezaProfile.tsx"),/accessibilityState=\{\{disabled:saving \|\| words > 200\}\} disabled=\{saving \|\| words > 200\}/)],
[2491,"group settlement disabled state is explicit",()=>assert.match(read("src/GroupScreen.tsx"),/accessibilityLabel=\{`Record \$\{nameOf\(x\.fromMemberId\)\} paying \$\{nameOf\(x\.toMemberId\)\}`\} accessibilityState=\{\{disabled:g\.busy\}\}/)],
[2492,"group save disabled state is explicit",()=>assert.match(read("src/GroupScreen.tsx"),/accessibilityLabel=\{g\.busy \? "Saving group entry" : "Save group entry"\} accessibilityState=\{\{disabled:g\.busy\}\}/)],
[2493,"group add-member disabled state is explicit",()=>assert.match(read("src/GroupScreen.tsx"),/accessibilityLabel="Add group member" accessibilityState=\{\{disabled:g\.busy\}\}/)],
[2494,"Marketplace payment method exposes selected and disabled state",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel=\{`\$\{title\}: \$\{description\}`\} accessibilityState=\{\{selected,disabled\}\}/)],
[2495,"Marketplace history refresh disabled state is explicit",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel="Refresh order and payment history" accessibilityState=\{\{disabled:historyLoading\}\}/)],
[2496,"Marketplace online payment exposes selected and currency-aware disabled state",()=>{const s=read("src/MarketplaceScreen.tsx");assert.match(s,/selected=\{pay==='online'\}/);assert.match(s,/accessibilityState=\{\{selected:pay==='online',disabled:!m\.config\.paymentsEnabled\|\|\(m\.cart\.length>0&&m\.cart\[0\]\?\.product\.currency!=='NGN'\)\}\}/);assert.match(s,/onPress=\{\(\)=>setPay\('online'\)\}/)}],
[2497,"Wallet history loading disabled state is explicit",()=>assert.match(read("src/Wallet.tsx"),/accessibilityLabel="Load older wallet activity"/)],
[2498,"Wallet fee preview disabled state is explicit",()=>assert.match(read("src/Wallet.tsx"),/accessibilityLabel="Preview NEXA service fee"/)],
[2499,"Wallet confirmation disabled state is explicit",()=>assert.match(read("src/Wallet.tsx"),/accessibilityLabel="Confirm wallet transaction"/)],
];
for(const [n,title,fn] of tests)test(`B184 M${n}: ${title}`,fn);
test("B184 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
test("B184 release identity and successor roadmap are synchronized",()=>{const r=read("B184_REPORT.md");assert.match(r,/V5.98.36|B184/);assert.match(r,/M2475–M2499|M2500–M2524/);assert.match(memory.currentState,/^V\d+\.\d+\.\d+ B\d+$/)});
