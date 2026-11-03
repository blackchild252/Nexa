import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const ms=(file,pattern,title)=>()=>{assert.match(read(file),pattern,title)};
const tests=[
[2600,'Marketplace shop rail exposes tab semantics',ms('src/MarketplaceScreen.tsx',/function ShopRail[\s\S]*?accessibilityRole="tab" accessibilityState=\{\{selected:on\}\} accessibilityLabel=\{`\$\{v\.shopName\}, \$\{v\.productCount\} products`\}/,'Marketplace shop tabs')],
[2601,'Marketplace department rail exposes tab semantics',ms('src/MarketplaceStorefront.tsx',/accessibilityRole="tab" accessibilityState=\{\{selected:on\}\} accessibilityLabel=\{`\$\{departmentLabel\(d\.category\)}, \$\{d\.productCount\} product\$\{d\.productCount===1\?'':'s'\}`\}/,'Marketplace department tabs')],
[2602,'Marketplace sort controls expose tab semantics',ms('src/MarketplaceStorefront.tsx',/accessibilityRole="tab" accessibilityState=\{\{selected:filters\.sort===k,disabled:k!==\'newest\'&&!filters\.currency\}\} accessibilityLabel=\{`Sort by \$\{SORT_LABELS\[k\]\}\$\{k!==\'newest\'&&!filters\.currency\?' \(select a currency first\)':''\}`} onPress=\{\(\)=>onChange\(\{\.\.\.filters,sort:k\}\)\}/,'Marketplace sort tabs')],
[2603,'Marketplace deals filter exposes tab semantics',ms('src/MarketplaceStorefront.tsx',/accessibilityRole="tab" accessibilityState=\{\{selected:!!filters\.onSale\}\} accessibilityLabel="Show only deals"/,'Marketplace deals tab')],
[2604,'Marketplace rating filter exposes tab semantics',ms('src/MarketplaceStorefront.tsx',/accessibilityRole="tab" accessibilityState=\{\{selected:filters\.minRating===4\}\} accessibilityLabel="Show only 4 stars and up"/,'Marketplace rating tab')],
[2605,'Marketplace payment history filters expose tab semantics',ms('src/MarketplaceScreen.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Filter payment history by \$\{f\.label\}`} accessibilityState=\{\{selected:historyFilter===f\.id\}\}/,'Marketplace history tabs')],
[2606,'Sky Wallet destination controls expose tab semantics',ms('src/Wallet.tsx',/accessibilityRole="tab" accessibilityLabel=\{label\} accessibilityState=\{\{selected:view===id\}\}/,'Wallet destination tabs')],
[2607,'Yaayz ticket search respects loading state',ms('src/YaayzScreen.tsx',/accessibilityLabel="Search Yaayz tickets" accessibilityState=\{\{disabled:loading\}\} disabled=\{loading\}/,'Yaayz search busy state')],
[2608,'Yaayz ticket filters expose tab semantics',ms('src/YaayzScreen.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Filter Yaayz tickets by \$\{x\}`} accessibilityState=\{\{selected:type===x\}\}/,'Yaayz ticket tabs')],
[2609,'Yaayz discovery sorting exposes tab semantics',ms('src/YaayzHomeFeed.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Sort Yaayz by \$\{x\}`\}/,'Yaayz sort tabs')],
[2610,'Yaayz categories expose tab semantics',ms('src/YaayzHomeFeed.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Show Yaayz \$\{c\} category`\} accessibilityState=\{\{selected:category===c\}\} onPress=\{\(\)=>setCategory\(c\)\}/,'Yaayz category tabs')],
[2611,'Yaayz feed modes expose tab semantics',ms('src/YaayzHomeFeed.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Show Yaayz \$\{m\} feed`\} accessibilityState=\{\{selected:feedMode===m\}\}/,'Yaayz feed mode tabs')],
[2612,'Yaayz ad retry is an accessible button',ms('src/YaayzNativeAd.tsx',/accessibilityRole="button" accessibilityLabel="Retry Yaayz sponsored ad" onPress=\{retry\}/,'Yaayz ad retry')],
[2613,'New-group cancel is an accessible button',ms('src/GroupsTab.tsx',/accessibilityLabel="Cancel creating group" onPress=\{\(\)\s*=>\s*g\.setView\("list"\)\}/,'New group cancel')],
[2614,'Join-group cancel is an accessible button',ms('src/GroupsTab.tsx',/accessibilityLabel="Cancel joining group" onPress=\{\(\)\s*=>\s*g\.setView\("list"\)\}/,'Join group cancel')],
[2615,'Group detail back control is an accessible button',ms('src/GroupScreen.tsx',/accessibilityLabel="Back to Groups" onPress=\{g\.backToList\}/,'Group back')],
[2616,'Admin denial back control is an accessible button',ms('src/app/marketplace/disputes.tsx',/accessibilityLabel="Back from administrator access check" onPress=\{\(\)\s*=>\s*nexaGoBack\(\)\}/,'Admin denial back')],
[2617,'Zeeza message send has one canonical disabled state',ms('src/ZeezaThreadScreen.tsx',/disabled=\{!input\.trim\(\) \|\| zeeza\.sendingMessage\} onPress=\{send\}/,'Zeeza send state')],
[2618,'credential-backed Staff account creation remains represented',ms('src/StaffScreen.tsx',/apiStaffCreateAccount/,'Staff account creation')],
[2619,'Extension audit respects extension busy state',ms('src/ExtensionsScreen.tsx',/accessibilityLabel=\{expanded===ext\.id\?"Hide extension audit":"View extension audit"\} accessibilityState=\{\{expanded:expanded===ext\.id,disabled:!!busy\}\} disabled=\{!!busy\}/,'Extension audit state')],
[2620,'Fitness registration exposes busy-disabled state',ms('src/app/leisure/fitness/index.tsx',/accessibilityLabel=\{registering\?"Registering gym":"Register gym"\} accessibilityState=\{\{disabled:registering\}\} disabled=\{registering\}/,'Fitness registration state')],
[2621,'Ball House league filters expose tab semantics',ms('src/app/leisure/ball-house/index.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Filter Ball House by league \$\{label\}`\}/,'Ball House league tabs')],
[2622,'Ball House state filters expose tab semantics',ms('src/app/leisure/ball-house/index.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Filter Ball House by state \$\{label\}`\}/,'Ball House state tabs')],
[2623,'Yaayz discovery stories expose tab semantics',ms('src/YaayzHomeFeed.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Discovery story \$\{label\}`\}/,'Yaayz discovery stories')],
[2624,'Marketplace checkout quantity controls expose button semantics',ms('src/MarketplaceScreen.tsx',/accessibilityRole="button" accessibilityLabel=\{`Decrease \$\{i\.product\.name\} quantity`\}[\s\S]*?accessibilityRole="button" accessibilityLabel=\{`Increase \$\{i\.product\.name\} quantity`\}/,'Marketplace quantity buttons')],
];
for(const [n,title,fn] of tests)test(`B189 M${n}: ${title}`,fn);
test('B189 contract is exactly 25 milestones',()=>assert.equal(tests.length,25));
test("B189 historical release evidence remains preserved",()=>{const r=read("B189_REPORT.md");assert.ok(r.includes("V5.98.41") && r.includes("B189"));});
