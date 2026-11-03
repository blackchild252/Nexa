import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const ms=(file,pattern,title)=>()=>{assert.match(read(file),pattern,title)};
const tests=[
[2625,'Yaayz ticket payment verification is disabled while loading',ms('src/YaayzScreen.tsx',/accessibilityLabel=\{`Verify Yaayz ticket payment \$\{o\.paymentRef \|\| o\.id\}`\} accessibilityState=\{\{disabled:loading\}\} disabled=\{loading\}/,'Yaayz verify guard')],
[2626,'Yaayz return destination is an accessible link',ms('src/YaayzScreen.tsx',/accessibilityRole="link" accessibilityLabel=\{`Return to \$\{requestedReturn\.includes\('ball-house'\)\?'Ball House':requestedReturn\.includes\('game-house'\)\?'Game House':'L\.A\.'\}`\}/,'Yaayz return link')],
[2627,'Zeeza profile back control has button semantics',ms('src/ZeezaProfile.tsx',/accessibilityRole="button" onPress=\{onBack\} style=\{local\.back\} accessibilityLabel="Back to Zeeza"/,'Zeeza back')],
[2628,'Zeeza avatar picker has button semantics',ms('src/ZeezaProfile.tsx',/accessibilityRole="button" disabled=\{avatarBusy\} accessibilityState=\{\{disabled:avatarBusy\}\}/,'Avatar picker role')],
[2629,'Zeeza avatar picker announces busy state',ms('src/ZeezaProfile.tsx',/accessibilityLabel=\{avatarBusy\?"Updating Zeeza profile picture":"Choose Zeeza profile picture"\}/,'Avatar picker label')],
[2630,'Zeeza visibility radios are disabled while saving',ms('src/ZeezaProfile.tsx',/accessibilityRole="radio" accessibilityState=\{\{selected:visibility===v,disabled:saving\}\} accessibilityLabel=\{`Set profile visibility to \$\{v\}`\} disabled=\{saving\} onPress=/,'Zeeza visibility guard')],
[2631,'Zeeza Chase switch is disabled while saving',ms('src/ZeezaProfile.tsx',/disabled=\{saving\} onPress=\{\(\) => setChaseOptIn/,'Chase save guard')],
[2632,'Zeeza share control has button semantics',ms('src/ZeezaProfile.tsx',/accessibilityRole="button" onPress=\{shareProfile\} style=\{local\.shareButton\}/,'Zeeza share role')],
[2633,'Admin dispute resolution has a per-dispute busy guard',ms('src/AdminDisputesScreen.tsx',/accessibilityState=\{\{disabled:!!resolving\[d\.id\]\}\} disabled=\{!!resolving\[d\.id\]\}/,'Admin resolve busy')],
[2634,'Admin dispute resolution announces resolving state',ms('src/AdminDisputesScreen.tsx',/formSubmitA11y\(resolving\[d\.id\]\?"Resolving dispute":"Resolve dispute"\)/,'Admin resolve label')],
[2635,'Notification mark-all uses a dedicated busy state',ms('src/NotificationCenter.tsx',/accessibilityLabel=\{markingAll\?"Marking all notifications as read":"Mark all notifications as read"\} accessibilityState=\{\{disabled:savingPrefs\|\|markingAll\}\} disabled=\{savingPrefs\|\|markingAll\}/,'Notification mark-all')],
[2636,'Notification item is disabled while it is being opened',ms('src/NotificationCenter.tsx',/disabled=\{readingId===n\.id\} accessibilityState=\{\{disabled:readingId===n\.id\}\}/,'Notification item busy')],
[2637,'Notification reader exposes dedicated reading state',ms('src/NotificationCenter.tsx',/const \[readingId,setReadingId\]=useState<string\|null>\(null\);/,'Notification reader state')],
[2638,'Yaayz categories have explicit accessible labels',ms('src/YaayzHomeFeed.tsx',/accessibilityLabel=\{`Show Yaayz \$\{c\} category`\}/,'Yaayz category labels')],
[2639,'Yaayz feed modes have explicit accessible labels',ms('src/YaayzHomeFeed.tsx',/accessibilityLabel=\{`Show Yaayz \$\{m\} feed`\}/,'Yaayz feed labels')],
[2640,'Yaayz interested action uses switch semantics',ms('src/YaayzHomeFeed.tsx',/accessibilityRole="switch" accessibilityLabel=\{`\$\{interestFor\(String\(t\.id\),interested\)\?/,'Yaayz interest switch')],
[2641,'Yaayz save action uses switch semantics',ms('src/YaayzHomeFeed.tsx',/accessibilityRole="switch" accessibilityLabel=\{`\$\{saved\[String\(t\.id\)\]\?/,'Yaayz save switch')],
[2642,'Yaayz saved-ticket action exposes checked state',ms('src/YaayzHomeFeed.tsx',/accessibilityRole="switch" accessibilityLabel=\{isSaved\?'Remove saved ticket':'Save ticket'\} accessibilityState=\{\{checked:isSaved\}\}/,'Yaayz saved state')],
[2643,'Profile visibility controls have one canonical accessibility state',ms('src/app/(tabs)/profile.tsx',/accessibilityRole="radio" accessibilityState=\{\{selected:privacy\.visibility===v,disabled:privacyBusy\}\} accessibilityLabel=\{`Set profile visibility to \$\{v\}`\} key=\{v\} disabled=\{privacyBusy\} onPress=\{\(\)=>savePrivacy/,'Profile visibility state')],
[2644,'Glossy orb exposes configurable button/link role',ms('src/NexaGlossyOrb.tsx',/accessibilityRole\?: 'button' \| 'link';/,'Glossy orb role API')],
[2645,'Dami orb remains explicitly labelled for assistive technology',ms('src/HomeCommandCenter.tsx',/NexaGlossyOrb size=\{78\} tone="glass" pulse style=\{styles\.damiButton\} onPress=\{onOpen\} accessibilityLabel="Talk to Dami"/,'Dami orb label')],
[2646,'NEXA directory destinations use tab semantics for active selection',ms('src/NexaNavKeys.tsx',/accessibilityRole="tab" accessibilityLabel=\{[^}]+\} accessibilityState=\{\{ selected: active \}\}/,'Directory tab semantics')],
[2647,'NEXA directory backdrop dismiss control is explicitly a button',ms('src/NexaNavKeys.tsx',/st\.dismiss[^\n]*accessibilityRole="button" accessibilityLabel="Close NEXA directory"/,'Directory dismiss')],
[2648,'NEXA Add backdrop dismiss control is explicitly a button',ms('src/NexaNavKeys.tsx',/st\.addDismiss[^\n]*accessibilityRole="button" accessibilityLabel="Close Add menu"/,'Add dismiss')],
[2649,'Admin resolution input becomes non-editable while resolving',ms('src/AdminDisputesScreen.tsx',/editable=\{!resolving\[d\.id\]\} accessibilityState=\{\{disabled:!!resolving\[d\.id\]\}\}/,'Admin resolution input guard')],
];
for(const [n,title,fn] of tests)test(`B190 M${n}: ${title}`,fn);
test('B190 contract is exactly 25 milestones',()=>assert.equal(tests.length,25));
test("B190 historical release evidence remains preserved",()=>{const r=read("B190_REPORT.md");assert.ok(r.includes("V5.98.42") && r.includes("B190"));});
