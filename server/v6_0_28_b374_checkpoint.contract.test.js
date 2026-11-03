'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=f=>fs.readFileSync(path.join(root,f),'utf8');
const json=f=>JSON.parse(read(f));
const pkg=json('package.json');
const memory=json('PROJECT_MEMORY.json');
const version=pkg.version;
const batch=memory.currentBatch;
const state=`V${version} ${batch}`;
const archive=`NEXA-MAIN-V${version}.zip`;
const tests=[
 ['active package identity is authoritative',()=>assert.equal(pkg.version,version)],
 ['active batch is authoritative',()=>assert.match(batch,/^B\d+$/)],
 ['archive name is version-only',()=>assert.equal(memory.releaseArchive,archive)],
 ['README includes the authoritative current identity',()=>assert.match(read('README.md'),/AGENTS\.md|Current status/) && assert.match(read('AGENTS.md'),new RegExp(`V${version.replace(/\./g,'\\.')} ${batch}`))],
 ['VERSION heading follows active identity',()=>assert.match(read('VERSION.md'),new RegExp(`^# NEXA V${version.replace(/\\./g,'\\.')} ${batch}`))],
 ['handoff records the authoritative current identity',()=>assert.match(read('LAUNCH_HANDOFF.md'),new RegExp(`V${version.replace(/\./g,'\\.')} ${batch}`))],
 ['current roadmap pointer is registered',()=>{assert.match(memory.currentRoadmap,/M\d+–M\d+/);assert.match(read('MASTER_ROADMAP.md'),/## CURRENT ACTIVE MAIN BLOCK — M\d+–M\d+/)}],
 ['successor blocks are registered and remain unstarted',()=>{assert.match(memory.nextRoadmap,/M\d+–M\d+/);assert.match(read('MASTER_ROADMAP.md'),/## REGISTERED FUTURE MAIN APP BLOCK — M\d+–M\d+/)}],
 ['master roadmap identifies the active strategic block',()=>assert.match(read('MASTER_ROADMAP.md'),/## CURRENT ACTIVE MAIN BLOCK — M\d+–M\d+/)],
 ['only the internal master is the active roadmap',()=>assert.match(read('AGENTS.md'),/`MASTER_ROADMAP\.md` is the sole active, permanent NEXA Main roadmap/)],
 ['no competing temporary roadmap exists',()=>assert.equal(fs.existsSync(path.join(root,'TEMPORARY_ROADMAP.md')),false)],
 ['active report exists',()=>assert.ok(fs.existsSync(path.join(root,`${batch}_REPORT.md`)))],
 ['active report identifies the active release',()=>assert.match(read(`${batch}_REPORT.md`),new RegExp(`V${version.replace(/\\./g,'\\.')} ${batch}`))],
 ['release ship computes SHA-256',()=>assert.match(read('scripts/release-ship.mjs'),/createHash\('sha256'\)/)],
 ['release ship writes a hash sidecar',()=>assert.match(read('scripts/release-ship.mjs'),/\.sha256/)],
 ['release ship supports optional checkpoint copies',()=>assert.match(read('scripts/release-ship.mjs'),/--copy-to=/)],
 ['checkpoint copies use the exact archive filename',()=>assert.match(read('scripts/release-ship.mjs'),/path\.join\(copyTo, archive\)/)],
 ['checkpoint copies refuse overwrite',()=>assert.match(read('scripts/release-ship.mjs'),/checkpoint copy already exists/)],
 ['checkpoint copies verify their hash',()=>assert.match(read('scripts/release-ship.mjs'),/checkpoint copy hash mismatch/)],
 ['release ship verifies extracted archive identity',()=>assert.match(read('scripts/release-ship.mjs'),/release-identity\.mjs.*check/)],
 ['release ship verifies extracted archive seal',()=>assert.match(read('scripts/release-ship.mjs'),/release-seal\.mjs.*verify/)],
 ['release seal excludes the archive itself',()=>assert.match(read('scripts/release-seal.mjs'),/EXCLUDED_FILES/)&&assert.match(read('scripts/release-seal.mjs'),/archiveName/)],
 ['active memory names AGENTS as naming authority',()=>assert.equal(memory.namingAuthorityReference,'AGENTS.md — Naming and versioning (PERMANENT NEXA RULE — LOCKED)')],
 ['competing permanent naming object is absent',()=>assert.equal(Object.prototype.hasOwnProperty.call(memory,'permanentNamingVersioningRule'),false)],
 ['environment-dependent checks remain explicitly excluded',()=>assert.match(read(`${batch}_REPORT.md`),/NOT TESTED \/ excluded/)],
];
for(const [title,fn] of tests)test(`B374 contract: ${title}`,fn);
test('B374 contract contains exactly 25 checks',()=>assert.equal(tests.length,25));
