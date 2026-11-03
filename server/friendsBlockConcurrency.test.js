const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'friends.js'), 'utf8');

test('blocking atomically severs friendship, cancels pending requests, and creates the block', () => {
  const start = source.indexOf('app.post("/api/social/block/:userId"');
  const end = source.indexOf('app.delete("/api/social/block/:userId"', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  const tx = block.indexOf('db.transaction(() => {');
  const friendship = block.indexOf('DELETE FROM friendships', tx);
  const requests = block.indexOf("UPDATE friend_requests SET status = 'cancelled'", tx);
  const insert = block.indexOf('INSERT OR IGNORE INTO blocks', tx);
  assert.ok(tx >= 0 && friendship > tx && requests > friendship && insert > requests);
});

test('block endpoint no longer separates friendship/request cleanup from block creation', () => {
  const start = source.indexOf('app.post("/api/social/block/:userId"');
  const end = source.indexOf('app.delete("/api/social/block/:userId"', start);
  const block = source.slice(start, end);
  assert.equal(block.includes('severFriendship(req.user.id, req.params.userId);'), false);
  assert.match(block, /db\.transaction\(\(\) => \{/);
});
