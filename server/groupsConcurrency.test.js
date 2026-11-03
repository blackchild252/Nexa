const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, 'groups.js'), 'utf8');

test('group entry creation re-reads membership and group state inside the write transaction', () => {
  const start = source.indexOf('function createEntry(');
  const end = source.indexOf('// ---------- routes ----------', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  const tx = block.indexOf('const write = db.transaction(() => {');
  assert.ok(tx >= 0);
  const currentGroup = block.indexOf('const currentGroup = loadGroup(group.id);', tx);
  const currentMember = block.indexOf('const currentMe = db.prepare("SELECT * FROM money_group_members WHERE groupId = ? AND userId = ?")', tx);
  const membersRead = block.indexOf('const members = membersOf(currentGroup.id);', tx);
  const insert = block.indexOf('INSERT INTO money_group_entries', tx);
  assert.ok(currentGroup > tx && currentMember > currentGroup && membersRead > currentMember && insert > membersRead);
});

test('normal group join handles concurrent membership creation as a safe conflict', () => {
  const start = source.indexOf('app.post("/api/groups/join"');
  const end = source.indexOf('// -- One group in full --', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /currentExisting = db\.prepare\("SELECT \* FROM money_group_members WHERE groupId = \? AND userId = \?"\)/);
  assert.match(block, /includes\("unique"\).*You're already in this group/s);
});

test('placeholder claim is atomic and converts duplicate membership into a controlled conflict', () => {
  const start = source.indexOf('if (claim) {');
  const end = source.indexOf('if (existing) return res.json(detail(group, existing));', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  assert.match(block, /db\.transaction\(\(\) => \{/);
  assert.match(block, /currentExisting = db\.prepare\("SELECT \* FROM money_group_members WHERE groupId = \? AND userId = \?"\)/);
  assert.match(block, /includes\("unique"\).*You're already in this group/s);
});

test('member removal checks history inside the same transaction as deletion', () => {
  const start = source.indexOf('app.delete("/api/groups/:id/members/:mid"');
  const end = source.indexOf('// -- Entries --', start);
  assert.ok(start >= 0 && end > start);
  const block = source.slice(start, end);
  const tx = block.indexOf('db.transaction(() => {');
  const used = block.indexOf('SELECT 1 FROM money_group_entries', tx);
  const deletion = block.indexOf('DELETE FROM money_group_members', tx);
  assert.ok(tx >= 0 && used > tx && deletion > used);
});

test('entry void re-reads the current entry and uses an expected-state update', () => {
  const start = source.indexOf('app.post("/api/groups/:id/entries/:eid/void"');
  assert.ok(start >= 0);
  const block = source.slice(start);
  assert.match(block, /SELECT \* FROM money_group_entries WHERE id = \? AND groupId = \?/);
  assert.match(block, /UPDATE money_group_entries SET voidedAt = \?, voidedBy = \? WHERE id = \? AND groupId = \? AND voidedAt IS NULL/);
});
