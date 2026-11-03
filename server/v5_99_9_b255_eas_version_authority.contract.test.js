const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const check = cwd => spawnSync(process.execPath, [path.join(root, 'scripts/release-identity.mjs'), 'check'], { cwd, encoding: 'utf8', env: { ...process.env, NEXA_ROOT: cwd } });
const FILES = ['app.json', 'package.json', 'package-lock.json', 'PROJECT_MEMORY.json', 'AGENTS.md', 'VERSION.md', 'LAUNCH_HANDOFF.md', 'eas.json', 'server/package.json', 'server/releaseIdentity.json', 'src/theme.ts', 'src/homeDesign.ts', 'src/subscriptionCentre.ts'];
function copy() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-eas-'));
  for (const rel of FILES) { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.copyFileSync(path.join(root, rel), path.join(tmp, rel)); }
  return tmp;
}

test('B255-EAS0 the shipped eas.json lets only release:bump own the build code', () => {
  const eas = JSON.parse(fs.readFileSync(path.join(root, 'eas.json'), 'utf8'));
  assert.strictEqual(eas.cli.appVersionSource, 'local');
  for (const [name, prof] of Object.entries(eas.build)) assert.ok(!prof.autoIncrement, `${name} must not autoIncrement`);
});

test('B255-EAS1 the identity check fails if autoIncrement comes back in any profile', () => {
  const tmp = copy();
  assert.strictEqual(check(tmp).status, 0, 'copy must start consistent');
  const p = path.join(tmp, 'eas.json');
  const eas = JSON.parse(fs.readFileSync(p, 'utf8'));
  eas.build.production.autoIncrement = true;
  fs.writeFileSync(p, JSON.stringify(eas));
  const r = check(tmp);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /autoIncrement must not be enabled/);
});

test('B255-EAS2 the identity check fails if the version source stops being local', () => {
  const tmp = copy();
  const p = path.join(tmp, 'eas.json');
  const eas = JSON.parse(fs.readFileSync(p, 'utf8'));
  eas.cli.appVersionSource = 'remote';
  fs.writeFileSync(p, JSON.stringify(eas));
  const r = check(tmp);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /appVersionSource must be "local"/);
});
