'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (name) => fs.readFileSync(path.join(process.cwd(), name), 'utf8');

test('M7217/M7232 user-facing job-title copy avoids generic NEXA Admin labels in reviewed surfaces', () => {
  assert.match(read('src/Subscription.tsx'), /Administrative Director approval/);
  assert.match(read('src/YaayzSocialFeed.tsx'), /sent to the Administrative Director for review/);
  assert.match(read('src/ZeezaChase.tsx'), /sent to the Administrative Director for review/);
  assert.doesNotMatch(read('src/YaayzSocialFeed.tsx'), /sent to NEXA Admin for review/);
  assert.doesNotMatch(read('src/ZeezaChase.tsx'), /sent to NEXA Admin for review/);
});

test('M7233 technical admin paths and internal role APIs are preserved', () => {
  const source = read('src/marketplace.ts');
  assert.match(source, /\/api\/mall\/admin\/status/);
  assert.match(source, /\/api\/mall\/admin\/disputes/);
  assert.match(read('src/app/marketplace/disputes.tsx'), /r\?\.isAdmin/);
});
