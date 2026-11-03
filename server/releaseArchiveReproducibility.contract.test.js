// M7666-M7690 (release integrity and archive reproducibility): the archive must hold exactly the files the seal covers.
// Runs the real release-seal.mjs and release-ship.mjs (with the real `zip` and `unzip`) on a throwaway copy.
// No version number is hard-coded; the identity comes from the project itself.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const haveZip = spawnSync('zip', ['-v'], { encoding: 'utf8' }).status === 0 && spawnSync('unzip', ['-v'], { encoding: 'utf8' }).status === 0;
const IDENTITY_FILES = ['app.json', 'package.json', 'package-lock.json', 'PROJECT_MEMORY.json', 'AGENTS.md', 'VERSION.md', 'LAUNCH_HANDOFF.md', 'server/package.json', 'server/releaseIdentity.json', 'src/theme.ts', 'src/homeDesign.ts', 'src/subscriptionCentre.ts'];
const script = (name, args, cwd) => spawnSync(process.execPath, [path.join(cwd, 'scripts', name), ...args], { cwd, encoding: 'utf8', env: { ...process.env, NEXA_ROOT: cwd } });
const put = (base, rel, text = 'x\n') => { const f = path.join(base, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, text); };

function makeProject() {
  const holder = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-archive-'));
  const tmp = path.join(holder, 'project');
  fs.mkdirSync(tmp);
  for (const rel of IDENTITY_FILES) { fs.mkdirSync(path.dirname(path.join(tmp, rel)), { recursive: true }); fs.copyFileSync(path.join(root, rel), path.join(tmp, rel)); }
  for (const f of ['themeMode.ts', 'themeDesign.ts', 'nexaFonts.ts']) { const src = path.join(root, 'src', f); if (fs.existsSync(src)) fs.copyFileSync(src, path.join(tmp, 'src', f)); }
  fs.copyFileSync(path.join(root, 'README.md'), path.join(tmp, 'README.md'));
  fs.mkdirSync(path.join(tmp, 'scripts'));
  for (const f of ['release-identity.mjs', 'release-seal.mjs', 'release-ship.mjs', 'session-start.mjs', 'devils-walk.mjs', 'angels-duty.mjs']) fs.copyFileSync(path.join(root, 'scripts', f), path.join(tmp, 'scripts', f));
  const batch = JSON.parse(fs.readFileSync(path.join(tmp, 'PROJECT_MEMORY.json'), 'utf8')).currentBatch;
  const handoff = path.join(tmp, 'LAUNCH_HANDOFF.md');
  fs.writeFileSync(handoff, fs.readFileSync(handoff, 'utf8').replace(/\(describe this release here\)/g, 'described'));
  put(tmp, `${batch}_REPORT.md`, '# report\n');
  fs.appendFileSync(path.join(tmp, 'VERSION.md'), `\n**${batch} summary:** archive reproducibility contract test fixture.\n`);
  return { holder, tmp, batch, version: JSON.parse(fs.readFileSync(path.join(tmp, 'package.json'), 'utf8')).version };
}

// Files that must NOT be packed or sealed, and files that must be, at several depths.
const SKIPPED = ['node_modules/a/i.js', 'src/node_modules/b/i.js', 'android/app/build/o.bin', 'web/dist/o.js', '.turbo/t.json', 'web/.expo/s.json', 'a/.cache/c.json',
  '.env', 'server/.env', 'server/.env.production', '.npmrc', 'sub/.netrc', 'certs/deploy.key', 'certs/app.pem', 'certs/ios.p12', 'service-account-prod.json', 'cfg/firebase-adminsdk-abc.json', 'old/NEXA-MAIN-V0.0.1.zip', 'notes/backup.zip'];
const KEPT = ['.env.example', 'docs/.env.example', 'server/.env.example', 'src/plain.txt', 'src/deep/er/file.js'];

test('seal list names exactly the files the seal covers and never a secret or build folder', () => {
  const { holder, tmp } = makeProject();
  try {
    for (const rel of [...SKIPPED, ...KEPT]) put(tmp, rel);
    const listed = script('release-seal.mjs', ['list'], tmp);
    assert.strictEqual(listed.status, 0, listed.stderr);
    const names = listed.stdout.split('\n').filter(Boolean);
    for (const rel of SKIPPED) assert.ok(!names.includes(rel), `${rel} must not be listed`);
    for (const rel of KEPT) assert.ok(names.includes(rel), `${rel} must be listed`);
    assert.ok(names.length > 0 && new Set(names).size === names.length, 'list is not empty and has no duplicates');
  } finally { fs.rmSync(holder, { recursive: true, force: true }); }
});

test('seal list fails closed when a file name contains a line break', () => {
  const { holder, tmp } = makeProject();
  try {
    let made = true;
    try { put(tmp, 'src/bad\nname.txt'); } catch { made = false; }
    if (!made) return; // this file system cannot hold such a name
    const listed = script('release-seal.mjs', ['list'], tmp);
    assert.notStrictEqual(listed.status, 0);
    assert.match(listed.stderr, /line break/);
    assert.strictEqual(listed.stdout, '');
  } finally { fs.rmSync(holder, { recursive: true, force: true }); }
});

test('release ship packs exactly the sealed files and the extracted archive passes its own seal', { skip: !haveZip && 'zip/unzip not installed' }, () => {
  const { holder, tmp, version } = makeProject();
  const archive = path.join(holder, `NEXA-MAIN-V${version}.zip`);
  try {
    for (const rel of [...SKIPPED, ...KEPT]) put(tmp, rel);
    const shipped = script('release-ship.mjs', [], tmp);
    assert.strictEqual(shipped.status, 0, shipped.stderr + shipped.stdout);
    assert.match(shipped.stdout, /SHIP OK/);
    assert.ok(fs.existsSync(archive), 'the archive has the locked name and sits beside the project folder');

    const inZip = spawnSync('unzip', ['-Z1', archive], { encoding: 'utf8' }).stdout.split('\n').filter(l => l && !l.endsWith('/')).sort();
    const sealed = JSON.parse(fs.readFileSync(path.join(tmp, `RELEASE_SEAL_V${version}.json`), 'utf8')).files.map(f => f.path);
    const expected = [...sealed, `RELEASE_SEAL_V${version}.json`].sort();
    assert.deepStrictEqual(inZip, expected, 'the zip holds the sealed files plus the seal, nothing more and nothing less');
    for (const rel of SKIPPED) assert.ok(!inZip.includes(rel), `${rel} must not be in the archive`);
    for (const rel of KEPT) assert.ok(inZip.includes(rel), `${rel} must be in the archive`);
  } finally { fs.rmSync(holder, { recursive: true, force: true }); }
});

test('release ship still refuses to pack when the seal no longer matches', { skip: !haveZip && 'zip/unzip not installed' }, () => {
  const { holder, tmp, version } = makeProject();
  try {
    let r = script('release-ship.mjs', ['--no-zip'], tmp);
    assert.strictEqual(r.status, 0, r.stderr + r.stdout);
    fs.appendFileSync(path.join(tmp, 'VERSION.md'), 'edited after sealing\n');
    r = script('release-ship.mjs', [], tmp);
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /seal verify failed/);
    assert.ok(!fs.existsSync(path.join(holder, `NEXA-MAIN-V${version}.zip`)), 'no archive is written for a changed sealed release');
  } finally { fs.rmSync(holder, { recursive: true, force: true }); }
});

test('source guard: the zip step reads its file list from the seal, with no second exclusion list', () => {
  const ship = fs.readFileSync(path.join(root, 'scripts/release-ship.mjs'), 'utf8');
  assert.match(ship, /release-seal\.mjs', \['list'\]/);
  assert.match(ship, /'-@'/);
  assert.doesNotMatch(ship, /'-x'/);
});

// ---- fail-closed, short messages (no stack trace, no internal paths) ----
function bareProject(files = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-seal-bare-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  fs.copyFileSync(path.join(root, 'scripts', 'release-seal.mjs'), path.join(dir, 'scripts', 'release-seal.mjs'));
  for (const [name, text] of Object.entries(files)) fs.writeFileSync(path.join(dir, name), text);
  return dir;
}
const noTrace = r => { assert.doesNotMatch(r.stderr + r.stdout, /\n\s+at |node:internal|node:fs|Node\.js v\d/); };

test('seal stops with one short line when package.json or PROJECT_MEMORY.json is missing', () => {
  const dir = bareProject();
  try {
    for (const cmd of ['create', 'verify', 'list']) {
      const r = script('release-seal.mjs', [cmd], dir);
      assert.strictEqual(r.status, 2, `${cmd}: ${r.stderr}`);
      assert.match(r.stderr, /^RELEASE SEAL BLOCKED — package\.json is missing/);
      noTrace(r);
      assert.ok(!r.stderr.includes(dir), 'no internal folder path is printed');
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('seal stops cleanly on broken, non-object or versionless project files', () => {
  const cases = [
    [{ 'package.json': '{bad', 'PROJECT_MEMORY.json': '{}' }, /package\.json is not a valid JSON object/],
    [{ 'package.json': '[]', 'PROJECT_MEMORY.json': '{}' }, /package\.json is not a valid JSON object/],
    [{ 'package.json': '{"version":"1.0.0"}', 'PROJECT_MEMORY.json': 'nope' }, /PROJECT_MEMORY\.json is not a valid JSON object/],
    [{ 'package.json': '{"version":"banana"}', 'PROJECT_MEMORY.json': '{"currentBatch":"B1"}' }, /package\.json has no valid version/],
  ];
  for (const [files, expected] of cases) {
    const dir = bareProject(files);
    try {
      const r = script('release-seal.mjs', ['verify'], dir);
      assert.strictEqual(r.status, 2, r.stderr);
      assert.match(r.stderr, expected);
      noTrace(r);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test('seal verify refuses a missing, unreadable or malformed seal without a stack trace', () => {
  const base = { 'package.json': '{"version":"1.2.3"}', 'PROJECT_MEMORY.json': '{"currentBatch":"B7"}' };
  const cases = [
    [{}, /Missing permanent release seal: RELEASE_SEAL_V1\.2\.3\.json/],
    [{ 'RELEASE_SEAL_V1.2.3.json': '{broken' }, /cannot be read as JSON/],
    [{ 'RELEASE_SEAL_V1.2.3.json': '{"release":"1.2.3"}' }, /is malformed/],
    [{ 'RELEASE_SEAL_V1.2.3.json': JSON.stringify({ release: '1.2.3', batch: 'B7', files: [{ path: 'a', sha256: 'zz' }] }) }, /is malformed/],
    [{ 'RELEASE_SEAL_V1.2.3.json': JSON.stringify({ release: 'x'.repeat(5000), batch: 'B7', archive: 'a', sealed: true, environmentIndependent: true, files: [] }) }, /Seal release x{40} does not match package 1\.2\.3$/m],
  ];
  for (const [extra, expected] of cases) {
    const dir = bareProject({ ...base, ...extra });
    try {
      const r = script('release-seal.mjs', ['verify'], dir);
      assert.strictEqual(r.status, 1, r.stderr);
      assert.match(r.stderr, expected);
      assert.match(r.stderr, /^RELEASE SEAL BLOCKED — /);
      assert.ok(r.stderr.length < 400, 'the message stays short even for a huge value in the seal');
      noTrace(r);
    } finally { fs.rmSync(dir, { recursive: true, force: true }); }
  }
});

test('seal create is still one-way and a good seal still verifies', () => {
  const dir = bareProject({ 'package.json': '{"version":"1.2.3"}', 'PROJECT_MEMORY.json': '{"currentBatch":"B7"}', 'a.txt': 'one\n' });
  try {
    let r = script('release-seal.mjs', ['create'], dir);
    assert.strictEqual(r.status, 0, r.stderr);
    r = script('release-seal.mjs', ['verify'], dir);
    assert.strictEqual(r.status, 0, r.stderr);
    assert.match(r.stdout, /RELEASE SEAL PASS/);
    r = script('release-seal.mjs', ['create'], dir);
    assert.notStrictEqual(r.status, 0);
    assert.match(r.stderr, /Permanent release seal already exists/);
    noTrace(r);
    fs.writeFileSync(path.join(dir, 'a.txt'), 'two\n');
    r = script('release-seal.mjs', ['verify'], dir);
    assert.strictEqual(r.status, 1);
    assert.match(r.stderr, /RELEASE SEAL FAILED — sealed source changed/);
    assert.match(r.stderr, /- a\.txt/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('shipping the same sealed release twice gives the same files, the same contents and a matching hash file', { skip: !haveZip && 'zip/unzip not installed' }, () => {
  const { holder, tmp, version } = makeProject();
  const archive = path.join(holder, `NEXA-MAIN-V${version}.zip`);
  const members = () => spawnSync('unzip', ['-v', archive], { encoding: 'utf8' }).stdout.split('\n')
    .map(l => l.trim().split(/\s+/)).filter(c => c.length >= 8 && /^[0-9a-f]{8}$/.test(c[6])).map(c => `${c[6]} ${c.slice(7).join(' ')}`).sort();
  try {
    for (const rel of KEPT) put(tmp, rel);
    assert.strictEqual(script('release-ship.mjs', [], tmp).status, 0);
    const first = members();
    assert.ok(first.length > 10);
    fs.writeFileSync(`${archive}.sha256`, 'stale\n');
    const again = script('release-ship.mjs', [], tmp);
    assert.strictEqual(again.status, 0, again.stderr + again.stdout);
    assert.deepStrictEqual(members(), first, 'same file names and same content checksums on a repeat run');
    const crypto = require('node:crypto');
    const hash = crypto.createHash('sha256').update(fs.readFileSync(archive)).digest('hex');
    assert.strictEqual(fs.readFileSync(`${archive}.sha256`, 'utf8'), `${hash}  NEXA-MAIN-V${version}.zip\n`);
  } finally { fs.rmSync(holder, { recursive: true, force: true }); }
});

// ---- the bump owns the headings outside the identity files ----
const stateOf = dir => { const v = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version; const b = JSON.parse(fs.readFileSync(path.join(dir, 'PROJECT_MEMORY.json'), 'utf8')).currentBatch; const c = JSON.parse(fs.readFileSync(path.join(dir, 'app.json'), 'utf8')).expo.android.versionCode; return { state: `V${v} ${b}`, build: c, batch: b }; };

test('release:bump writes the README and LAUNCH_HANDOFF headings itself', () => {
  const { holder, tmp } = makeProject();
  try {
    const before = stateOf(tmp);
    const handoffBefore = fs.readFileSync(path.join(tmp, 'LAUNCH_HANDOFF.md'), 'utf8');
    const r = script('release-identity.mjs', ['bump'], tmp);
    assert.strictEqual(r.status, 0, r.stderr + r.stdout);
    const after = stateOf(tmp);
    assert.notStrictEqual(after.state, before.state);
    const readme = fs.readFileSync(path.join(tmp, 'README.md'), 'utf8').split('\n');
    assert.strictEqual(readme[0], `# NEXA — Current status (${after.state})`);
    const startHere = readme.find(l => l.startsWith('Start here:'));
    assert.ok(startHere.includes(`\`${after.batch}_REPORT.md\``), 'report name follows the Batch');
    assert.ok(startHere.includes(`Current checkpoint: **${after.state} / build ${after.build}**`));
    const hand = fs.readFileSync(path.join(tmp, 'LAUNCH_HANDOFF.md'), 'utf8');
    assert.strictEqual(hand.split('\n', 1)[0], `# NEXA launch hand-off — ${after.state}`);
    assert.ok(hand.includes(handoffBefore.slice(0, 200)) && hand.includes(`## ${after.state}\n`), 'older notes are kept and the bump section exists');
    assert.strictEqual(script('release-identity.mjs', ['check'], tmp).status, 0);
  } finally { fs.rmSync(holder, { recursive: true, force: true }); }
});

test('sync-docs repairs stale headings, changes nothing when they already agree, and skips a missing README', () => {
  const { holder, tmp } = makeProject();
  try {
    const { state } = stateOf(tmp);
    const readmePath = path.join(tmp, 'README.md'), handPath = path.join(tmp, 'LAUNCH_HANDOFF.md');
    fs.writeFileSync(readmePath, fs.readFileSync(readmePath, 'utf8').replace(/^# NEXA — Current status \(V\d+\.\d+\.\d+ B\d+\)/, '# NEXA — Current status (V0.0.1 B1)'));
    assert.strictEqual(script('release-identity.mjs', ['sync-docs'], tmp).status, 0);
    assert.strictEqual(fs.readFileSync(readmePath, 'utf8').split('\n')[0], `# NEXA — Current status (${state})`);
    const handOnce = fs.readFileSync(handPath, 'utf8'), readmeOnce = fs.readFileSync(readmePath, 'utf8');
    assert.strictEqual(script('release-identity.mjs', ['sync-docs'], tmp).status, 0);
    assert.strictEqual(fs.readFileSync(handPath, 'utf8'), handOnce, 'second run adds nothing');
    assert.strictEqual(fs.readFileSync(readmePath, 'utf8'), readmeOnce);
    assert.strictEqual((handOnce.match(new RegExp(`^# NEXA launch hand-off — ${state}$`, 'gm')) || []).length, 1);
    fs.rmSync(readmePath);
    assert.strictEqual(script('release-identity.mjs', ['sync-docs'], tmp).status, 0);
    assert.ok(!fs.existsSync(readmePath), 'a missing README is not created');
  } finally { fs.rmSync(holder, { recursive: true, force: true }); }
});

test('release-identity and session-start stop with one short line when package.json is missing', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-identity-bare-'));
  fs.mkdirSync(path.join(dir, 'scripts'));
  for (const f of ['release-identity.mjs', 'release-seal.mjs', 'session-start.mjs']) fs.copyFileSync(path.join(root, 'scripts', f), path.join(dir, 'scripts', f));
  try {
    for (const [name, args] of [['release-identity.mjs', ['check']], ['release-identity.mjs', ['bump']], ['release-identity.mjs', ['sync-docs']], ['session-start.mjs', []]]) {
      const r = script(name, args, dir);
      assert.notStrictEqual(r.status, 0, `${name} ${args}`);
      assert.match(r.stderr, /RELEASE IDENTITY BLOCKED — a required project file is missing/);
      noTrace(r);
      assert.ok(!r.stderr.includes(dir), 'no internal folder path');
    }
    fs.writeFileSync(path.join(dir, 'package.json'), '{bad');
    const r = script('release-identity.mjs', ['check'], dir);
    assert.strictEqual(r.status, 2);
    assert.match(r.stderr, /not valid JSON/);
    noTrace(r);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('source guard: bump runs syncDocs and the seal-checked identity stays version-agnostic', () => {
  const src = fs.readFileSync(path.join(root, 'scripts/release-identity.mjs'), 'utf8');
  assert.match(src, /writeText\('LAUNCH_HANDOFF\.md', hand\);\s*syncDocs\(\);/);
});
