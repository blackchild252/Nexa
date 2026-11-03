const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

test('extension registration claims slug uniqueness inside the transaction', () => {
  const start = source.indexOf('app.post("/api/extensions", auth.authMiddleware');
  const end = source.indexOf('app.patch("/api/extensions/:id"', start);
  const block = source.slice(start, end);
  const tx = block.indexOf('db.transaction(() => {');
  const lookup = block.indexOf('SELECT id FROM extensions WHERE userId=? AND slug=?');
  const insert = block.indexOf('INSERT INTO extensions');
  assert.ok(tx >= 0 && lookup > tx && insert > lookup);
  assert.match(block, /idx_extensions_user_slug/);
  assert.match(block, /already registered/);
});

test('extension enable rechecks consent and status inside the same write transaction', () => {
  const start = source.indexOf('app.post("/api/extensions/:id/enable"');
  const end = source.indexOf('app.post("/api/extensions/:id/disable"', start);
  const block = source.slice(start, end);
  const tx = block.indexOf('db.transaction(() => {');
  const row = block.indexOf('SELECT * FROM extensions WHERE id=? AND userId=?');
  const consent = block.indexOf('extension_consents');
  const update = block.indexOf("UPDATE extensions SET status='enabled'");
  assert.ok(tx >= 0 && row > tx && consent > row && update > consent);
  assert.match(block, /status IN \('registered','disabled'\)/);
  assert.match(block, /Extension state changed before it could be enabled/);
});
