const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

test('Main release authority uses the standalone Main archive name', () => {
  const identity = read('scripts/release-identity.mjs');
  const seal = read('scripts/release-seal.mjs');
  const ship = read('scripts/release-ship.mjs');
  const session = read('scripts/session-start.mjs');
  assert.match(identity, /NEXA-MAIN-V\$\{version\}\.zip/);
  assert.match(seal, /NEXA-MAIN-V\$\{version\}\.zip/);
  assert.match(ship, /NEXA-MAIN-V\$\{version\}\.zip/);
  assert.match(session, /release-identity\.mjs/);
  assert.equal(JSON.parse(read('PROJECT_MEMORY.json')).releaseArchive, `NEXA-MAIN-V${JSON.parse(read('package.json')).version}.zip`);
});
