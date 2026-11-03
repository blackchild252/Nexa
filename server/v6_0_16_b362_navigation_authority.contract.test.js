const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');

test('B362 all Add navigation targets pass through canonical validation', () => {
  const source = read('src/nexaNavigation.ts');
  const block = source.match(/export function navigationForAddAction[\s\S]*?\n}\n\nexport function navigationForDamiDestination/)[0];
  assert.equal((block.match(/validateNavigationTarget\(/g) || []).length, 4);
});

test('B362 Dami destinations do not bypass navigation authority', () => {
  const source = read('src/nexaNavigation.ts');
  const block = source.match(/export function navigationForDamiDestination[\s\S]*?\n}\n\nexport function navigationForNotification/)[0];
  assert.ok(!/return \{ pathname:/.test(block));
  assert.ok((block.match(/validateNavigationTarget\(/g) || []).length >= 2);
});

test('B362 notification destinations all use canonical validation', () => {
  const source = read('src/nexaNavigation.ts');
  const block = source.match(/export function navigationForNotification[\s\S]*?\n}\n\nexport function navigationForSearchResult/)[0];
  assert.ok(!/return \{ pathname:/.test(block));
  assert.ok((block.match(/validateNavigationTarget\(/g) || []).length >= 10);
});

test('B362 search destinations all use canonical validation', () => {
  const source = read('src/nexaNavigation.ts');
  const block = source.match(/export function navigationForSearchResult[\s\S]*$/)[0];
  assert.ok(!/return \{ pathname:/.test(block));
  assert.ok((block.match(/validateNavigationTarget\(/g) || []).length >= 6);
});

test('B362 navigation authority remains destination-only and never an authorization substitute', () => {
  const source = read('src/nexaNavigation.ts');
  assert.match(source, /does not authorize actions or mutate\s+\*?\s*server state/);
  assert.match(source, /destination modules remain responsible for their own permissions/);
});
