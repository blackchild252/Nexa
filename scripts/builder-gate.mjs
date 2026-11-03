import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const root = process.cwd();
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8' });
  return { status: result.status ?? 1, stdout: result.stdout || '', stderr: result.stderr || '' };
};

const checks = [];
const releaseGate = run(process.execPath, ['scripts/release-gate.mjs']);
checks.push({ name: 'application release gate', status: releaseGate.status === 0 ? 'PASS' : 'FAIL', detail: releaseGate.stdout.trim() });

const playwrightConfigured = fs.existsSync(path.join(root, 'playwright.config.js')) && /@playwright\/test/.test(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const playwrightPackage = (() => {
  try { require.resolve('@playwright/test', { paths: [root] }); return true; } catch { return false; }
})();
if (playwrightConfigured && playwrightPackage) {
  const playwright = run(process.execPath, ['node_modules/@playwright/test/cli.js', 'test']);
  checks.push({ name: 'Playwright', status: playwright.status === 0 ? 'PASS' : 'FAIL', detail: (playwright.stdout + playwright.stderr).trim() });
} else if (playwrightConfigured) {
  checks.push({ name: 'Playwright', status: 'BLOCKED', detail: 'Playwright is configured, but @playwright/test is not installed in this environment.' });
} else {
  checks.push({ name: 'Playwright', status: 'NOT_CONFIGURED', detail: 'Playwright package/configuration is not present.' });
}

const sentryCodeConfigured = fs.existsSync(path.join(root, 'server/sentry.js')) && /@sentry\/node/.test(fs.readFileSync(path.join(root, 'server/package.json'), 'utf8')) && fs.existsSync(path.join(root, 'src/sentry.ts')) && /@sentry\/react-native/.test(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const sentryConnected = Boolean(String(process.env.SENTRY_DSN || '').trim());
checks.push({
  name: 'Sentry',
  status: sentryConnected ? 'PASS' : (sentryCodeConfigured ? 'BLOCKED' : 'NOT_CONFIGURED'),
  detail: sentryConnected ? 'Sentry credentials/configuration detected; runtime event review remains environment-specific.' : (sentryCodeConfigured ? 'Sentry integration is wired but no real DSN/project credentials are supplied in this environment.' : 'Sentry integration is not configured.')
});

const memory = JSON.parse(fs.readFileSync(path.join(root, 'PROJECT_MEMORY.json'), 'utf8'));
checks.push({ name: 'project memory', status: memory.currentVersion ? 'PASS' : 'FAIL', detail: `Current version ${memory.currentVersion}` });

console.log(JSON.stringify({ version: memory.currentVersion, checks }, null, 2));
if (checks.some((check) => check.status === 'FAIL')) process.exit(1);
