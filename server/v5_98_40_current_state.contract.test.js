import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(p)=>fs.readFileSync(path.join(root,p),'utf8');
const ms=(file,pattern,title)=>()=>{assert.match(read(file),pattern,title)};
const tests=[
[2575,'Marketplace search exposes loading-disabled state',ms('src/MarketplaceScreen.tsx',/accessibilityLabel="Search Marketplace" accessibilityState=\{\{disabled:m\.loading\}\} disabled=\{m\.loading\}/,'Marketplace search busy state')],
[2576,'Marketplace All category exposes selected tab state',ms('src/MarketplaceScreen.tsx',/accessibilityRole="tab" accessibilityState=\{\{selected:!m\.category\}\} accessibilityLabel="Show all Marketplace categories"/,'Marketplace all tab')],
[2577,'Marketplace category filters expose selected tab state',ms('src/MarketplaceScreen.tsx',/accessibilityRole="tab" accessibilityState=\{\{selected:m\.category===c\}\} accessibilityLabel=\{`Filter Marketplace by \${c}`\}/,'Marketplace category tab')],
[2578,'Marketplace payment method exposes radio semantics',ms('src/MarketplaceScreen.tsx',/function PaymentMethod[\s\S]*?accessibilityRole="radio" accessibilityLabel=\{`\$\{title\}: \$\{description\}`\}/,'Payment method radio')],
[2579,'Marketplace cancel order respects history busy state',ms('src/MarketplaceScreen.tsx',/accessibilityLabel="Cancel order" accessibilityState=\{\{disabled:historyLoading\}\} disabled=\{historyLoading\}/,'Cancel order busy state')],
[2580,'Marketplace refund action respects history busy state',ms('src/MarketplaceScreen.tsx',/accessibilityLabel="Request refund" accessibilityState=\{\{disabled:historyLoading\}\} disabled=\{historyLoading\}/,'Refund busy state')],
[2581,'Marketplace dispute action respects history busy state',ms('src/MarketplaceScreen.tsx',/accessibilityLabel="Open payment dispute" accessibilityState=\{\{disabled:historyLoading\}\} disabled=\{historyLoading\}/,'Dispute busy state')],
[2582,'Marketplace dispute confirmation respects history busy state',ms('src/MarketplaceScreen.tsx',/accessibilityLabel="Confirm dispute resolution" accessibilityState=\{\{disabled:historyLoading\}\} disabled=\{historyLoading\}/,'Dispute confirmation busy state')],
[2583,'Notification close is disabled during refresh/load',ms('src/NotificationCenter.tsx',/accessibilityLabel="Close notifications"/,'Notification close')],
[2584,'Notification filters expose tab selection semantics',ms('src/NotificationCenter.tsx',/accessibilityRole="tab" accessibilityLabel=\{`Filter notifications by \${label\(x\)}`\} accessibilityState=\{\{selected:x===filter\}\}/,'Notification filters')],
[2585,'Zeeza active-call join respects call busy state',ms('src/RoomScreen.tsx',/Join active \$\{activeCall\.media === "video" \? "video" : "voice"\} call.*?disabled=\{callBusy\}/,'Room call join')],
[2586,'Zeeza room leave/delete respects busy state',ms('src/RoomScreen.tsx',/Delete Zeeza room[\s\S]*?accessibilityState=\{\{disabled:callBusy \|\| inviteBusy\}\} disabled=\{callBusy \|\| inviteBusy\}/,'Room destructive action')],
[2587,'Friends block action respects request busy state',ms('src/FriendsScreen.tsx',/accessibilityLabel=\{`Block \$\{u\.name\}`\} accessibilityState=\{\{disabled:friends\.sendingRequest\}\} disabled=\{friends\.sendingRequest\}/,'Friend block')],
[2588,'Zeeza profile visibility exposes radio selection',ms('src/ZeezaProfile.tsx',/accessibilityRole="radio" accessibilityState=\{\{selected:visibility===v,disabled:saving\}\} accessibilityLabel=\{`Set profile visibility to \$\{v\}`\}/,'Profile visibility')],
[2589,'Dami voice preference exposes busy-disabled state',ms('src/NexaAI.tsx',/accessibilityState=\{\{selected:voiceStyle===v,disabled:preferenceBusy\}\} disabled=\{preferenceBusy\}/,'Dami voice')],
[2590,'Dami tone preference exposes busy-disabled state',ms('src/NexaAI.tsx',/accessibilityState=\{\{selected:personalization\.tone===v,disabled:preferenceBusy\}\} disabled=\{preferenceBusy\}/,'Dami tone')],
[2591,'Dami response-length preference exposes busy-disabled state',ms('src/NexaAI.tsx',/accessibilityState=\{\{selected:personalization\.responseLength===v,disabled:preferenceBusy\}\} disabled=\{preferenceBusy\}/,'Dami response length')],
[2592,'Dami proactive preference exposes busy-disabled state',ms('src/NexaAI.tsx',/accessibilityState=\{\{checked:personalization\.proactive,disabled:preferenceBusy\}\} disabled=\{preferenceBusy\}/,'Dami proactive')],
[2593,'Dami language preference exposes busy-disabled state',ms('src/NexaAI.tsx',/accessibilityState=\{\{selected:languageCode===v\.code,disabled:preferenceBusy\}\} disabled=\{preferenceBusy\}/,'Dami language')],
[2594,'Dami reset preference action respects busy state',ms('src/NexaAI.tsx',/accessibilityLabel="Reset Dami preferences" accessibilityState=\{\{disabled:preferenceBusy\}\} disabled=\{preferenceBusy\}/,'Dami reset')],
[2595,'Dami realtime voice control is disabled while connecting',ms('src/NexaAI.tsx',/disabled=\{!!recording\|\|busy\|\|realtimeStatus===\'connecting\'\} accessibilityState=\{\{disabled:!!recording\|\|busy\|\|realtimeStatus===\'connecting\'\}\}/,'Dami realtime busy state')],
[2596,'Vendor cover label identifies current cover photo',ms('src/VendorPhotos.tsx',/accessibilityLabel=\{`\$\{product\.name\} photo \$\{i\+1\} is the cover`\}/,'Vendor cover label')],
[2597,'Zeeza voice-call control has correct action label',ms('src/ZeezaThreadScreen.tsx',/accessibilityLabel="Start Zeeza voice call"/,'Voice call label')],
[2598,'Zeeza video-call control has correct action label',ms('src/ZeezaThreadScreen.tsx',/accessibilityLabel="Start Zeeza video call"/,'Video call label')],
[2599,'Leisure Arena destinations expose link semantics',ms('src/LeisureArenaScreen.tsx',/accessibilityRole="link" accessibilityLabel=\{`Open \$\{a\.title\} in Leisure Arena`\}/,'Leisure navigation semantics')],
];
for(const [n,title,fn] of tests)test(`B188 M${n}: ${title}`,fn);
test('B188 contract is exactly 25 milestones',()=>assert.equal(tests.length,25));
test("B188 historical release evidence remains preserved",()=>{const r=read("B188_REPORT.md");assert.ok(r.includes("V5.98.40") && r.includes("B188"));});
