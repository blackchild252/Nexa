const test=require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert=require('node:assert/strict');
const fs=require('fs');const path=require('path');const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');

test('B41 active version is V5.8.0',()=>{assert.ok(atLeast(require(path.join(root,'package.json')).version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(require(path.join(root,'server/package.json')).version,'5.8.0'),'version must be at least 5.8.0');const app=require(path.join(root,'app.json')).expo;assert.ok(atLeast(app.version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(app.android.version,'5.8.0'),'version must be at least 5.8.0');assert.ok(atLeast(app.ios.version,'5.8.0'),'version must be at least 5.8.0');});
test('Sky Money overview rejects stale responses',()=>{const s=read('src/MoneyDashboard.tsx');assert.match(s,/loadRequest/);assert.match(s,/requestId !== loadRequest\.current/);assert.match(s,/requestId === loadRequest\.current/);});
test('Dami action history rejects stale responses',()=>{const s=read('src/NexaAI.tsx');assert.match(s,/actionHistoryRequest/);assert.match(s,/requestId!==actionHistoryRequest\.current/);});
test('Dami workflow list rejects stale responses',()=>{const s=read('src/NexaAI.tsx');assert.match(s,/workflowRequest/);assert.match(s,/requestId!==workflowRequest\.current/);});
test('Dami workflow history rejects stale responses per workflow',()=>{const s=read('src/NexaAI.tsx');assert.match(s,/workflowHistoryRequests/);assert.match(s,/workflowHistoryRequests\.current\[id\]!==requestId/);});
test('Notification Center rejects stale filter responses',()=>{const s=read('src/NotificationCenter.tsx');assert.match(s,/loadRequest/);assert.match(s,/requestId!==loadRequest\.current/);assert.match(s,/requestId===loadRequest\.current/);});
test('Home command rails reject stale interval/manual responses',()=>{const s=read('src/HomeCommandCenter.tsx');assert.match(s,/railsRequest/);assert.match(s,/requestId===railsRequest\.current/);});
test('Unified Search rejects stale query/filter responses',()=>{const s=read('src/UnifiedSearch.tsx');assert.match(s,/searchRequest/);assert.match(s,/requestId!==searchRequest\.current/);});
test('Ball House football/ticket refresh rejects stale responses',()=>{const s=read('src/app/leisure/ball-house/index.tsx');assert.match(s,/loadRequest/);assert.match(s,/requestId!==loadRequest\.current/);assert.match(s,/requestId===loadRequest\.current/);});
test('Chase discovery rejects stale responses',()=>{const s=read('src/ZeezaChase.tsx');assert.match(s,/loadRequest/);assert.match(s,/requestId!==loadRequest\.current/);assert.match(s,/requestId===loadRequest\.current/);});
test('Profile session refresh rejects stale responses',()=>{const s=read('src/app/(tabs)/profile.tsx');assert.match(s,/loadRequest/);assert.match(s,/requestId!==loadRequest\.current/);});
test('B41 keeps V5-only release line',()=>{const roadmap=read('MASTER_ROADMAP.md');assert.match(roadmap,/## V5\.7\.1 — B43.1/);assert.match(roadmap,/## V5\.8\.0 — Batch B44/);assert.ok(atLeast(currentVersionMd(read('VERSION.md')),'5.8.0'));});
