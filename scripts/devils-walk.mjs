#!/usr/bin/env node
// NEXA Devil's Walk: the in-depth FULL SWEEP (find only, never repairs).
//   npm run walk                 quick sweep: identity, syntax, imports, routes, TypeScript syntax
//   npm run walk -- --block     verifies only the CURRENT ordered product block (preferred development path)
//   npm run walk -- --tests      full native server test sweep; release-gate use only, not the block workflow
//   npm run walk -- --json       machine-readable result on stdout
// It defines no naming/versioning rule. It only reads files and runs the existing authority scripts.
// Findings are BLOCKER (must be fixed or recorded as blocked) or ADVISORY (look, but never fails a gate).
import { spawnSync, spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import vm from 'node:vm';
import path from 'node:path';

const root = process.env.NEXA_ROOT ? path.resolve(process.env.NEXA_ROOT) : process.cwd();
const args = new Set(process.argv.slice(2));
const withTests = args.has('--tests');
const blockMode = args.has('--block');
const asJson = args.has('--json');
const fast = args.has('--fast'); // skips the TypeScript syntax walk (used by tests that already run under a time limit)
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.expo']);
// Files that need dotenv/better-sqlite3 or a CI environment. Parked as external in the roadmap; never counted as blockers.
const PARKED = [/b144_/, /v5_98_48/, /v5_71_0/, /b91_repair1/];


if (blockMode) {
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'block-walk.mjs'), 'verify'], {
    cwd: root, encoding: 'utf8', maxBuffer: 1 << 26, env: { ...process.env, NEXA_ROOT: root }
  });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  process.exit(r.status ?? 1);
}

const walk = (dir, exts, out = []) => {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, exts, out); else if (exts.some(x => e.name.endsWith(x))) out.push(p);
  }
  return out;
};
const rel = p => path.relative(root, p).split(path.sep).join('/');
const findings = [];
const add = (severity, area, file, message) => findings.push({ severity, area, file, message });
const stats = {};

// 1. identity (authority script; this file never reads or writes version rules itself)
{
  const r = spawnSync(process.execPath, [path.join(root, 'scripts', 'release-identity.mjs'), 'check'], { cwd: root, encoding: 'utf8', env: { ...process.env, NEXA_ROOT: root } });
  stats.identity = r.status === 0 ? 'PASS' : 'FAIL';
  if (r.status !== 0) add('BLOCKER', 'identity', 'scripts/release-identity.mjs', ((r.stderr || '') + (r.stdout || '')).trim().split('\n').slice(-3).join(' | '));
}

// 2. JavaScript syntax sweep (server + scripts + root config)
{
  const files = [...walk(path.join(root, 'server'), ['.js', '.mjs', '.cjs']), ...walk(path.join(root, 'scripts'), ['.js', '.mjs', '.cjs'])];
  let bad = 0, next = 0;
  // CommonJS files are checked in-process (fast); ES module files (.mjs) use `node --check`, which is the only exact way.
  const cjs = files.filter(f => !f.endsWith('.mjs'));
  const esm = files.filter(f => f.endsWith('.mjs'));
  const MODULE_SYNTAX = /Cannot use import statement|Unexpected token 'export'|import\.meta|Cannot use 'import\.meta'|await is only valid/;
  for (const f of cjs) {
    let src = fs.readFileSync(f, 'utf8');
    if (src.startsWith('#!')) src = '//' + src;
    try { new vm.Script('(function (exports, require, module, __filename, __dirname) {' + src + '\n})', { filename: f }); }
    catch (e) {
      const msg = String(e && e.message || e);
      if (MODULE_SYNTAX.test(msg)) { esm.push(f); continue; } // a .js file written as an ES module: let node decide
      bad++; add('BLOCKER', 'syntax', rel(f), msg.slice(0, 160));
    }
  }
  // `node --check` cannot judge an ES-module-style .js file (it exits 0 even with a real error), so such a file is
  // copied to a temporary .mjs and checked as a module.
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-walk-'));
  let tmpN = 0;
  const check = f => new Promise(res => { let err = ''; let target = f; if (!f.endsWith('.mjs')) { target = path.join(tmpDir, `m${tmpN++}.mjs`); fs.copyFileSync(f, target); } const c = spawn(process.execPath, ['--check', target], { stdio: ['ignore', 'ignore', 'pipe'] }); c.stderr.on('data', d => { err += d; }); c.on('close', code => res({ f, code, err })); });
  const worker = async () => { while (next < esm.length) { const r = await check(esm[next++]); if (r.code !== 0) { bad++; add('BLOCKER', 'syntax', rel(r.f), r.err.split('\n').find(l => /Error/.test(l)) || 'syntax error'); } } };
  await Promise.all(Array.from({ length: 8 }, worker));
  fs.rmSync(tmpDir, { recursive: true, force: true });
  stats.jsSyntax = `${files.length - bad}/${files.length}`;
}

// 3. TypeScript syntax walk (TS1xxx only; a full typecheck needs node_modules and is reported as NOT RUN here)
{
  const local = path.join(root, 'node_modules', '.bin', 'tsc');
  const tsc = fs.existsSync(local) ? local : (spawnSync('tsc', ['-v'], { encoding: 'utf8' }).status === 0 ? 'tsc' : null);
  const files = walk(path.join(root, 'src'), ['.ts', '.tsx']);
  if (fast) { stats.tsSyntax = 'SKIPPED (--fast)'; }
  else if (!tsc) { stats.tsSyntax = 'NOT RUN (no tsc)'; }
  else {
    const r = spawnSync(tsc, ['--noEmit', '--ignoreConfig', '--noResolve', '--skipLibCheck', '--jsx', 'preserve', '--target', 'es2020', '--module', 'esnext', ...files], { cwd: root, encoding: 'utf8', maxBuffer: 1 << 28 });
    const lines = ((r.stdout || '') + (r.stderr || '')).split('\n').filter(l => /error TS1\d{3}:/.test(l));
    for (const l of lines) add('BLOCKER', 'typescript-syntax', l.split('(')[0], l.slice(0, 200));
    stats.tsSyntax = lines.length ? `${lines.length} syntax errors` : `PASS (${files.length} files)`;
    stats.typecheck = fs.existsSync(path.join(root, 'node_modules')) ? 'run npm run typecheck' : 'NOT RUN (no node_modules)';
  }
}

// 4. relative imports in src must resolve
const srcFiles = walk(path.join(root, 'src'), ['.ts', '.tsx', '.js', '.jsx']);
{
  const exts = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx', '/index.js'];
  const re = /(?:from\s+|import\s+|require\()\s*['"](\.{1,2}\/[^'"]+)['"]/g;
  let n = 0, bad = 0;
  for (const f of srcFiles) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(re)) {
      n++;
      const base = path.resolve(path.dirname(f), m[1]);
      if (!exts.some(x => fs.existsSync(base + x) && fs.statSync(base + x).isFile())) { bad++; add('BLOCKER', 'imports', rel(f), `import "${m[1]}" does not resolve`); }
    }
  }
  stats.relativeImports = `${n - bad}/${n}`;
}

// 5. static router targets must land on a real route file under src/app
{
  const appDir = path.join(root, 'src', 'app');
  const re = /(?:router\.(?:push|replace)|href=)\s*\(?\{?\s*(?:pathname:\s*)?['"`](\/[^'"`$?]*)/g;
  const has = p => [p + '.tsx', p + '/index.tsx', p + '.ts'].some(x => fs.existsSync(x));
  const resolveRoute = r => {
    if (r === '/' ) return true;
    const segs = r.split('/').filter(Boolean);
    const walkSeg = (dir, i) => {
      if (i === segs.length) return has(path.join(dir, 'index')) || fs.existsSync(path.join(dir, 'index.tsx'));
      const seg = segs[i];
      const lit = path.join(dir, seg);
      if (i === segs.length - 1 && has(lit)) return true;
      if (fs.existsSync(lit) && fs.statSync(lit).isDirectory() && walkSeg(lit, i + 1)) return true;
      // route groups such as (tabs) are real folders; dynamic segments are [param] files/folders
      if (!fs.existsSync(dir)) return false;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (/^\[.+\]/.test(e.name.replace(/\.tsx?$/, ''))) {
          if (e.isDirectory() && walkSeg(path.join(dir, e.name), i + 1)) return true;
          if (!e.isDirectory() && i === segs.length - 1) return true;
        }
      }
      return false;
    };
    return walkSeg(appDir, 0);
  };
  let n = 0, bad = 0;
  for (const f of srcFiles) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(re)) {
      const r = m[1].replace(/\/$/, '') || '/';
      n++;
      if (!resolveRoute(r)) { bad++; add('BLOCKER', 'routes', rel(f), `router target "${m[1]}" has no route file under src/app`); }
    }
  }
  stats.routeTargets = `${n - bad}/${n}`;
}

// 6. advisory: a border colour with no border width in the same small style object (the border would not draw)
{
  let n = 0;
  for (const f of srcFiles) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/\{[^{}]*\}/g)) {
      const t = m[0];
      if (/border(Top|Bottom|Left|Right)?Color\s*:/.test(t) && !/border(Top|Bottom|Left|Right|Start|End|Horizontal|Vertical)?Width\s*:/.test(t) && !t.includes('...')) {
        n++;
        if (n <= 30) add('ADVISORY', 'borders', `${rel(f)}:${s.slice(0, m.index).split('\n').length}`, 'borderColor without a width in the same object (fine when it overrides a base style that has one)');
      }
    }
  }
  stats.borderCandidates = n;
}

// 7. optional: full server test sweep
const finish = () => {
  const blockers = findings.filter(f => f.severity === 'BLOCKER');
  const result = { blockers: blockers.length, advisories: findings.length - blockers.length, stats, findings };
  const out = path.join(os.tmpdir(), 'nexa-walk-findings.json');
  try { fs.writeFileSync(out, JSON.stringify(result, null, 2)); } catch { /* best effort */ }
  if (asJson) console.log(JSON.stringify(result));
  else {
    console.log("DEVIL'S WALK (full sweep, find only)");
    for (const [k, v] of Object.entries(stats)) console.log(`  ${k}: ${v}`);
    for (const f of blockers) console.log(`  BLOCKER [${f.area}] ${f.file} — ${f.message}`);
    console.log(`  advisories: ${result.advisories} (details in ${out})`);
    console.log(blockers.length ? `WALK FOUND ${blockers.length} BLOCKER(S)` : 'WALK CLEAN (no blockers)');
  }
  process.exit(blockers.length ? 1 : 0);
};

if (!withTests) finish();
else {
  const files = walk(path.join(root, 'server'), ['.test.js']);
  // The old implementation spawned one Node process per test file. With 500+
  // files, even a bounded worker pool spent most of the sweep paying process
  // startup cost and could exceed the session timeout. Node's native test
  // runner already provides bounded concurrency and per-test timeouts, while
  // preserving the complete file set. Use it as one sweep process instead.
  const concurrency = Math.min(32, Math.max(8, (os.cpus()?.length || 8) * 2));
  const timeoutMs = 60000;
  const r = spawnSync(process.execPath, [
    '--test', '--test-force-exit',
    `--test-concurrency=${concurrency}`,
    '--test-timeout=20000',
    ...files
  ], {
    cwd: root,
    env: { ...process.env, NEXA_ROOT: root },
    encoding: 'utf8',
    timeout: timeoutMs,
    maxBuffer: 1 << 28
  });

  const output = `${r.stdout || ''}\n${r.stderr || ''}`;
  const failed = [];
  const notOkRe = /^not ok \d+ - .*$/gm;
  for (const m of output.matchAll(notOkRe)) {
    const tail = output.slice(m.index, Math.min(output.length, m.index + 6000));
    const location = tail.match(/\n\s*location: ['"]([^'"\n]+)['"]/);
    const fileMatch = location && location[1].match(/(?:^|[\\/])(server[\\/][^:'"]+?\.test\.js)(?::\d+)?$/);
    failed.push(fileMatch ? fileMatch[1].replaceAll('\\', '/') : (location?.[1] || 'server/test-runner'));
  }

  const parked = [...new Set(failed)].filter(f => PARKED.some(p => p.test(f)));
  const actionable = [...new Set(failed)].filter(f => !parked.includes(f));
  for (const f of actionable) add('BLOCKER', 'tests', f, 'test case fails in the native full sweep');
  if (r.error && r.error.code === 'ETIMEDOUT') add('BLOCKER', 'tests', 'server/*.test.js', `native test sweep exceeded ${timeoutMs} ms`);
  if (r.status === null && !r.error) add('BLOCKER', 'tests', 'server/*.test.js', 'native test sweep terminated without an exit status');

  const summary = output.match(/# tests (\d+)\n# suites (\d+)\n# pass (\d+)\n# fail (\d+)\n# cancelled (\d+)\n# skipped (\d+)\n# todo (\d+)\n# duration_ms ([\d.]+)/);
  stats.testWorkers = concurrency;
  stats.testFiles = `${files.length} files loaded by native runner`;
  stats.testCases = summary ? `${summary[3]}/${summary[1]} pass; ${summary[4]} fail; ${summary[5]} cancelled; ${summary[6]} skipped` : (r.error?.code === 'ETIMEDOUT' ? `TIMEOUT after ${timeoutMs} ms` : 'NOT RUN');
  stats.testDurationMs = summary ? Number(summary[8]) : null;
  stats.parkedExternalFails = parked.length;
  if (r.status !== 0 && !failed.length && !r.error) add('BLOCKER', 'tests', 'server/*.test.js', `native test runner exited with status ${r.status}`);
  finish();
}
