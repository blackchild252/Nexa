const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');

test('vendor product update re-reads the product inside its write transaction', () => {
  const start = source.indexOf('app.put("/api/mall/vendor/products/:id"');
  const end = source.indexOf('app.delete("/api/mall/vendor/products/:id"', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  const tx = block.indexOf('updated = db.transaction(() => {');
  const read = block.indexOf('SELECT * FROM mall_products WHERE id = ? AND vendorId = ?', tx);
  const update = block.indexOf('UPDATE mall_products SET', tx);
  assert.ok(tx >= 0 && read > tx && update > read);
});

test('vendor product update scopes the mutation to the authenticated vendor and fails on a stale write', () => {
  const start = source.indexOf('app.put("/api/mall/vendor/products/:id"');
  const end = source.indexOf('app.delete("/api/mall/vendor/products/:id"', start);
  const block = source.slice(start, end);
  assert.match(block, /WHERE id=\? AND vendorId=\?/);
  assert.match(block, /Product changed before this update completed/);
});
