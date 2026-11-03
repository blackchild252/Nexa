const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'friends.js'), 'utf8');

test('friend request creation re-reads block/friendship/request state inside the write transaction', () => {
  const start = source.indexOf('app.post("/api/social/friends/request"');
  const end = source.indexOf('// Everything I need to render a requests inbox', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  const tx = block.indexOf('outcome = db.transaction(() => {');
  const blocked = block.indexOf('const reverse = db.prepare', tx);
  const insert = block.indexOf('INSERT OR IGNORE INTO friend_requests', tx);
  assert.ok(tx >= 0 && blocked > tx && insert > blocked);
});

test('friend request creation converts duplicate pending inserts into a controlled conflict', () => {
  const start = source.indexOf('app.post("/api/social/friends/request"');
  const end = source.indexOf('// Everything I need to render a requests inbox', start);
  const block = source.slice(start, end);
  assert.match(block, /INSERT OR IGNORE INTO friend_requests/);
  assert.match(block, /if \(!inserted\.changes\) throw new FriendsError\(409/);
});

test('friend request acceptance re-reads pending state and blocks inside the transaction', () => {
  const start = source.indexOf('app.post("/api/social/friends/requests/:id/accept"');
  const end = source.indexOf('app.post("/api/social/friends/requests/:id/decline"', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  const tx = block.indexOf('const tx = db.transaction(() => {');
  const read = block.indexOf('SELECT * FROM friend_requests', tx);
  const blocked = block.indexOf('isBlocked(req.user.id, r.fromUserId)', tx);
  const update = block.indexOf("status = 'accepted'", tx);
  assert.ok(tx >= 0 && read > tx && blocked > read && update > blocked);
});

test('friend request acceptance uses expected pending state and idempotent friendship inserts', () => {
  const start = source.indexOf('app.post("/api/social/friends/requests/:id/accept"');
  const end = source.indexOf('app.post("/api/social/friends/requests/:id/decline"', start);
  const block = source.slice(start, end);
  assert.match(block, /AND status = 'pending'/);
  assert.match(block, /INSERT OR IGNORE INTO friendships/g);
  assert.match(block, /changed\.changes/);
});
