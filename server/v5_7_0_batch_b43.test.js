const test=require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert=require('node:assert/strict');
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('B43 active version is V5.8.0',()=>{assert.ok(atLeast(require(path.join(root,'package.json')).version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(require(path.join(root,'server/package.json')).version,'5.8.0'),'version must be at least 5.8.0');const app=require(path.join(root,'app.json'));assert.ok(atLeast(app.expo.version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(app.expo.android.version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(app.expo.ios.version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(app.expo.ios.version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(app.expo.version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(app.version,'5.8.0'),'version must be at least 5.8.0');});
test('Leisure Arena discovery rejects stale responses',()=>{const s=read('src/LeisureArenaScreen.tsx');assert.match(s,/requestRef/);assert.match(s,/requestId===requestRef\.current/);});
test('Kitchen referral validation rejects stale code responses',()=>{const s=read('src/app/leisure/kitchen/ref/[code].tsx');assert.match(s,/requestRef/);assert.match(s,/requestId===requestRef\.current/);});
test('Fitness gym search rejects stale city results',()=>{const s=read('src/app/leisure/fitness/index.tsx');assert.match(s,/gymSearchRequest/);assert.match(s,/requestId!==gymSearchRequest\.current/);});
test('Marketplace payment history rejects stale refreshes',()=>{const s=read('src/MarketplaceScreen.tsx');assert.match(s,/historyRequest/);assert.match(s,/requestId===historyRequest\.current/);});
test('Zeeza profile rejects stale reads',()=>{const s=read('src/ZeezaProfile.tsx');assert.match(s,/loadRequest/);assert.match(s,/requestId !== loadRequest\.current/);});
test('Room active-call polling rejects stale responses',()=>{const s=read('src/RoomScreen.tsx');assert.match(s,/callRequest/);assert.match(s,/requestId === callRequest\.current/);});
test('Auth restore rejects stale session state',()=>{const s=read('src/auth.tsx');assert.match(s,/restoreRequest/);assert.match(s,/requestId!==restoreRequest\.current/);});
test('One-to-one call polling rejects stale responses',()=>{const s=read('src/CallScreen.tsx');assert.match(s,/pollRequest/);assert.match(s,/requestId!==pollRequest\.current/);});
test('Group call polling rejects stale responses',()=>{const s=read('src/GroupCallScreen.tsx');assert.match(s,/pollRequest/);assert.match(s,/requestId!==pollRequest\.current/);});
test('Dami preference initialization rejects stale reads',()=>{const s=read('src/NexaAI.tsx');assert.match(s,/preferencesRequest/);assert.match(s,/requestId!==preferencesRequest\.current/);});
test('B43 is V5-only',()=>{const roadmap=read('MASTER_ROADMAP.md');assert.match(roadmap,/## V5\.7\.0 — Batch B43/);assert.match(roadmap,/## V5\.7\.1 — B43.1/);assert.match(roadmap,/## V5\.8\.0 — Batch B44/);assert.ok(atLeast(currentVersionMd(read('VERSION.md')),'5.8.0'));});
