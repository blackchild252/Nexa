const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

test('extension identity creation checks extension status inside the same transaction as insert', () => {
  const start = source.indexOf('app.post("/api/extensions/:id/identity/keys"');
  const end = source.indexOf('app.delete("/api/extensions/:id/identity/keys/:keyId"', start);
  const block = source.slice(start, end);
  assert.match(block, /db\.transaction\(\(\) => \{/);
  const status = block.indexOf('SELECT id,status FROM extensions');
  const insert = block.indexOf('INSERT INTO extension_identities');
  assert.ok(status >= 0 && insert > status);
  assert.match(block, /Revoked extensions cannot receive new identities/);
});

test('extension identity rotation atomically checks extension, revokes the expected active key, and inserts the replacement', () => {
  const start = source.indexOf('app.post("/api/extensions/:id/identity/keys/:keyId/rotate"');
  const end = source.indexOf('app.get("/api/extensions"', start);
  const block = source.slice(start, end);
  assert.match(block, /db\.transaction\(\(\) => \{/);
  const ext = block.indexOf('SELECT id,status FROM extensions');
  const identity = block.indexOf('revokedAt IS NULL');
  const revoke = block.indexOf('UPDATE extension_identities SET revokedAt=?');
  const insert = block.indexOf('INSERT INTO extension_identities');
  assert.ok(ext >= 0 && identity > ext && revoke > identity && insert > revoke);
  assert.match(block, /That identity changed before rotation completed/);
});
