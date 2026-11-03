const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');


test('release audit enforces PROJECT_MEMORY version and Batch synchronization', () => {
  const audit = read('scripts/release-audit.mjs');
  assert.match(audit, /PROJECT_MEMORY\.json/);
  assert.match(audit, /currentVersion/);
  assert.match(audit, /currentBatch/);
  assert.match(audit, /archiveNaming/);
});
