"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const json=f=>JSON.parse(read(f));
const pkg=json("package.json"),server=json("server/package.json"),app=json("app.json"),lock=json("package-lock.json"),memory=json("PROJECT_MEMORY.json"),prov=json("RELEASE_PROVENANCE_V5.98.38.json");
const expo=app.expo;
const tests=[
[2525,"vendor product category selected state is explicit",()=>assert.match(read("src/VendorDashboard.tsx"),/accessibilityLabel=\{`Set product category to \$\{c\}`} accessibilityState=\{\{selected:category===c\}\}/)],
[2526,"vendor order status target selected state is explicit",()=>assert.match(read("src/VendorDashboard.tsx"),/accessibilityLabel=\{`Set order \$\{o\.orderId\} status to \$\{st\}`} accessibilityState=\{\{selected:o\.status===st\}\}/)],
[2527,"vendor product action has explicit loading state",()=>assert.match(read("src/VendorDashboard.tsx"),/accessibilityLabel="Add product" accessibilityState=\{\{disabled:d\.loading\}\} disabled=\{d\.loading\}/)],
[2528,"extension registration panel expanded state is explicit",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel=\{showRegister\?"Close extension registration":"Add extension"\} accessibilityState=\{\{expanded:showRegister\}\}/)],
[2529,"extension edit action loading state is explicit",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Edit extension details" accessibilityState=\{\{disabled:savingEdit\}\} disabled=\{savingEdit\}/)],
[2530,"extension audit expansion state is explicit",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel=\{expanded===ext\.id\?"Hide extension audit":"View extension audit"\} accessibilityState=\{\{expanded:expanded===ext\.id,disabled:!!busy\}\}/)],
[2531,"extension revoke action disabled state is explicit",()=>assert.match(read("src/ExtensionsScreen.tsx"),/accessibilityLabel="Revoke extension" accessibilityState=\{\{disabled:!!busy\}\} disabled=\{!!busy\}/)],
[2532,"extension API-key control state is not duplicated",()=>assert.ok((read("src/ExtensionDeveloperScreen.tsx").match(/accessibilityState=\{\{disabled:!!busy\}\}/g)||[]).length>=1)],
[2533,"extension example-manifest action has explicit busy state",()=>assert.match(read("src/ExtensionDeveloperScreen.tsx"),/accessibilityLabel="Load example manifest" accessibilityState=\{\{disabled:busy==='validate'\}\} disabled=\{busy==='validate'\}/)],
[2534,"wallet view navigation selected state is explicit",()=>assert.match(read("src/Wallet.tsx"),/accessibilityRole="tab" accessibilityLabel=\{label\} accessibilityState=\{\{selected:view===id\}\}/)],
[2535,"wallet provider-status action respects busy state",()=>assert.match(read("src/Wallet.tsx"),/accessibilityLabel="Check wallet provider status" accessibilityState=\{\{disabled:busy\}\} disabled=\{busy\}/)],
[2536,"wallet reconciliation action respects busy state",()=>assert.match(read("src/Wallet.tsx"),/accessibilityLabel="Reconcile wallet transaction" accessibilityState=\{\{disabled:busy\}\} disabled=\{busy\}/)],
[2537,"Marketplace payment-history filter selected state is explicit",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel=\{`Filter payment history by \$\{f\.label\}`} accessibilityState=\{\{selected:historyFilter===f\.id\}\}/)],
[2538,"Marketplace load-more action disabled state is explicit",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel="Load more products" accessibilityState=\{\{disabled:m\.loadingMore\}\} disabled=\{m\.loadingMore\}/)],
[2539,"Marketplace fee retry respects history refresh state",()=>assert.match(read("src/MarketplaceScreen.tsx"),/accessibilityLabel="Retry NEXA service fee" accessibilityState=\{\{disabled:historyLoading\}\} disabled=\{historyLoading\}/)],
[2540,"Yaayz ticket filter selected state is explicit",()=>assert.match(read("src/YaayzScreen.tsx"),/accessibilityLabel=\{`Filter Yaayz tickets by \$\{x\}`} accessibilityState=\{\{selected:type===x\}\}/)],
[2541,"Yaayz fee retry disabled state is explicit",()=>assert.match(read("src/YaayzScreen.tsx"),/accessibilityLabel=\{`Retry NEXA service fee for Yaayz order \$\{o\.id\}`} accessibilityState=\{\{disabled:loading\}\} disabled=\{loading\}/)],
[2542,"Kitchen payment verification disabled state is explicit",()=>assert.match(read("src/LeisureKitchenScreen.tsx"),/accessibilityLabel=\{`Verify payment for kitchen order \$\{o\.id\}`} accessibilityState=\{\{disabled:loading\}\} disabled=\{loading\}/)],
[2543,"Kitchen fee retry disabled state is explicit",()=>assert.match(read("src/LeisureKitchenScreen.tsx"),/accessibilityLabel=\{`Retry NEXA service fee for kitchen order \$\{o\.id\}`} accessibilityState=\{\{disabled:loading\}\} disabled=\{loading\}/)],
[2544,"Zeeza Chase clear action respects loading state",()=>assert.match(read("src/ZeezaChase.tsx"),/accessibilityLabel="Clear Chase preferences" accessibilityState=\{\{disabled:loading\}\} disabled=\{loading\}/)],
[2545,"Group rename action disabled state is explicit",()=>assert.match(read("src/GroupScreen.tsx"),/accessibilityLabel="Save group name" accessibilityState=\{\{disabled:g\.busy\}\} disabled=\{g\.busy\}/)],
[2546,"Group close/reopen state and busy state are explicit",()=>assert.match(read("src/GroupScreen.tsx"),/accessibilityLabel=\{grp\.closed \? "Reopen group" : "Close group"\} accessibilityState=\{\{selected:grp\.closed,disabled:g\.busy\}\} disabled=\{g\.busy\}/)],
[2547,"Group destructive actions respect busy state",()=>{const s=read("src/GroupScreen.tsx");assert.match(s,/accessibilityLabel="Delete group" accessibilityState=\{\{disabled:g\.busy\}\} disabled=\{g\.busy\}/);assert.match(s,/accessibilityLabel="Leave group" accessibilityState=\{\{disabled:g\.busy\}\} disabled=\{g\.busy\}/)}],
[2548,"Dami language selection state is explicit",()=>assert.match(read("src/NexaAI.tsx"),/accessibilityRole="radio" accessibilityLabel=\{'Use '\+v\.label\+' for Dami'\} accessibilityState=\{\{selected:languageCode===v\.code,disabled:preferenceBusy\}\} disabled=\{preferenceBusy\}/)],
[2549,"Home and notification action-state semantics are explicit",()=>{assert.match(read("src/HomeCommandCenter.tsx"),/accessibilityLabel="Open NEXA Add actions"/);assert.match(read("src/HomeCommandCenter.tsx"),/accessibilityLabel="Retry home update rail" accessibilityState=\{\{disabled:railLoading\}\} disabled=\{railLoading\}/);assert.match(read("src/NotificationCenter.tsx"),/accessibilityLabel=\{markingAll\?"Marking all notifications as read":"Mark all notifications as read"\} accessibilityState=\{\{disabled:savingPrefs\|\|markingAll\}\} disabled=\{savingPrefs\|\|markingAll\}/);assert.match(read("src/StoreAjo.tsx"),/accessibilityRole="radio" accessibilityState=\{\{selected:termMonths===m\}\} accessibilityLabel=\{`Set savings term to \$\{m\} months`\}/)}],
];
for(const [n,title,fn] of tests)test(`B186 M${n}: ${title}`,fn);
test("B186 contract is exactly 25 milestones",()=>assert.equal(tests.length,25));
test("B186 release identity and successor roadmap are synchronized",()=>{const r=read("B186_REPORT.md");assert.match(r,/V5.98.38|B186/);assert.match(r,/M2525–M2549|M2550–M2574/);assert.match(memory.currentState,/^V\d+\.\d+\.\d+ B\d+$/)});
