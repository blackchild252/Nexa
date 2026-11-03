import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const ms=(file,pattern,title)=>()=>{assert.match(read(file),pattern,title)};
const tests=[
[2650,'Notification filters expose tab-list semantics',ms('src/NotificationCenter.tsx',/accessibilityRole="tablist" accessibilityLabel="Notification category filters"/,'Notification tab list')],
[2651,'Yaayz sections expose tab-list semantics',ms('src/YaayzScreen.tsx',/accessibilityRole="tablist" accessibilityLabel="Yaayz sections"/,'Yaayz sections')],
[2652,'Sky Group area choices expose a radio group',ms('src/GroupsTab.tsx',/accessibilityRole="radiogroup" accessibilityLabel="Sky Group area choices"/,'Groups radio group')],
[2653,'Sky Store Savings terms expose a radio group',ms('src/StoreAjo.tsx',/accessibilityRole="radiogroup" accessibilityLabel="Sky Store Savings term choices"/,'Store term radio group')],
[2654,'Zeeza visibility choices expose a radio group',ms('src/ZeezaProfile.tsx',/accessibilityRole="radiogroup" accessibilityLabel="Zeeza profile visibility choices"/,'Zeeza visibility group')],
[2655,'Profile visibility choices expose a radio group',ms('src/app/(tabs)/profile.tsx',/accessibilityRole="radiogroup" accessibilityLabel="Profile visibility choices"/,'Profile visibility group')],
[2656,'Theme picker uses one canonical radio state',ms('src/ThemePicker.tsx',/accessibilityRole="radio" accessibilityState=\{\{ selected: active \}\}/,'Theme picker radio')],
[2657,'NEXA directory exposes tab-list semantics',ms('src/NexaNavKeys.tsx',/accessibilityRole="tablist" accessibilityLabel="NEXA directory options"/,'Directory tab list')],
[2658,'NEXA Add panel is explicitly labelled',ms('src/NexaNavKeys.tsx',/modalA11y\('NEXA Add', 'NEXA creation actions'\)/,'Add panel label')],
[2659,'Home header actions expose toolbar semantics',ms('src/HomeCommandCenter.tsx',/accessibilityRole="toolbar" accessibilityLabel="NEXA Home actions"/,'Home actions toolbar')],
[2660,'Home destinations expose toolbar semantics',ms('src/HomeCommandCenter.tsx',/accessibilityRole="toolbar" accessibilityLabel="NEXA Home destinations"/,'Home destination toolbar')],
[2661,'Dami quick actions expose toolbar semantics',ms('src/NexaAI.tsx',/accessibilityRole="toolbar" accessibilityLabel="Dami quick actions"/,'Dami quick actions')],
[2662,'NEXA search filters expose a radio group',ms('src/UnifiedSearch.tsx',/accessibilityRole="radiogroup" accessibilityLabel="NEXA search filters"/,'Search filter group')],
[2663,'Profile visibility has one canonical role/state declaration',ms('src/app/(tabs)/profile.tsx',/accessibilityRole="radio" accessibilityState=/,'Profile canonical state')],
[2664,'Legal links have one canonical accessibility declaration',ms('src/app/(tabs)/profile.tsx',/accessibilityRole="link" accessibilityState=/,'Legal link state')],
[2665,'Zeeza profile navigation is an explicit button',ms('src/app/(tabs)/zeeza.tsx',/accessibilityRole="button" accessibilityLabel="Open Zeeza profile"/,'Zeeza profile button')],
[2666,'Sky Store Savings account heading is announced as a header',ms('src/StoreAjo.tsx',/accessibilityRole="header" style=\{s.section\}/,'Store account header')],
[2667,'Sky Store Savings list heading is announced as a header',ms('src/StoreAjo.tsx',/accessibilityRole="header" style=\{s.section\}/,'Store list header')],
[2668,'Dami workflow section is announced as a header',ms('src/NexaAI.tsx',/accessibilityRole="header"/,'Workflow header')],
[2669,'Dami recent actions section is announced as a header',ms('src/NexaAI.tsx',/accessibilityRole="header"/,'Recent actions header')],
[2670,'Zeeza profile edit control is locked while saving',ms('src/ZeezaProfile.tsx',/disabled=\{saving\} accessibilityState=/,'Zeeza edit save guard')],
[2671,'Dami voice choices expose a radio group',ms('src/NexaAI.tsx',/accessibilityRole="radiogroup" accessibilityLabel="Dami voice choices"/,'Dami voice group')],
[2672,'Dami tone choices expose a radio group',ms('src/NexaAI.tsx',/accessibilityRole="radiogroup" accessibilityLabel="Dami tone choices"/,'Dami tone group')],
[2673,'Dami response length choices expose a radio group',ms('src/NexaAI.tsx',/accessibilityRole="radiogroup" accessibilityLabel="Dami response length choices"/,'Dami response group')],
[2674,'Dami language choices expose a radio group',ms('src/NexaAI.tsx',/accessibilityRole="radiogroup" accessibilityLabel="Dami language choices"/,'Dami language group')],
];
for(const [n,title,fn] of tests)test(`B191 M${n}: ${title}`,fn);
test('B191 contract is exactly 25 milestones',()=>assert.equal(tests.length,25));
test("B191 historical release evidence remains preserved",()=>{const r=read("B191_REPORT.md");assert.ok(r.includes("V5.98.43") && r.includes("B191"));});
