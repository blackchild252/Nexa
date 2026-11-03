#!/usr/bin/env node
// NEXA release ship: the single, ordered finish line for a release.
//   npm run release:ship
// Order: identity check -> release notes present -> Devil's Walk quick sweep -> seal create (if missing) -> seal verify
//        -> zip as NEXA-MAIN-V<version>.zip -> extract the zip and verify the seal from the extracted copy.
// Defines no naming/versioning rule; it only runs the authority scripts in order and refuses to skip any.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const noZip = process.argv.includes('--no-zip');
const copyToArg = process.argv.find(a => a.startsWith('--copy-to='));
const copyTo = copyToArg ? path.resolve(root, copyToArg.slice('--copy-to='.length)) : null;
const readJson = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
const node = (script, args = [], cwd = root) => spawnSync(process.execPath, [path.join(root, 'scripts', script), ...args], { cwd, encoding: 'utf8', env: { ...process.env, NEXA_ROOT: cwd } });
const fail = (msg, extra) => { console.error(`SHIP BLOCKED — ${msg}`); if (extra) console.error(extra); process.exit(1); };

// 1. identity must already agree
const id = node('release-identity.mjs', ['check']);
if (id.status !== 0) fail('release identity drift', (id.stderr || '') + (id.stdout || ''));
process.stdout.write(id.stdout);

const version = readJson('package.json').version;
const batch = readJson('PROJECT_MEMORY.json').currentBatch;
const state = `V${version} ${batch}`;
const archive = `NEXA-MAIN-V${version}.zip`;

// 2. release notes must have been written (the bump leaves placeholders)
const handoff = fs.readFileSync(path.join(root, 'LAUNCH_HANDOFF.md'), 'utf8');
if (handoff.includes('(describe this release here)')) fail('LAUNCH_HANDOFF.md still has the placeholder line "(describe this release here)". Write the release note first.');
if (!fs.existsSync(path.join(root, `${batch}_REPORT.md`))) fail(`${batch}_REPORT.md is missing. Write the release report (what was built, what was NOT tested).`);
const versionMd = fs.readFileSync(path.join(root, 'VERSION.md'), 'utf8');
const body = versionMd.split('\n').slice(1).join('\n');
if (!new RegExp(`\\b${batch}\\b`).test(body.replace(/\*\*Batch:\*\*\s*B\d+/, '').replace(/\*\*Previous release:\*\*.*/, ''))) fail(`VERSION.md summary does not describe ${batch}. Rewrite the summary paragraph for this release.`);

// 2b. Angels Duty permanent cleanup layer: only the explicit safe-junk allowlist may be removed.
const angels = node('angels-duty.mjs', ['--apply']);
if (angels.status !== 0) fail('Angels Duty cleanup failed', (angels.stdout || '') + (angels.stderr || ''));
process.stdout.write(angels.stdout);

// 2c. Devil's Walk quick sweep (find only): syntax, imports, routes, TypeScript syntax. Any BLOCKER stops the ship.
const walk = node('devils-walk.mjs', []);
if (walk.status !== 0) fail("Devil's Walk found blockers. Fix them (npm run godhand) or record them as BLOCKED, then ship again.", (walk.stdout || '') + (walk.stderr || ''));
process.stdout.write(walk.stdout);

// 3. seal (never overwrite) and verify
const sealPath = path.join(root, `RELEASE_SEAL_V${version}.json`);
if (!fs.existsSync(sealPath)) {
  const c = node('release-seal.mjs', ['create']);
  if (c.status !== 0) fail('seal create failed', (c.stderr || '') + (c.stdout || ''));
  process.stdout.write(c.stdout);
}
const v = node('release-seal.mjs', ['verify']);
if (v.status !== 0) fail('seal verify failed (files changed after sealing; bump to a new version instead of editing a sealed one)', (v.stderr || '') + (v.stdout || ''));
process.stdout.write(v.stdout);

if (noZip) { console.log(`SHIP OK (no zip requested) — ${state}`); process.exit(0); }

// 4. zip with the locked name, outside the project folder
const out = path.join(path.dirname(root), archive);
if (fs.existsSync(out)) fs.rmSync(out);
fs.rmSync(`${out}.sha256`, { force: true }); // never leave a hash beside an archive that was removed
// The seal is the one authority for which files belong to a release. The archive is built from exactly that list
// (plus the seal file itself), so the zip and the seal cannot drift apart.
const listing = node('release-seal.mjs', ['list']);
if (listing.status !== 0) fail('could not list the release files', (listing.stderr || '') + (listing.stdout || ''));
const names = listing.stdout.split('\n').filter(Boolean);
names.push(path.basename(sealPath));
const z = spawnSync('zip', ['-q', out, '-@'], { cwd: root, input: `${names.join('\n')}\n`, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
if (z.status !== 0) fail('zip failed (is the `zip` command installed?)', z.stderr);

// 5. prove the archive: extract and verify identity + seal from the extracted copy
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-ship-'));
const u = spawnSync('unzip', ['-q', out, '-d', tmp], { encoding: 'utf8' });
if (u.status !== 0) { fs.rmSync(tmp, { recursive: true, force: true }); fail('could not extract the archive for verification', u.stderr); }
const ei = node('release-identity.mjs', ['check'], tmp);
const es = node('release-seal.mjs', ['verify'], tmp);
fs.rmSync(tmp, { recursive: true, force: true });
if (ei.status !== 0 || es.status !== 0) fail('the extracted archive failed verification', (ei.stderr || '') + (es.stderr || ''));
const crypto = await import('node:crypto');
const hash = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
const hashPath = `${out}.sha256`;
fs.writeFileSync(hashPath, `${hash}  ${archive}\n`);
if (copyTo) {
  fs.mkdirSync(copyTo, { recursive: true });
  const copied = path.join(copyTo, archive);
  if (fs.existsSync(copied)) fail(`checkpoint copy already exists: ${copied}`);
  fs.copyFileSync(out, copied);
  fs.copyFileSync(hashPath, `${copied}.sha256`);
  const copiedHash = crypto.createHash('sha256').update(fs.readFileSync(copied)).digest('hex');
  if (copiedHash !== hash) fail('checkpoint copy hash mismatch');
  console.log(`CHECKPOINT COPY OK — ${copied} — ${hash}`);
}
console.log(`SHIP OK — ${state} — ${out} — ${hash}`);
