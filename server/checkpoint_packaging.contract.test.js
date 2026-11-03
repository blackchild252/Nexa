const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

test('checkpoint ship uses the permanent Main archive authority', () => {
  const ship = read('scripts/release-ship.mjs');
  assert.match(ship, /NEXA-MAIN-V\$\{version\}\.zip/);
  assert.match(ship, /--copy-to=/);
  assert.match(ship, /CHECKPOINT COPY OK/);
});

test('checkpoint ship proves the extracted archive before accepting it', () => {
  const ship = read('scripts/release-ship.mjs');
  assert.match(ship, /unzip/);
  assert.match(ship, /release-identity\.mjs/);
  assert.match(ship, /release-seal\.mjs/);
});

test('checkpoint wrapper defaults to the external checkpoint directory', () => {
  const src = read('scripts/checkpoint-ship.mjs');
  assert.match(src, /\/mnt\/data\/checkpoints\/main/);
});
