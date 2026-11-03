import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

const launch = read('scripts/launch-preflight.mjs');
const env = read('scripts/production-env-contract.mjs');
const candidate = read('scripts/launch-candidate-report.mjs');
const handoff = read('scripts/launch-handoff-report.mjs');
const bootstrap = read('server/adminBootstrap.js');
const ops = read('server/adminOps.js');
const staff = read('server/adminStaffWork.js');
const access = read('server/adminAccess.js');
const version = read('VERSION.md');
const roadmap = read('MASTER_ROADMAP.md');

test('B409 required public launch environment remains centralized', () => {
  for (const key of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_PRIVACY_POLICY_URL', 'EXPO_PUBLIC_TERMS_URL']) {
    assert.match(env, new RegExp(key));
  }
});

test('B409 launch remediation never prints secret values', () => {
  assert.match(launch, /never invents values/);
  assert.doesNotMatch(launch, /process\.env\.[A-Z0-9_]*(PASSWORD|SECRET|TOKEN|KEY)/);
  assert.doesNotMatch(launch, /console\.log\([^\n]*(PASSWORD|SECRET|TOKEN|KEY)/i);
});

test('B409 legal and API URLs remain HTTPS-gated', () => {
  assert.match(env, /https/);
  assert.match(read('src/api.ts'), /must use HTTPS in production builds/);
  assert.match(read('src/legalLinks.ts'), /EXPO_PUBLIC_PRIVACY_POLICY_URL/);
  assert.match(read('src/legalLinks.ts'), /EXPO_PUBLIC_TERMS_URL/);
});

test('B409 launch reports consume the same owner-supplied environment values', () => {
  for (const key of ['EXPO_PUBLIC_API_URL', 'EXPO_PUBLIC_PRIVACY_POLICY_URL', 'EXPO_PUBLIC_TERMS_URL']) {
    assert.match(candidate, new RegExp(key));
    assert.match(handoff, new RegExp(key));
  }
  assert.doesNotMatch(candidate + handoff, /YOUR_HTTPS_URL/);
});

test('B409 Admin bootstrap remains server-side and hashed', () => {
  assert.match(bootstrap, /NEXA_BOOTSTRAP_ADMIN_PASSWORD/);
  assert.match(bootstrap, /hashPasswordSync/);
  assert.doesNotMatch(bootstrap, /localStorage|sessionStorage|AsyncStorage/);
});

test('B409 Admin and Staff creation hash credentials and return no password field', () => {
  assert.match(ops, /hashPasswordSync\(password\)/);
  assert.match(staff, /hashPasswordSync\(password\)/);
  assert.doesNotMatch(ops, /res\.status\(201\)\.json\([^\n]*password\s*:/i);
  assert.doesNotMatch(staff, /res\.status\(201\)\.json\([^\n]*password\s*:/i);
});

test('B409 destructive Admin operations retain explicit permission boundaries', () => {
  assert.match(ops, /require\("users_remove"\)/);
  assert.match(ops, /require\("vendors_remove"\)/);
  assert.match(access, /users_remove/);
  assert.match(access, /vendors_remove/);
});

test('B409 Admin creation remains bounded to non-owner roles', () => {
  assert.match(ops, /reviewer.*support/);
  assert.match(ops, /Owners are set by the bootstrap owner/);
});

test('B409 Staff capabilities remain explicit and bounded', () => {
  assert.match(staff, /CAPABILITIES/);
  assert.match(staff, /new Set/);
  assert.match(staff, /Array\.isArray/);
});

test('B409 release identity and roadmap authority agree', () => {
  assert.match(version, /^# NEXA V\d+\.\d+\.\d+ B\d+/);
  assert.match(roadmap, /## CURRENT ACTIVE MAIN BLOCK — M\d+–M\d+/);
  assert.doesNotMatch(roadmap, /CURRENT ACTIVE (INDIVIDUAL )?MAIN (25-ROADMAP|BLOCK) — M5991–M6015/);
});
