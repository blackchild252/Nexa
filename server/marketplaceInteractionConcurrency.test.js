const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const source = fs.readFileSync(path.join(__dirname, 'marketplaceInteractions.js'), 'utf8');

test('marketplace inquiry idempotency claim and message creation share one transaction', () => {
  const start = source.indexOf("app.post('/api/marketplace/inquiries'");
  const end = source.indexOf("app.get('/api/marketplace/inquiries'", start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  const tx = block.indexOf('result=db.transaction(()=>{');
  const claim = block.indexOf('INSERT OR IGNORE INTO mall_inquiry_requests', tx);
  const message = block.indexOf('INSERT INTO mall_inquiry_messages', tx);
  assert.ok(tx >= 0 && claim > tx && message > claim);
});

test('marketplace inquiry idempotency duplicate path returns before creating another message', () => {
  const start = source.indexOf("app.post('/api/marketplace/inquiries'");
  const end = source.indexOf("app.get('/api/marketplace/inquiries'", start);
  const block = source.slice(start, end);
  assert.match(block, /if\(prior\) return \{duplicate:true,inquiry:getInquiry\(prior\.inquiryId\)\}/);
  assert.match(block, /if\(!claimed\.changes\).*duplicate:true/s);
});

test('marketplace inquiry status uses an expected-state update inside a transaction', () => {
  const start = source.indexOf("app.patch('/api/marketplace/inquiries/:id/status'");
  const end = source.indexOf("app.post('/api/marketplace/reports'", start);
  const block = source.slice(start, end);
  assert.match(block, /db\.transaction\(\(\)=>\{/);
  assert.match(block, /AND sellerId=\? AND status=\?/);
  assert.match(block, /Inquiry changed concurrently/);
});
