const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const exists = file => fs.existsSync(path.join(root, file));
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const evidence = [
  ['M7126 owner-only operations', ['server/ownerAnalytics.contract.test.js','server/adminOps.js']],
  ['M7127 role boundaries', ['server/staff.js','server/b320_admin_verification.contract.test.js']],
  ['M7128 permission boundaries', ['server/adminAccess.js','server/platformReadiness.contract.test.js']],
  ['M7129 privilege escalation', ['server/v6_0_85_admin_security_center.contract.test.js','server/v6_0_86_webauthn.test.js']],
  ['M7130 audit role changes', ['server/b320_admin_verification.contract.test.js','server/adminOps.js']],
  ['M7131 audit account creation', ['server/staff.js','server/b320_admin_verification.contract.test.js']],
  ['M7132 action permissions', ['server/v6_0_85_admin_security_center.test.js','server/v6_1_50_privileged_action_confirmation.contract.test.js']],
  ['M7133 source permissions', ['server/platformIntegrationPolicy.contract.test.js','server/platformDependencyReadiness.contract.test.js']],
  ['M7134 external-action permissions', ['server/extensionDeveloperPlatform.test.js','server/platformIntegrationPolicy.contract.test.js']],
  ['M7135 permission-aware ranking', ['server/platformSearchCertification.contract.test.js','server/platformReadiness.contract.test.js']],
  ['M7136 extension permissions', ['server/extensionDeveloperPlatform.test.js','server/platformIntegrationPolicy.contract.test.js']],
  ['M7137 privacy boundaries', ['server/v6_1_8_account_center_privacy.contract.test.js','server/v5_89_0_account_artifact_lifecycle.contract.test.js']],
  ['M7138 user-control completeness', ['server/v5_87_0_account_lifecycle_maturity.contract.test.js','server/v5_90_0_account_closure_predicate_integrity.contract.test.js']],
  ['M7139 trusted-device and WebAuthn evidence', ['server/v6_0_86_webauthn.test.js','server/webauthn.js']],
  ['M7140 moderation decisions', ['server/v5_99_85_b331_moderation.contract.test.js','server/trustSafetyTraceability.contract.test.js']],
  ['M7141 appeals and review transitions', ['server/identityVerification.contract.test.js','server/v6_1_2_marketplace_exception_triage.test.js']],
  ['M7142 marketplace moderation', ['server/v6_1_2_marketplace_exception_triage.test.js','server/trustSafetyTraceability.contract.test.js']],
  ['M7143 moderation analytics', ['server/ownerAnalytics.test.js','server/ownerAnalytics.contract.test.js']],
  ['M7144 provider credential readiness', ['server/walletProviderReadiness.test.js','server/platformIntegrationPolicy.contract.test.js']],
  ['M7145 financial action evidence', ['server/financialOperations.test.js','server/v5_62_0_financial_integrity.contract.test.js']],
  ['M7146 provider adapter contract', ['server/walletProviderContract.test.js','server/walletProviderReadiness.test.js']],
  ['M7147 deposit contract', ['server/financialOperations.test.js','server/walletProviderContract.test.js']],
  ['M7148 withdrawal contract', ['server/financialOperations.test.js','server/walletProviderContract.test.js']],
  ['M7149 transfer contract', ['server/financialOperations.test.js','server/walletProviderContract.test.js']]
];
test('Main Block 29 carry-forward audit has evidence references for each of the 24 safe local milestones', () => {
  assert.equal(evidence.length, 24);
  for (const [milestone, files] of evidence) for (const file of files) assert.ok(exists(file), `${milestone}: missing ${file}`);
});
test('Main carry-forward evidence explicitly keeps external identity, provider and production acceptance unverified', () => {
  const oauth = read('docs/GOOGLE_OAUTH_READINESS.md');
  const provider = read('server/walletProviderReadiness.js');
  assert.match(oauth, /blocked|NOT TESTED|not configured/i);
  assert.match(provider, /not_connected|not_ready|unavailable|disabled|blocked/i);
});
test('Main financial provider contracts do not claim a live provider connection', () => {
  const provider = read('server/walletProviderContract.js');
  assert.match(provider, /adapter|provider/i);
  assert.match(provider, /not configured|not_ready|disabled|unavailable/i);
});
