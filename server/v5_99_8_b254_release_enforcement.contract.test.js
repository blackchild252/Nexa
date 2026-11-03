const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const root = path.join(__dirname, '..');
const read = rel => fs.readFileSync(path.join(root, rel), 'utf8');
const script = (name, args = [], cwd = root) => spawnSync(process.execPath, [path.join(cwd, 'scripts', name), ...args], { cwd, encoding: 'utf8', env: { ...process.env, NEXA_ROOT: cwd } });
const IDENTITY_FILES = ['app.json', 'package.json', 'package-lock.json', 'PROJECT_MEMORY.json', 'AGENTS.md', 'VERSION.md', 'LAUNCH_HANDOFF.md', 'server/package.json', 'server/releaseIdentity.json', 'src/theme.ts', 'src/homeDesign.ts', 'src/subscriptionCentre.ts'];

function makeCopy() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-ship-test-'));
  for (const rel of IDENTITY_FILES) { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.copyFileSync(path.join(root, rel), path.join(tmp, rel)); }
  // the Devil's Walk inside ship checks that src imports resolve, so the copied theme file brings the files it imports
  for (const f of ['themeMode.ts', 'themeDesign.ts', 'nexaFonts.ts']) { const src = path.join(root, 'src', f); if (fs.existsSync(src)) { fs.mkdirSync(path.join(tmp, 'src'), { recursive: true }); fs.copyFileSync(src, path.join(tmp, 'src', f)); } }
  fs.mkdirSync(path.join(tmp, 'scripts'));
  for (const f of ['release-identity.mjs', 'release-seal.mjs', 'release-ship.mjs', 'session-start.mjs', 'devils-walk.mjs', 'angels-duty.mjs']) fs.copyFileSync(path.join(root, 'scripts', f), path.join(tmp, 'scripts', f));
  return tmp;
}
const batchOf = () => JSON.parse(read('PROJECT_MEMORY.json')).currentBatch;

test('B254-E0 session:start passes on a consistent project and reports the state (version-agnostic)', () => {
  const r = script('session-start.mjs');
  assert.strictEqual(r.status, 0, r.stderr);
  assert.match(r.stdout, /RELEASE IDENTITY PASS — V\d+\.\d+\.\d+ B\d+/);
  assert.match(r.stdout, /STATE: V\d+\.\d+\.\d+ is (UNSEALED|SEALED|has a seal)/);
});

test('B254-E1 session:start stops a session that starts on drifted versions', () => {
  const tmp = makeCopy();
  const pkg = JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8'));
  pkg.version = '0.0.1';
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify(pkg, null, 2));
  const r = script('session-start.mjs', [], tmp);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /STOP: version drift/);
});

test('B254-E2 ship refuses placeholder notes, a missing report, then seals, then refuses changes after the seal', () => {
  const tmp = makeCopy();
  const batch = batchOf();
  const handoffPath = path.join(tmp, 'LAUNCH_HANDOFF.md');
  const original = fs.readFileSync(handoffPath, 'utf8').replace(/\(describe this release here\)/g, 'described');
  fs.writeFileSync(handoffPath, original.replace(/\s*$/, '\n- (describe this release here)\n'));
  let r = script('release-ship.mjs', ['--no-zip'], tmp);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /placeholder/);
  fs.writeFileSync(handoffPath, original);
  fs.rmSync(path.join(tmp, `${batch}_REPORT.md`), { force: true });
  r = script('release-ship.mjs', ['--no-zip'], tmp);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, new RegExp(`${batch}_REPORT\\.md is missing`));
  fs.writeFileSync(path.join(tmp, `${batch}_REPORT.md`), `# report\n`);
  const versionDoc=path.join(tmp,'VERSION.md');
  fs.appendFileSync(versionDoc, `\n**${batch} summary:** release enforcement contract test fixture.\n`);
  r = script('release-ship.mjs', ['--no-zip'], tmp);
  assert.strictEqual(r.status, 0, r.stderr + r.stdout);
  assert.match(r.stdout, /SHIP OK/);
  fs.appendFileSync(path.join(tmp, `${batch}_REPORT.md`), 'edited after sealing\n');
  r = script('release-ship.mjs', ['--no-zip'], tmp);
  assert.notStrictEqual(r.status, 0);
  assert.match(r.stderr, /seal verify failed/);
});

test('B254-E3 the enforcement is wired into the project, not left to memory', () => {
  const pkg = JSON.parse(read('package.json'));
  assert.strictEqual(pkg.scripts['session:start'], 'node scripts/session-start.mjs');
  assert.strictEqual(pkg.scripts['release:ship'], 'node scripts/release-ship.mjs');
  assert.strictEqual(pkg.scripts['pretest:server'], 'node scripts/release-identity.mjs check');
  assert.match(read('CLAUDE.md'), /npm run session:start/);
  const agents = read('AGENTS.md');
  assert.match(agents, /## Session protocol/);
  assert.match(agents, /npm run session:start/);
  const wf = read('.github/workflows/nexa-quality.yml');
  assert.ok(wf.indexOf('npm run release:identity') > -1 && wf.indexOf('npm run release:identity') < wf.indexOf('npm run deps:preflight'));
  assert.match(read('scripts/release-gate.mjs'), /v5_99_8_b254_release_enforcement\.contract\.test\.js/);
});

test('B254-E4 the locked naming section was not touched or extended and no competing rule exists elsewhere', () => {
  const agents = read('AGENTS.md');
  const start = agents.indexOf('## Naming and versioning (PERMANENT NEXA RULE');
  const end = agents.indexOf('## Session protocol');
  assert.ok(start > -1 && end > start);
  const locked = agents.slice(start, end);
  assert.doesNotMatch(locked, /session:start|release:ship/);
  assert.match(read('CLAUDE.md'), /locked section/);
  assert.doesNotMatch(read('CLAUDE.md') + read('scripts/session-start.mjs') + read('scripts/release-ship.mjs'), /BUILD_MINUS_BATCH\s*=/);
});
