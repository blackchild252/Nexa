const test = require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B39 active version is V5.8.0', () => {
  assert.ok(atLeast(require(path.join(root, 'package.json')).version,'5.8.0'),'version must be at least 5.8.0');
  assert.ok(atLeast(require(path.join(root, 'server/package.json')).version,'5.8.0'),'version must be at least 5.8.0');
  assert.ok(atLeast(require(path.join(root, 'app.json')).expo.version,'5.8.0'),'version must be at least 5.8.0');
});

test('Money Group detail and refresh requests reject stale responses', () => {
  const s = read('src/useGroups.ts');
  assert.match(s, /detailRequest/);
  assert.match(s, /requestId === detailRequest\.current/);
});

test('Vendor identity and staff list reject stale responses', () => {
  const s = read('src/useStaff.ts');
  assert.match(s, /myShopRequest/);
  assert.match(s, /staffRequest/);
  assert.match(s, /requestId === myShopRequest\.current/);
  assert.match(s, /requestId === staffRequest\.current/);
});

test('Blocked-user list rejects stale responses', () => {
  const s = read('src/useFriends.ts');
  assert.match(s, /blockedRequest/);
  assert.match(s, /requestId === blockedRequest\.current/);
});

test('Zeeza room members reject stale responses for a previous room', () => {
  const s = read('src/useZeeza.ts');
  assert.match(s, /roomMembersRequest/);
  assert.match(s, /activeRoomId === roomId/);
});

test('Marketplace fee preview rejects stale cart responses', () => {
  const s = read('src/useMarketplace.ts');
  assert.match(s, /feeRequest/);
  assert.match(s, /requestId!==feeRequest\.current/);
});

test('Vendor dashboard composite refresh rejects stale responses', () => {
  const s = read('src/useMarketplace.ts');
  assert.match(s, /const loadRequest=useRef\(0\)/);
  assert.match(s, /requestId===loadRequest\.current/);
});

test('Extensions list and audit refreshes reject stale responses', () => {
  const s = read('src/ExtensionsScreen.tsx');
  assert.match(s, /loadRequest/);
  assert.match(s, /auditRequests/);
  assert.match(s, /requestId===loadRequest\.current/);
});

test('Subscription refresh rejects stale responses', () => {
  const s = read('src/Subscription.tsx');
  assert.match(s, /loadRequest/);
  assert.match(s, /requestId!==loadRequest\.current/);
});

test('B39 keeps V5-only release line', () => {
  const roadmap = read('MASTER_ROADMAP.md');
  assert.match(roadmap, /## V5\.3\.0 — Batch B39/);
  assert.doesNotMatch(roadmap, /## V4\.100\.0/);
});
