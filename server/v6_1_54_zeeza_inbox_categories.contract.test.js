import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const source = fs.readFileSync(path.join(process.cwd(), 'src/ZeezaInbox.tsx'), 'utf8');

test('Zeeza inbox exposes exactly three ordered, accessible category controls', () => {
  const labels = ['Local inbox', 'Zeeza chat', 'Notifications'];
  const positions = labels.map(label => source.indexOf(`"${label}"`));
  assert.ok(positions.every(position => position >= 0));
  assert.deepEqual([...positions].sort((a, b) => a - b), positions);
  assert.match(source, /accessibilityRole="tablist"/);
  assert.match(source, /accessibilityRole="tab"/);
  assert.match(source, /accessibilityState=\{\{ selected: category === id \}\}/);
});

test('local inbox is connected to the authenticated secure-message API and Notifications remains separate', () => {
  assert.match(source, /authedFetch\("\/api\/zeeza\/local-inbox"\)/);
  assert.match(source, /Only messages addressed to your account are shown/);
  assert.match(source, /Notifications open the dedicated NEXA Notifications page/);
  assert.match(source, /router\.push\("\/\(tabs\)\?panel=notifications"/);
  assert.match(source, /verified Central notification feed is connected/);
});

test('existing Zeeza conversation list remains isolated under its own category', () => {
  assert.match(source, /category === "notifications"/);
  assert.match(source, /<Inbox zeeza=\{zeeza\} \/>/);
  assert.match(source, /<Rooms zeeza=\{zeeza\} \/>/);
});
