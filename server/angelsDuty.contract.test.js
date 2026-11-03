const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();

test('Angels Duty is permanently wired into the release workflow', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(pkg.scripts['angels-duty'], 'node scripts/angels-duty.mjs');
  const ship = fs.readFileSync(path.join(root, 'scripts/release-ship.mjs'), 'utf8');
  assert.match(ship, /node\('angels-duty\.mjs', \['--apply'\]\)/);
  assert.match(ship, /const angels = node\('angels-duty\.mjs', \['--apply'\]\)/);
});

test('Angels Duty audit completes without blockers', () => {
  const run = spawnSync(process.execPath, [path.join(root, 'scripts/angels-duty.mjs'), '--json'], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, NEXA_ROOT: root },
  });
  assert.equal(run.status, 0, run.stderr);
  const result = JSON.parse(run.stdout);
  assert.equal(result.operation, 'ANGELS DUTY');
  assert.equal(result.blockers, 0);
  assert.equal(result.protected.historicalReleaseRecords, true);
  assert.equal(result.protected.roadmapAuthorities, true);
});
