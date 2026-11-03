import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('B410 canonical environment contract owns HTTPS validation', () => {
  const env = read('scripts/production-env-contract.mjs');
  const candidate = read('scripts/launch-candidate-report.mjs');
  const handoff = read('scripts/launch-handoff-report.mjs');
  assert.match(env, /function inspectProductionEnvironment/);
  assert.match(env, /const isHttpsUrl/);
  assert.match(candidate, /isHttpsUrl/);
  assert.match(handoff, /isHttpsUrl/);
  assert.doesNotMatch(candidate, /const httpsUrl/);
  assert.doesNotMatch(handoff, /const https =/);
});

test('B410 production environment summaries remain secret-safe', () => {
  const env = read('scripts/production-env-contract.mjs');
  assert.match(env, /renderSafeSummary/);
  assert.doesNotMatch(env, /console\.log\([^\n]*(value\(|process\.env)/);
  assert.match(env, /return result\.checks\.map/);
  assert.doesNotMatch(env, /c\.value|c\.rawValue|c\.secretValue/);
});

test('B410 launch reports never print owner-supplied URL values', () => {
  const reports = read('scripts/launch-candidate-report.mjs') + read('scripts/launch-handoff-report.mjs');
  assert.doesNotMatch(reports, /console\.log\([^\n]*(privacy|terms|api)\b/i);
  assert.doesNotMatch(reports, /process\.env\.[A-Z0-9_]+\s*\)/);
  assert.match(reports, /secretValuesIncluded: false/);
  assert.match(reports, /secretValuesIncluded|secretValuesIncluded/);
});

test('B410 demo mode cannot fall back to localhost in a production build', () => {
  const src = read('src/demoMode.tsx');
  assert.match(src, /import \{ API_BASE \} from '\.\/api'/);
  assert.match(src, /!NEXA_DEMO_MODE \|\| !API_BASE/);
});

test('B410 production API client remains fail-closed and credential-safe', () => {
  const api = read('src/api.ts');
  assert.match(api, /must be configured for production builds/);
  assert.match(api, /must use HTTPS in production builds/);
  assert.match(api, /must not contain embedded credentials/);
});

test('B410 legal links remain environment-driven and HTTPS governed', () => {
  const legal = read('src/legalLinks.ts');
  assert.match(legal, /EXPO_PUBLIC_PRIVACY_POLICY_URL/);
  assert.match(legal, /EXPO_PUBLIC_TERMS_URL/);
  assert.doesNotMatch(legal, /http:\/\/localhost/);
});

test('B410 Admin bootstrap remains server-only and hashed', () => {
  const bootstrap = read('server/adminBootstrap.js');
  assert.match(bootstrap, /NEXA_BOOTSTRAP_ADMIN_PASSWORD/);
  assert.match(bootstrap, /hashPasswordSync/);
  assert.doesNotMatch(bootstrap, /localStorage|sessionStorage|AsyncStorage/);
});

test('B410 Admin and Staff creation never return plaintext passwords', () => {
  const ops = read('server/adminOps.js');
  const staff = read('server/adminStaffWork.js');
  assert.match(ops, /hashPasswordSync\(password\)/);
  assert.match(staff, /hashPasswordSync\(password\)/);
  assert.doesNotMatch(ops + staff, /json\([^\n]*password\s*:/i);
});

test('B410 destructive Admin operations retain owner permission boundaries', () => {
  const ops = read('server/adminOps.js');
  const access = read('server/adminAccess.js');
  assert.match(ops, /require\("users_remove"\)/);
  assert.match(ops, /require\("vendors_remove"\)/);
  assert.match(access, /users_remove/);
  assert.match(access, /vendors_remove/);
});

test('B410 version metadata stays synchronized and roadmap authority remains internal', () => {
  const version = read('VERSION.md');
  const roadmapCheck = read('scripts/roadmap-check.mjs');
  assert.match(version, /^# NEXA V\d+\.\d+\.\d+ B\d+/);
  assert.match(roadmapCheck, /MASTER_ROADMAP\.md/);
  assert.equal(fs.existsSync(path.join(root, 'MASTER_ROADMAP.md')), true);
});
