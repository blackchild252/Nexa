const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'zeezaMessaging.js'), 'utf8');

test('DM thread creation is transaction-safe against concurrent unique-pair creation', () => {
  const block = source.slice(source.indexOf('function findOrCreateThread'), source.indexOf('function otherUserId'));
  assert.ok(block.includes('db.transaction(() =>'));
  assert.ok(block.includes('INSERT INTO dm_threads'));
  assert.ok(block.includes('includes("unique")'));
  assert.ok(block.includes('SELECT * FROM dm_threads WHERE userAId = ? AND userBId = ?'));
});

test('DM send rechecks friendship/block state inside the write transaction', () => {
  const start = source.indexOf('app.post("/api/social/dm/threads/:threadId/messages"');
  const end = source.indexOf('// ================= Rooms =================', start);
  const block = source.slice(start, end);
  assert.ok(block.includes('db.transaction(() =>'));
  assert.ok(block.indexOf('SELECT * FROM dm_threads WHERE id = ?') < block.indexOf('isBlocked(req.user.id, currentOtherId)'));
  assert.ok(block.indexOf('isBlocked(req.user.id, currentOtherId)') < block.indexOf('INSERT INTO dm_messages'));
});

test('room join claims capacity inside the write transaction', () => {
  const start = source.indexOf('app.post("/api/social/rooms/join"');
  const end = source.indexOf('app.get("/api/social/rooms/:roomId/members"', start);
  const block = source.slice(start, end);
  assert.ok(block.includes('db.transaction(() =>'));
  assert.ok(block.includes('COUNT(*) AS n'));
  assert.ok(block.includes('SELECT ?,?,?,?,? WHERE (SELECT COUNT(*) FROM chat_room_members WHERE roomId = ?) < ?'));
});

test('room message write rechecks active membership at mutation time', () => {
  const start = source.indexOf('app.post("/api/social/rooms/:roomId/messages"');
  const end = source.indexOf('// Leave a room', start);
  const block = source.slice(start, end);
  assert.ok(block.includes('SELECT 1 FROM chat_room_members WHERE roomId = ? AND userId = ?'));
  assert.ok(block.includes('INSERT INTO room_messages'));
  assert.ok(block.includes('WHERE EXISTS (SELECT 1 FROM chat_room_members WHERE roomId = ? AND userId = ?)'));
});
