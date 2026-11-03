#!/usr/bin/env node
// NEXA session-start guard. Every AI/coding session runs this FIRST (see AGENTS.md / CLAUDE.md).
//   npm run session:start
// It implements no version rule of its own; it runs the release identity authority and the seal check,
// then tells the session exactly what state the project is in and what the next legal step is.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const run = (script, args) => spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], { cwd: root, encoding: 'utf8', env: { ...process.env, NEXA_ROOT: root } });

const id = run('release-identity.mjs', ['check']);
process.stdout.write(id.stdout || '');
if (id.status !== 0) {
  process.stderr.write(id.stderr || '');
  console.error('\nSTOP: version drift from an earlier session. Fix it (use `npm run release:bump` after every successful implementation run; never hand-edit versions) before any other work.');
  process.exit(1);
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const sealFile = path.join(root, `RELEASE_SEAL_V${pkg.version}.json`);
const sealed = fs.existsSync(sealFile);
let sealIntact = false;
if (sealed) sealIntact = run('release-seal.mjs', ['verify']).status === 0;

console.log('');
if (!sealed) {
  console.log(`STATE: V${pkg.version} is UNSEALED (a release in progress). Continue local work; after this run passes its implementation tests, bump identity with \`npm run release:bump\` before checkpointing.`);
} else if (sealIntact) {
  console.log(`STATE: V${pkg.version} is SEALED and untouched. Before changing ANY file, run \`npm run release:bump\` (it advances patch, Batch and build code together).`);
} else {
  console.log(`STATE: V${pkg.version} has a seal but files changed after sealing. That is only legal if the next version was not created yet. Run \`npm run release:bump\` to start the next version; never edit the old seal.`);
}
console.log([
  '',
  'RULES FOR THIS SESSION (enforced by tooling, defined only in the locked AGENTS.md section):',
  '- Never hand-edit a version number, Batch, build code or archive name. Use `npm run release:bump`.',
  '- Do not add tests that hard-code a release version; use scripts/release-identity.mjs.',
  '- After every successful implementation run, bump identity with `npm run release:bump`; checkpoint archives may remain unsealed unless explicitly requested.',
  '- Do not run `release:ship` unless a sealed official release was requested.',
  '- State plainly what was NOT tested. Never claim untested work is done.',
].join('\n'));
