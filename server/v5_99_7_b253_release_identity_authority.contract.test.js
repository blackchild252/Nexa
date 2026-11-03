const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const run = (args, cwd = root, env = {}) => spawnSync(process.execPath, [path.join(root, 'scripts/release-identity.mjs'), ...args], { cwd, encoding: 'utf8', env: { ...process.env, NEXA_ROOT: cwd, ...env } });

test('B253-ID0 every identity location agrees (version-agnostic: works for every future release)', () => {
  const r = run(['check']);
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /RELEASE IDENTITY PASS — V\d+\.\d+\.\d+ B\d+ \(build \d+\) — archive NEXA-MAIN-V\d+\.\d+\.\d+\.zip/);
});

test('B253-ID1 runtime identity file matches the project and the server exposes it on /health', () => {
  const ri = require('./releaseIdentity');
  assert.strictEqual(ri.identity.version, require('../package.json').version);
  assert.deepStrictEqual(ri.publicIdentity(), { batch: ri.identity.batch, build: ri.identity.buildCode });
  const idx = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
  assert.match(idx, /ok: true, version: require\("\.\/package\.json"\)\.version, \.\.\.require\("\.\/releaseIdentity"\)\.publicIdentity\(\)/);
  assert.doesNotMatch(JSON.stringify(ri.publicIdentity()), /key|secret|token|password/i);
});

test('B253-ID2 bump advances patch, Batch, build code by exactly +1 everywhere and stays consistent', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-bump-'));
  const copy = (rel) => { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.copyFileSync(path.join(root, rel), path.join(tmp, rel)); };
  ['app.json', 'package.json', 'package-lock.json', 'PROJECT_MEMORY.json', 'AGENTS.md', 'VERSION.md', 'LAUNCH_HANDOFF.md', 'server/package.json', 'server/releaseIdentity.json', 'src/theme.ts', 'src/homeDesign.ts', 'src/subscriptionCentre.ts'].forEach(copy);
  const before = JSON.parse(run(['check'], tmp).status === 0 ? fs.readFileSync(path.join(tmp, 'server/releaseIdentity.json'), 'utf8') : 'null');
  assert.ok(before, 'copy must start consistent');
  const [a, b, c] = before.version.split('.').map(Number);
  const r = run(['bump'], tmp);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  const after = JSON.parse(fs.readFileSync(path.join(tmp, 'server/releaseIdentity.json'), 'utf8'));
  assert.strictEqual(after.version, `${a}.${b}.${c + 1}`);
  assert.strictEqual(after.batch, `B${Number(before.batch.slice(1)) + 1}`);
  assert.strictEqual(after.buildCode, before.buildCode + 1);
  const app = JSON.parse(fs.readFileSync(path.join(tmp, 'app.json'), 'utf8'));
  assert.deepStrictEqual([app.expo.android.versionCode, Number(app.expo.ios.buildNumber), app.expo.extra.versionCode, app.versionCode], Array(4).fill(after.buildCode));
  assert.strictEqual(app.expo.versionCode, undefined);
  assert.strictEqual(app.expo.android.package, 'com.aami.nexa');
  assert.strictEqual(run(['check'], tmp).status, 0);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('B253-ID3 drift is detected and bump refuses to run on inconsistent or sealed state', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-drift-'));
  const copy = (rel) => { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.copyFileSync(path.join(root, rel), path.join(tmp, rel)); };
  ['app.json', 'package.json', 'package-lock.json', 'PROJECT_MEMORY.json', 'AGENTS.md', 'VERSION.md', 'LAUNCH_HANDOFF.md', 'server/package.json', 'server/releaseIdentity.json', 'src/theme.ts', 'src/homeDesign.ts', 'src/subscriptionCentre.ts'].forEach(copy);
  const app = JSON.parse(fs.readFileSync(path.join(tmp, 'app.json'), 'utf8'));
  app.expo.ios.buildNumber = String(Number(app.expo.ios.buildNumber) + 1);
  fs.writeFileSync(path.join(tmp, 'app.json'), JSON.stringify(app, null, 2));
  assert.notStrictEqual(run(['check'], tmp).status, 0);
  assert.notStrictEqual(run(['bump'], tmp).status, 0);
  app.expo.ios.buildNumber = String(app.expo.android.versionCode);
  fs.writeFileSync(path.join(tmp, 'app.json'), JSON.stringify(app, null, 2));
  const id = JSON.parse(fs.readFileSync(path.join(tmp, 'server/releaseIdentity.json'), 'utf8'));
  const [x, y, z] = id.version.split('.');
  fs.writeFileSync(path.join(tmp, `RELEASE_SEAL_V${x}.${y}.${Number(z) + 1}.json`), '{}');
  const r = run(['bump'], tmp);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /sealed files are never overwritten/);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('B253-ID4 npm scripts expose the authority and the release gate runs it', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.strictEqual(pkg.scripts['release:identity'], 'node scripts/release-identity.mjs check');
  assert.strictEqual(pkg.scripts['release:bump'], 'node scripts/release-identity.mjs bump');
  const gate = fs.readFileSync(path.join(root, 'scripts/release-gate.mjs'), 'utf8');
  assert.doesNotMatch(gate, /v5_99_7_b253_release_identity_authority\.contract\.test\.js/);
  assert.match(gate, /release-identity\.mjs/);
});

test('B253-ID5 Docker image ships the runtime identity file and the Docker runtime can read it', () => {
  assert.match(fs.readFileSync(path.join(root, 'Dockerfile'), 'utf8'), /COPY server \.\/server/);
  assert.ok(fs.existsSync(path.join(__dirname, 'releaseIdentity.json')));
});
