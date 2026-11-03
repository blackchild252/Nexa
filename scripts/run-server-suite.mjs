import { spawn } from 'node:child_process';
import { createWriteStream, readFileSync, readdirSync, mkdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const serverDir = path.join(root, 'server');
const files = readdirSync(serverDir)
  .filter((name) => name.endsWith('.test.js'))
  .sort()
  .map((name) => path.join('server', name));
const logPath = process.env.NEXA_TEST_LOG || path.join(os.tmpdir(), 'nexa-main-server-suite.tap');
const timeoutMs = Number.parseInt(process.env.NEXA_TEST_TIMEOUT_MS || '120000', 10);
const suiteTimeoutMs = Number.parseInt(process.env.NEXA_TEST_SUITE_TIMEOUT_MS || '900000', 10);
const concurrency = Number.parseInt(process.env.NEXA_TEST_CONCURRENCY || '2', 10);

if (!Number.isInteger(timeoutMs) || timeoutMs < 1) {
  console.error('NEXA_TEST_TIMEOUT_MS must be a positive integer.');
  process.exit(2);
}
if (!Number.isInteger(suiteTimeoutMs) || suiteTimeoutMs < 1) {
  console.error('NEXA_TEST_SUITE_TIMEOUT_MS must be a positive integer.');
  process.exit(2);
}
if (!Number.isInteger(concurrency) || concurrency < 1) {
  console.error('NEXA_TEST_CONCURRENCY must be a positive integer.');
  process.exit(2);
}
if (files.length === 0) {
  console.error(`No server test files found in ${serverDir}`);
  process.exit(2);
}

mkdirSync(path.dirname(logPath), { recursive: true });
const log = createWriteStream(logPath, { flags: 'w' });
const child = spawn(process.execPath, [
  '--test',
  '--test-force-exit',
  `--test-concurrency=${concurrency}`,
  `--test-timeout=${timeoutMs}`,
  ...files,
], { cwd: root, env: process.env, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32' });

child.stdout.pipe(log, { end: false });
child.stderr.pipe(log, { end: false });
let finished = false;
let suiteTimedOut = false;
let forceKillTimer = null;
let killGraceFinished = false;
let exitAfterSummary = null;
const suiteTimer = setTimeout(() => {
  suiteTimedOut = true;
  console.error(`Server test suite exceeded ${suiteTimeoutMs} ms; terminating test runner.`);
  const terminate = signal => {
    if (process.platform !== 'win32' && child.pid) { try { process.kill(-child.pid, signal); return; } catch {} }
    try { child.kill(signal); } catch {}
  };
  terminate('SIGTERM');
  forceKillTimer = setTimeout(() => { terminate('SIGKILL'); killGraceFinished = true; if (exitAfterSummary) exitAfterSummary(); }, 5000);
}, suiteTimeoutMs);
function finish(code, signal) {
  if (finished) return;
  finished = true;
  clearTimeout(suiteTimer);
  if (forceKillTimer && !suiteTimedOut) clearTimeout(forceKillTimer);
  log.end(() => {
    let output = '';
    try { output = readFileSync(logPath, 'utf8'); } catch {}
    const summary = [...output.matchAll(/^# (tests|pass|fail|skipped|duration_ms) (.+)$/gm)];
    const last = new Map();
    for (const [, key, value] of summary) last.set(key, value);
    console.log(`Main server suite: ${files.length} test files`);
    console.log(`Per-test timeout: ${timeoutMs} ms`);
    console.log(`Test-file concurrency: ${concurrency}`);
    console.log(`Suite timeout: ${suiteTimeoutMs} ms${suiteTimedOut ? ' (EXCEEDED)' : ''}`);
    for (const key of ['tests', 'pass', 'fail', 'skipped', 'duration_ms']) {
      if (last.has(key)) console.log(`${key}: ${last.get(key)}`);
    }
    const failedBlocks = [...output.matchAll(/^not ok \d+ - (.+)$/gm)].map((m, i, all) => { const start = m.index; const end = i + 1 < all.length ? all[i + 1].index : output.length; return { name: m[1], body: output.slice(start, end) }; });
    const failed = failedBlocks.map(x => x.name);
    const dependencyFailures = failedBlocks.filter(x => /Cannot find module|ERR_MODULE_NOT_FOUND|MODULE_NOT_FOUND|Cannot find package/.test(x.body));
    const productFailures = failedBlocks.filter(x => !dependencyFailures.includes(x));
    const missing = new Map();
    for (const [, name] of output.matchAll(/Cannot find module '([^']+)'/g)) missing.set(name, (missing.get(name) || 0) + 1);
    const skippedNames = [...output.matchAll(/^# Subtest: (.+)\n(?:.*\n){0,4}?# (?:SKIP|TODO)(?: (.*))?$/gm)].map(m => ({ name: m[1], reason: m[2] || '' }));
    const dependencySkips = skippedNames.filter(x => /dependenc|module|package|not installed|unavailable/i.test(`${x.name} ${x.reason}`));
    console.log(`Failure classification: dependency-related failed tests=${dependencyFailures.length}; other failed tests=${productFailures.length}; distinct missing modules=${missing.size}`);
    if (dependencyFailures.length) { console.log('Dependency-related failed tests:'); for (const x of dependencyFailures.slice(0, 40)) console.log(`- ${x.name}`); }
    if (productFailures.length) { console.log('Product/other failed tests:'); for (const x of productFailures.slice(0, 40)) console.log(`- ${x.name}`); }
    console.log(`Dependency-related skipped tests (identified by TAP reason): ${dependencySkips.length}`);
    if (failed.length) {
      console.log('Failed tests:');
      for (const name of [...new Set(failed)].slice(0, 40)) console.log(`- ${name}`);
      if (new Set(failed).size > 40) console.log(`- … ${new Set(failed).size - 40} additional failures`);
      if (missing.size) {
        console.log('Missing-module failure summary:');
        for (const [name, count] of [...missing].sort((a, b) => b[1] - a[1])) console.log(`- ${name}: ${count} load failure(s)`);
      }
      const syntax = [...new Set([...output.matchAll(/SyntaxError: ([^\n]+)/g)].map((m) => m[1]))];
      if (syntax.length) {
        console.log('Syntax-error summary:');
        for (const message of syntax) console.log(`- ${message}`);
      }
    }
    console.log(`Full TAP log: ${logPath}`);
    if (signal) console.error(`Test process signal: ${signal}`);
    const exitCode = suiteTimedOut ? 124 : (code === 0 ? 0 : (code || 1));
    // Test files may leave unrelated handles alive. Once the runner child has closed
    // and the TAP log is fully written, terminate this wrapper explicitly.
    const exitNow = () => {
      let exited = false;
      const terminate = () => { if (!exited) { exited = true; process.exit(exitCode); } };
      const watchdog = setTimeout(terminate, 1000);
      process.stdout.write('', () => { clearTimeout(watchdog); terminate(); });
    };
    if (suiteTimedOut && !killGraceFinished) exitAfterSummary = exitNow;
    else exitNow();
  });
}
child.on('error', (error) => {
  log.write(`\nRunner error: ${error.stack || error}\n`);
  finish(1, null);
});
child.on('close', finish);
