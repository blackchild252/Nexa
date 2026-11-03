const test = require('node:test');
const {atLeast,currentVersionMd}=require('./versionAtLeast');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('B38 active version is V5.8.0 and no V4.100.0 metadata is active', () => {
  assert.ok(atLeast(require(path.join(root, 'package.json')).version,'5.8.0'),'version must be at least 5.8.0');
  assert.ok(atLeast(require(path.join(root, 'server/package.json')).version,'5.8.0'),'version must be at least 5.8.0');
  assert.ok(atLeast(require(path.join(root, 'app.json')).expo.version,'5.8.0'),'version must be at least 5.8.0');
  assert.doesNotMatch(read('MASTER_ROADMAP.md').split('## V5.8.0')[0], /## V4\.100\.0/);
});

test('Marketplace notification target is promoted to the first matching order', () => {
  const s = read('src/MarketplaceScreen.tsx');
  assert.match(s, /targetOrderId/);
  assert.match(s, /slice\(\)\.sort\(.*targetOrderId/);
  assert.match(s, /Opened from notification/);
});

test('Marketplace reports when a requested order is missing', () => {
  assert.match(read('src/MarketplaceScreen.tsx'), /requested, but it is not in the current order list/);
});

test('Yaayz notification target is promoted to the first matching order', () => {
  const s = read('src/YaayzScreen.tsx');
  assert.match(s, /requestedTicketOrderId/);
  assert.match(s, /slice\(\)\.sort\(.*requestedTicketOrderId/);
  assert.match(s, /Opened from notification/);
});

test('Yaayz reports when a requested order is missing', () => {
  assert.match(read('src/YaayzScreen.tsx'), /not in the current order list/);
});

test('Zeeza thread list ignores stale responses', () => {
  const s = read('src/useZeeza.ts');
  assert.match(s, /threadsRequest/);
  assert.match(s, /requestId === threadsRequest\.current/);
});

test('Zeeza DM messages ignore stale responses', () => {
  const s = read('src/useZeeza.ts');
  assert.match(s, /messagesRequest/);
  assert.match(s, /requestId !== messagesRequest\.current/);
});

test('Zeeza room list ignores stale responses', () => {
  const s = read('src/useZeeza.ts');
  assert.match(s, /roomsRequest/);
  assert.match(s, /requestId === roomsRequest\.current/);
});

test('Zeeza room messages ignore stale responses', () => {
  const s = read('src/useZeeza.ts');
  assert.match(s, /roomMessagesRequest/);
  assert.match(s, /requestId !== roomMessagesRequest\.current/);
});

test('Friends requests and friends list ignore stale responses', () => {
  const s = read('src/useFriends.ts');
  assert.match(s, /requestsRequest/);
  assert.match(s, /friendsRequest/);
  assert.match(s, /requestId === requestsRequest\.current/);
  assert.match(s, /requestId === friendsRequest\.current/);
});

test('Marketplace and Yaayz refreshes ignore stale responses', () => {
  assert.match(read('src/useMarketplace.ts'), /loadRequest/);
  assert.match(read('src/useMarketplace.ts'), /requestId!==loadRequest\.current/);
  assert.match(read('src/YaayzScreen.tsx'), /loadRequest/);
  assert.match(read('src/YaayzScreen.tsx'), /requestId===loadRequest\.current/);
});

test('B38 keeps canonical notification routing contract intact', () => {
  const s = read('src/nexaNavigation.ts');
  assert.match(s, /case 'mall_orders'/);
  assert.match(s, /case 'ticket'/);
  assert.match(s, /case 'dm_thread'/);
  assert.match(s, /case 'chat_room'/);
});
