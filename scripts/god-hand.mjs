#!/usr/bin/env node
// NEXA God Hand: ordered block-by-block repair gate; the internal MASTER_ROADMAP.md is canonical.
// It never edits files, versions, Batch, build or archive names. It intentionally does NOT start with a generic full-project defect list. The product is traversed
// from Login to Home, Home sections, every destination, every Admin section, and the final root shell.
// One block must PASS before the next block may begin. External/runtime/provider/store work is parked.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const SIZE = 25; // historical release guard compatibility: certification runs remain 25-milestone batches
const blockWalk = path.join(root, 'scripts', 'block-walk.mjs');
const roadmapCheck = path.join(root, 'scripts', 'roadmap-check.mjs');
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const run = args => spawnSync(process.execPath, [blockWalk, ...args], { cwd: root, encoding:'utf8', maxBuffer:1<<26, env:{...process.env,NEXA_ROOT:root} });
const fail = m => { console.error(`GOD HAND STOP — ${m}`); process.exit(1); };

const roadmap = spawnSync(process.execPath, [roadmapCheck], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 20, env: { ...process.env, NEXA_ROOT: root } });
process.stdout.write(roadmap.stdout || '');
process.stderr.write(roadmap.stderr || '');
if (roadmap.status !== 0) fail('internal master roadmap validation failed; no roadmap work may proceed');

const pkg = readJson('package.json');
const statePath = path.join(root, 'BLOCK_WALK_STATE.json');
const sealed = fs.existsSync(path.join(root, `RELEASE_SEAL_V${pkg.version}.json`));
if (sealed) fail(`V${pkg.version} is sealed. Run \`npm run release:bump\` first.`);

const cmd = process.argv.slice(2).includes('verify') ? 'verify' : process.argv.slice(2).includes('current') ? 'current' : 'next';
const r = run([cmd]);
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.status !== 0) process.exit(r.status ?? 1);

if (cmd === 'next' && fs.existsSync(statePath)) {
  const st = readJson('BLOCK_WALK_STATE.json');
  if (st.status === 'COMPLETE') {
    console.log('GOD HAND: ordered product traversal complete. Next gate: targeted release verification, then release:ship.');
  } else {
    console.log(`GOD HAND: block sealed. Continue with the next block only after fixing this block.`);
  }
}
