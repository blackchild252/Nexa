const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

// M5954: roadmap authority separation. No release version is hard-coded here.
test('MASTER_ROADMAP has one active individual Main block of exactly 25 milestones', () => {
  const src = read('MASTER_ROADMAP.md');
  const heads = [...src.matchAll(/^## CURRENT ACTIVE MAIN BLOCK — (M\d+)–(M\d+)/gm)];
  assert.equal(heads.length, 1, 'exactly one active individual Main block heading is required');
  const [, first, last] = heads[0];
  assert.equal(Number(last.slice(1)) - Number(first.slice(1)) + 1, 25);
  // The 25 numbered milestones live under the block's own registered/completed heading.
  const own = src.match(new RegExp(`^## [^\\n]*MAIN APP BLOCK — ${first}–${last}[^\\n]*$`, 'm'));
  assert.ok(own, 'the active block milestone list heading is missing');
  const rest = src.slice(own.index + own[0].length);
  const next = rest.search(/\n## /);
  const block = next >= 0 ? rest.slice(0, next) : rest;
  const ids = [...block.matchAll(/^\d+\. (M\d+) — /gm)].map(m => Number(m[1].slice(1)));
  assert.equal(ids.length, 25);
  ids.forEach((id, i) => assert.equal(id, ids[0] + i, 'milestone ids must be consecutive'));
});

test('Main agent instructions name Main-only roadmap execution and retire Combined as active', () => {
  const agents = read('AGENTS.md');
  const claude = read('CLAUDE.md');
  assert.match(agents, /`MASTER_ROADMAP\.md` is the sole active, permanent NEXA Main roadmap/);
  assert.match(claude, /`MASTER_ROADMAP\.md` is the sole permanent internal roadmap authority for NEXA Main/);
  assert.match(claude, /START and NEXT reconcile it with source, tests, release identity, and checkpoint evidence/);
  assert.doesNotMatch(claude, /Combined roadmap is (the )?active/i);
  assert.doesNotMatch(agents, /Combined roadmap is (the )?active/i);
});

// M5955: independent duty execution. The three duties must not read the Admin project.
test('Devil Walk, God Hand, Angels Duty and release identity never reference the Admin project', () => {
  for (const f of ['devils-walk', 'god-hand', 'angels-duty', 'release-identity', 'checkpoint-ship']) {
    const src = read(`scripts/${f}.mjs`);
    assert.doesNotMatch(src, /NEXA-ADMIN|ADMIN_RELEASE|nexa-admin-web/, `${f} must stay independent of Admin`);
    assert.doesNotMatch(src, /\.\.\/admin|\.\.\/NEXA-ADMIN/, `${f} must not reach into an Admin folder`);
  }
});

test('Main archive and checkpoint names stay Main-only', () => {
  const pkg = JSON.parse(read('package.json'));
  const mem = JSON.parse(read('PROJECT_MEMORY.json'));
  assert.equal(mem.releaseArchive, `NEXA-MAIN-V${pkg.version}.zip`);
});
