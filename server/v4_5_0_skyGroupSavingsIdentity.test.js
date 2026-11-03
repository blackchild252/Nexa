const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('Sky Group Savings is the dedicated Groups surface', () => {
  const groups = read('src/GroupsTab.tsx');
  assert.match(groups, /<Text style=\{s\.heading\}>Sky Group Savings<\/Text>/);
  assert.match(groups, /Manage shared Split, Pot, Sky Savings and Sky Group Savings inside Sky Money/);
});

test('Sky Savings remains the Ajo group type and Sky Group Savings remains the parent surface', () => {
  const groups = read('src/GroupsTab.tsx');
  assert.match(groups, /\[\["split","Split"\],\["pot","Pot"\],\["ajo","Sky Savings"\],\["groups","Sky Group Savings"\]\]/);
  assert.match(groups, /if \(kind === "groups"\) return;/);
});
