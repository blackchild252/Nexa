const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'marketplaceInteractions.js'), 'utf8');

test('marketplace inquiry messages re-read open status and mutate inside one transaction', () => {
  const start = source.indexOf("app.post('/api/marketplace/inquiries/:id/messages'");
  const end = source.indexOf("app.patch('/api/marketplace/inquiries/:id/status'", start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /result=db\.transaction\(\(\)=>\{/);
  const statusRead = block.indexOf("if(i.status!=='open')");
  const expectedUpdate = block.indexOf("WHERE id=? AND status=\\'open\\'");
  const insert = block.indexOf("INSERT INTO mall_inquiry_messages");
  assert.ok(statusRead >= 0 && expectedUpdate > statusRead && insert > expectedUpdate);
  assert.match(block, /Inquiry changed concurrently/);
});

test('marketplace inquiry message transaction fails closed on block changes', () => {
  const start = source.indexOf("app.post('/api/marketplace/inquiries/:id/messages'");
  const end = source.indexOf("app.patch('/api/marketplace/inquiries/:id/status'", start);
  const block = source.slice(start, end);
  const blockedCheck = block.indexOf("if(blocked(i.buyerId,i.sellerId))");
  const insert = block.indexOf("INSERT INTO mall_inquiry_messages");
  assert.ok(blockedCheck >= 0 && insert > blockedCheck);
});
