#!/usr/bin/env node
// NEXA release identity authority.
//
//   node scripts/release-identity.mjs check            verify every identity location agrees (version-agnostic)
//   node scripts/release-identity.mjs bump [--dry-run] apply the locked rule: base-100 version increment, Batch+1, build code+1, everywhere
//   node scripts/release-identity.mjs sync-docs         write the current state into the README and LAUNCH_HANDOFF headings (bump runs it)
//
// Implements the locked naming rule in AGENTS.md; it does not define a competing rule.
// Source of truth for "current": package.json version, PROJECT_MEMORY.json currentBatch, app.json build code.
import fs from 'node:fs';
import path from 'node:path';

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const P = (...a) => path.join(root, ...a);
const read = p => fs.readFileSync(P(p), 'utf8');
const readJson = p => JSON.parse(read(p));
const writeText = (p, s) => fs.writeFileSync(P(p), s);
const writeJson = (p, o, trailing = true) => writeText(p, JSON.stringify(o, null, 2) + (trailing ? '\n' : ''));

const PACKAGE_NAME = 'com.aami.nexa';
// Build code and Batch move together by exactly +1, so their difference never changes.
// (B252 / 6071 => 5819.) If this ever fails, someone advanced one without the other.
const BUILD_MINUS_BATCH = 5819;
const SRC_CONSTANTS = [
  ['src/theme.ts', /(release:\s*')(\d+\.\d+\.\d+)(')/],
  ['src/homeDesign.ts', /(HOME_DESIGN_RELEASE\s*=\s*')(\d+\.\d+\.\d+)(')/],
  ['src/subscriptionCentre.ts', /(SUBSCRIPTION_CENTRE_RELEASE\s*=\s*')(\d+\.\d+\.\d+)(')/],
];

function current() {
  const version = readJson('package.json').version;
  const batch = readJson('PROJECT_MEMORY.json').currentBatch;
  const buildCode = readJson('app.json').expo.android.versionCode;
  return { version, batch, buildCode };
}

function collectProblems() {
  const problems = [];
  const { version, batch, buildCode } = current();
  if (!/^\d+\.\d+\.\d+$/.test(version)) problems.push(`package.json version "${version}" is not major.minor.patch`);
  if (!/^B\d+$/.test(String(batch))) problems.push(`PROJECT_MEMORY currentBatch "${batch}" is not B<number>`);
  if (!Number.isInteger(buildCode)) problems.push('app.json android versionCode is not an integer');
  if (problems.length) return problems;
  const batchNo = Number(batch.slice(1));
  if (buildCode - batchNo !== BUILD_MINUS_BATCH) problems.push(`build code ${buildCode} and Batch ${batch} are out of step (expected build - batch = ${BUILD_MINUS_BATCH}, got ${buildCode - batchNo})`);

  const app = readJson('app.json'); const e = app.expo;
  const versions = {
    'app.json expo.version': e.version,
    'app.json expo.android.version': e.android?.version,
    'app.json expo.ios.version': e.ios?.version,
    'app.json expo.extra.nexaVersion': e.extra?.nexaVersion, 'app.json expo.extra.versionName': e.extra?.versionName,
    'app.json expo.extra.version': e.extra?.version, 'app.json version': app.version,
    'server/package.json version': readJson('server/package.json').version,
    'package-lock.json version': readJson('package-lock.json').version,
    'package-lock.json packages[""].version': readJson('package-lock.json').packages?.['']?.version,
    'server/releaseIdentity.json version': readJson('server/releaseIdentity.json').version,
    'PROJECT_MEMORY currentVersion': readJson('PROJECT_MEMORY.json').currentVersion,
    'PROJECT_MEMORY latestRelease': readJson('PROJECT_MEMORY.json').latestRelease,
    'PROJECT_MEMORY version': readJson('PROJECT_MEMORY.json').version,
  };
  for (const [file, re] of SRC_CONSTANTS) { const m = re.exec(read(file)); versions[`${file} release constant`] = m ? m[2] : undefined; }
  for (const [k, v] of Object.entries(versions)) if (v !== version) problems.push(`${k} is ${JSON.stringify(v)}, expected ${version}`);

  const codes = {
    'app.json expo.android.versionCode': e.android?.versionCode, 'app.json expo.ios.buildNumber': Number(e.ios?.buildNumber),
    'app.json expo.extra.versionCode': e.extra?.versionCode, 'app.json versionCode': app.versionCode,
    'server/releaseIdentity.json buildCode': readJson('server/releaseIdentity.json').buildCode,
  };
  for (const [k, v] of Object.entries(codes)) if (v !== buildCode) problems.push(`${k} is ${JSON.stringify(v)}, expected ${buildCode}`);
  if (typeof e.ios?.buildNumber !== 'string') problems.push('app.json expo.ios.buildNumber must be a string');

  const mem = readJson('PROJECT_MEMORY.json');
  if (mem.releaseArchive !== `NEXA-MAIN-V${version}.zip`) problems.push(`PROJECT_MEMORY releaseArchive is ${mem.releaseArchive}, expected NEXA-MAIN-V${version}.zip`);
  if (readJson('server/releaseIdentity.json').batch !== batch) problems.push('server/releaseIdentity.json batch drift');
  if (e.android?.package !== PACKAGE_NAME) problems.push(`android package must stay ${PACKAGE_NAME}`);
  if (e.ios?.bundleIdentifier && e.ios.bundleIdentifier !== PACKAGE_NAME) problems.push(`iOS bundleIdentifier must stay ${PACKAGE_NAME}`);

  // EAS must never move the build code on its own: with a local version source, autoIncrement rewrites app.json.
  if (fs.existsSync(P('eas.json'))) {
    const eas = readJson('eas.json');
    if (eas.cli?.appVersionSource !== 'local') problems.push('eas.json cli.appVersionSource must be "local" (the build code is owned by release:bump)');
    for (const [name, prof] of Object.entries(eas.build ?? {})) if (prof?.autoIncrement) problems.push(`eas.json build.${name}.autoIncrement must not be enabled (it would change the build code outside release:bump)`);
  }

  const state = `V${version} ${batch}`;
  const agents = read('AGENTS.md');
  if (!agents.includes(`Current state: **${state}** (build code ${buildCode})`)) problems.push(`AGENTS.md "Current state" is not ${state} (build code ${buildCode})`);
  if (!agents.includes(`Current project state: **${state}**`)) problems.push('AGENTS.md "Current project state" drift');
  if (!read('VERSION.md').startsWith(`# NEXA ${state}`)) problems.push(`VERSION.md heading is not "# NEXA ${state}"`);
  if (!read('VERSION.md').includes(`**Android versionCode / iOS buildNumber:** ${buildCode}`)) problems.push('VERSION.md build code drift');
  const handoffHeads = [...read('LAUNCH_HANDOFF.md').matchAll(/^## (V\d+\.\d+\.\d+ B\d+)\s*$/gm)].map(m => m[1]);
  if (handoffHeads[handoffHeads.length - 1] !== state) problems.push(`LAUNCH_HANDOFF.md latest release section is ${handoffHeads[handoffHeads.length - 1]}, expected ${state}`);
  for (const f of fs.readdirSync(root)) if (/^NEXA-.*-B\d+.*\.zip$/.test(f)) problems.push(`archive name must not carry Batch/stage words: ${f}`);
  return problems;
}

function check() {
  const problems = collectProblems();
  const c = problems.length ? null : current();
  if (problems.length) { console.error('RELEASE IDENTITY FAILED'); problems.forEach(p => console.error('- ' + p)); process.exit(1); }
  console.log(`RELEASE IDENTITY PASS — V${c.version} ${c.batch} (build ${c.buildCode}) — archive NEXA-MAIN-V${c.version}.zip`);
}

function replaceAllStrings(node, from, to) {
  if (typeof node === 'string') return node.split(from).join(to);
  if (Array.isArray(node)) return node.map(x => replaceAllStrings(x, from, to));
  if (node && typeof node === 'object') { for (const k of Object.keys(node)) node[k] = replaceAllStrings(node[k], from, to); }
  return node;
}

// Headings that carry the current state outside the identity files. The bump writes them, so nobody types a version by hand.
function syncDocs() {
  const cur = current();
  const state = `V${cur.version} ${cur.batch}`;
  if (fs.existsSync(P('README.md'))) {
    const lines = read('README.md').split('\n');
    lines[0] = lines[0].replace(/^# NEXA — Current status \(V\d+\.\d+\.\d+ B\d+\)/, `# NEXA — Current status (${state})`);
    for (let i = 1; i < Math.min(lines.length, 6); i++) {
      if (!/^Start here:/.test(lines[i])) continue;
      lines[i] = lines[i].replace(/`B\d+_REPORT\.md`/, `\`${cur.batch}_REPORT.md\``)
        .replace(/Current checkpoint: \*\*V\d+\.\d+\.\d+ B\d+ \/ build \d+\*\*/, `Current checkpoint: **${state} / build ${cur.buildCode}**`);
    }
    writeText('README.md', lines.join('\n'));
  }
  if (fs.existsSync(P('LAUNCH_HANDOFF.md'))) {
    const hand = read('LAUNCH_HANDOFF.md');
    const heading = `# NEXA launch hand-off — ${state}`;
    if (hand.split('\n', 1)[0].trim() !== heading) {
      writeText('LAUNCH_HANDOFF.md', `${heading}\n\n- **Current release:** ${state}; build identity ${cur.buildCode}. The notes for this release are in the \`## ${state}\` section at the end of this file.\n\n---\n\n${hand}`);
    }
  }
}

function bump(dry) {
  const before = collectProblems();
  if (before.length) { console.error('Refusing to bump: current identity is already inconsistent.'); before.forEach(p => console.error('- ' + p)); process.exit(1); }
  const cur = current();
  const [maj, min, pat] = cur.version.split('.').map(Number);
  let nMaj = maj, nMin = min, nPat = pat + 1;
  if (nPat >= 100) { nPat = 0; nMin += 1; }
  if (nMin >= 100) { nMin = 0; nMaj += 1; }
  const next = { version: `${nMaj}.${nMin}.${nPat}`, batch: `B${Number(cur.batch.slice(1)) + 1}`, buildCode: cur.buildCode + 1 };
  if (fs.existsSync(P(`RELEASE_SEAL_V${next.version}.json`))) { console.error(`Refusing to bump: RELEASE_SEAL_V${next.version}.json already exists (sealed files are never overwritten).`); process.exit(1); }
  console.log(`${dry ? '[dry run] ' : ''}V${cur.version} ${cur.batch} (${cur.buildCode})  ->  V${next.version} ${next.batch} (${next.buildCode})`);
  if (dry) return;

  const oldState = `V${cur.version} ${cur.batch}`, newState = `V${next.version} ${next.batch}`;
  // app.json: every version string and every build code field
  const app = readJson('app.json'); const e = app.expo;
  for (const o of [e, e.android, e.ios, e.extra]) { if (!o) continue; for (const k of ['version', 'versionName', 'nexaVersion']) if (o[k] === cur.version) o[k] = next.version; }
  if (app.version === cur.version) app.version = next.version;
  e.android.versionCode = next.buildCode; e.ios.buildNumber = String(next.buildCode); e.extra.versionCode = next.buildCode; app.versionCode = next.buildCode;
  writeJson('app.json', app);
  // package files
  for (const f of ['package.json', 'server/package.json']) { const j = readJson(f); j.version = next.version; writeJson(f, j); }
  const lock = readJson('package-lock.json'); lock.version = next.version; if (lock.packages?.['']) lock.packages[''].version = next.version; writeJson('package-lock.json', lock);
  writeJson('server/releaseIdentity.json', next);
  // source constants
  for (const [file, re] of SRC_CONSTANTS) writeText(file, read(file).replace(re, `$1${next.version}$3`));
  // project memory (current-identity fields only; history entries of older versions are untouched)
  const mem = readJson('PROJECT_MEMORY.json');
  const walk = (o, key) => {
    if (typeof o === 'string') {
      if (o === cur.version && /^(currentVersion|latestRelease|version|projectVersion)$/.test(key)) return next.version;
      if (o === cur.batch && /^(currentBatch|batch|currentRun)$/.test(key)) return next.batch;
      return o.split(oldState).join(newState).split(`NEXA-MAIN-V${cur.version}.zip`).join(`NEXA-MAIN-V${next.version}.zip`);
    }
    if (Array.isArray(o)) return key === 'history' ? o : o.map(x => walk(x, key));
    if (o && typeof o === 'object') { for (const k of Object.keys(o)) o[k] = k === 'history' ? o[k] : walk(o[k], k); }
    return o;
  };
  writeJson('PROJECT_MEMORY.json', walk(mem, ''));
  // narrative status lines
  let agents = read('AGENTS.md');
  agents = agents.replace(`Current state: **${oldState}** (build code ${cur.buildCode})`, `Current state: **${newState}** (build code ${next.buildCode})`)
    .replace(`Current project state: **${oldState}**`, `Current project state: **${newState}**`)
    .replace(`Current project state is ${oldState}.`, `Current project state is ${newState}.`);
  writeText('AGENTS.md', agents);
  let ver = read('VERSION.md');
  ver = ver.replace(`# NEXA ${oldState}`, `# NEXA ${newState}`).replace(`**Current Version:** V${cur.version}`, `**Current Version:** V${next.version}`)
    .replace(`**Batch:** ${cur.batch}`, `**Batch:** ${next.batch}`).replace(`**Android versionCode / iOS buildNumber:** ${cur.buildCode}`, `**Android versionCode / iOS buildNumber:** ${next.buildCode}`)
    .replace(/\*\*Previous release:\*\*.*/, `**Previous release:** ${oldState} (${cur.buildCode})`);
  writeText('VERSION.md', ver);
  const hand = read('LAUNCH_HANDOFF.md').replace(/\s*$/, '') + `\n\n\n## ${newState}\n- Current release: ${newState}; build identity ${next.buildCode}.\n- (describe this release here)\n- Environment/device checks excluded.\n`;
  writeText('LAUNCH_HANDOFF.md', hand);
  syncDocs();

  const after = collectProblems();
  if (after.length) { console.error('Bump left drift (files may need manual review):'); after.forEach(p => console.error('- ' + p)); process.exit(1); }
  console.log(`BUMPED — all identity locations agree. Next: update VERSION.md summary, roadmap files and LAUNCH_HANDOFF note, then create the seal (npm run release:seal).`);
}


function normalizeOwnerRollover() {
  const cur = current();
  const [maj, min, pat] = cur.version.split('.').map(Number);
  if (![maj, min, pat].every(Number.isInteger) || maj < 0 || min < 0 || pat < 0) {
    console.error(`Cannot normalize malformed version: ${cur.version}`); process.exit(1);
  }
  if (min < 100 && pat < 100) {
    console.error(`No base-100 rollover is required for ${cur.version}.`); process.exit(1);
  }
  let nMaj = maj, nMin = min, nPat = pat;
  while (nPat >= 100) { nPat -= 100; nMin += 1; }
  while (nMin >= 100) { nMin -= 100; nMaj += 1; }
  const nextVersion = `${nMaj}.${nMin}.${nPat}`;
  if (fs.existsSync(P(`RELEASE_SEAL_V${nextVersion}.json`))) { console.error(`Refusing normalization: RELEASE_SEAL_V${nextVersion}.json already exists.`); process.exit(1); }
  console.log(`OWNER ROLLOVER — ${cur.version} ${cur.batch} (${cur.buildCode}) -> ${nextVersion} ${cur.batch} (${cur.buildCode})`);
  const oldVersion = cur.version;
  const app = readJson('app.json'); const e = app.expo;
  for (const o of [e, e.android, e.ios, e.extra]) { if (!o) continue; for (const k of ['version','versionName','nexaVersion']) if (o[k] === oldVersion) o[k] = nextVersion; }
  if (app.version === oldVersion) app.version = nextVersion;
  writeJson('app.json', app);
  for (const f of ['package.json','server/package.json']) { const j=readJson(f); j.version=nextVersion; writeJson(f,j); }
  const lock=readJson('package-lock.json'); lock.version=nextVersion; if(lock.packages?.['']) lock.packages[''].version=nextVersion; writeJson('package-lock.json',lock);
  writeJson('server/releaseIdentity.json', {...readJson('server/releaseIdentity.json'), version: nextVersion});
  for (const [file,re] of SRC_CONSTANTS) writeText(file, read(file).replace(re, `$1${nextVersion}$3`));
  const mem=readJson('PROJECT_MEMORY.json');
  const walk=(o,key)=>{
    if(typeof o==='string'){
      if(o===oldVersion && /^(currentVersion|latestRelease|version|projectVersion)$/.test(key)) return nextVersion;
      return o.split(`NEXA-MAIN-V${oldVersion}.zip`).join(`NEXA-MAIN-V${nextVersion}.zip`);
    }
    if(Array.isArray(o)) return key==='history'?o:o.map(x=>walk(x,key));
    if(o&&typeof o==='object'){for(const k of Object.keys(o)) if(k!=='history') o[k]=walk(o[k],k);}
    return o;
  };
  writeJson('PROJECT_MEMORY.json',walk(mem,''));
  let agents=read('AGENTS.md'); agents=agents.replace(/Current state: \*\*V\d+\.\d+\.\d+ B\d+\*\* \(build code \d+\)/,`Current state: **V${nextVersion} ${cur.batch}** (build code ${cur.buildCode})`).replace(/Current project state: \*\*V\d+\.\d+\.\d+ B\d+\*\*/,`Current project state: **V${nextVersion} ${cur.batch}**`); writeText('AGENTS.md',agents);
  let ver=read('VERSION.md'); ver=ver.replace(/^# NEXA V\d+\.\d+\.\d+ B\d+/m,`# NEXA V${nextVersion} ${cur.batch}`).replace(/\*\*Current Version:\*\* V\d+\.\d+\.\d+/g,`**Current Version:** V${nextVersion}`); writeText('VERSION.md',ver);
  let hand=read('LAUNCH_HANDOFF.md'); hand=hand.replace(/^## V\d+\.\d+\.\d+ B\d+$/m,`## V${nextVersion} ${cur.batch}`).replace(/Current release: V\d+\.\d+\.\d+ B\d+;/,`Current release: V${nextVersion} ${cur.batch};`); writeText('LAUNCH_HANDOFF.md',hand);
  const after=collectProblems(); if(after.length){console.error('Normalization left drift:'); after.forEach(x=>console.error('- '+x)); process.exit(1);} console.log(`NORMALIZED — ${nextVersion} ${cur.batch} (${cur.buildCode})`);
}

const cmd = process.argv[2] ?? 'check';
try {
  if (cmd === 'check') check();
  else if (cmd === 'bump') bump(process.argv.includes('--dry-run'));
  else if (cmd === 'rollover') normalizeOwnerRollover();
  else if (cmd === 'sync-docs') { syncDocs(); console.log('README and LAUNCH_HANDOFF headings agree with the current identity.'); }
  else { console.error('Usage: node scripts/release-identity.mjs <check|bump [--dry-run]|sync-docs|rollover>'); process.exit(2); }
} catch (error) {
  // A missing or broken project file ends the run with one short line, never a stack trace or an internal path.
  const why = error && error.code === 'ENOENT' ? 'a required project file is missing' : error instanceof SyntaxError ? 'a required project file is not valid JSON' : 'the project files could not be read';
  console.error(`RELEASE IDENTITY BLOCKED — ${why}. Run this from the project folder.`);
  process.exit(2);
}
