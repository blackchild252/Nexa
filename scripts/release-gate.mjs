import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const run = (command, args) => spawnSync(command, args, { cwd: root, encoding: 'utf8' });

// Current release certification is intentionally limited to the active cumulative baseline.
// Historical contracts remain in the repository as immutable evidence and are not allowed to
// force a newer release to pretend it is an older version. Environment/deployment checks are
// explicitly excluded from this gate.
const currentContracts = [
  'server/v5_98_65_b213_navigation.contract.test.js',
  'server/v5_98_65_b213_identity_privacy.contract.test.js',
  'server/v5_98_65_b213_skymoney_membership.contract.test.js',
  'server/v5_98_65_b213_social_ai.contract.test.js',
  'server/v5_98_65_b213_marketplace_launch.contract.test.js',
  'server/v5_98_65_b214_motion.contract.test.js',
  'server/v5_98_65_b214_visual_harmonization.contract.test.js',
  'server/v5_98_67_b215_scene_fidelity.contract.test.js',
  'server/v5_98_68_b216_motion_adoption.contract.test.js',
  'server/v5_98_69_b217_interaction_surface.contract.test.js',
  'server/v5_98_70_b218_interaction_surface.contract.test.js',
  'server/v5_98_71_b219_interaction_surface.contract.test.js',
  'server/v5_99_5_b251_rails_and_default_font.contract.test.js',
  'server/v5_99_6_b252_light_contrast_and_nav_targets.contract.test.js',
  'server/v5_99_8_b254_release_enforcement.contract.test.js',
  'server/v5_99_9_b255_eas_version_authority.contract.test.js',
  'server/v5_99_11_b257_sale_badge_contrast.contract.test.js',
  'server/v5_99_12_b258_home_safe_area.contract.test.js',
  'server/v5_99_14_b260_ticker_no_clip.contract.test.js',
  'server/v5_99_15_b261_block_m4150_guards.contract.test.js',
  'server/v5_99_16_b262_block_m4175_guards.contract.test.js',
  'server/v5_99_17_b263_block_m4200_guards.contract.test.js',
  'server/v5_99_18_b264_block_m4225_guards.contract.test.js',
  'server/v5_99_25_b271_block_guards.contract.test.js',
  'server/v5_99_26_b272_block_guards.contract.test.js',
  'server/v5_99_27_b273_block_guards.contract.test.js',
  'server/v5_99_28_b274_block_guards.contract.test.js',
  'server/v5_99_30_b276_block_guards.contract.test.js',
  'server/v5_99_31_b277_block_guards.contract.test.js',
  'server/v5_99_32_b278_block_guards.contract.test.js',
  'server/v5_99_33_b279_block_guards.contract.test.js',
  'server/v5_99_34_b280_block_guards.contract.test.js',
  'server/v5_99_35_b281_block_guards.contract.test.js',
  'server/v5_99_36_b282_block_guards.contract.test.js',
  'server/v5_99_37_b283_block_guards.contract.test.js',
  'server/v5_99_39_b285_block_guards.contract.test.js',
  'server/god_hand_run1_bugs.contract.test.js',
  'server/god_hand_run1_transitions.contract.test.js',
  'server/god_hand_run1_theme.contract.test.js',
  'server/god_hand_run1_layout.contract.test.js',
  'server/god_hand_run1_layout2.contract.test.js',
  'server/god_hand_run2_timing.contract.test.js',
  'server/god_hand_run3_types.contract.test.js',
  'server/sidebar_search_hero_repair.contract.test.js',
  'server/zeeza_profile_photo_button.contract.test.js',
  'server/signup_username.contract.test.js',
  'server/profile_photo_icons.contract.test.js',
  'server/v5_99_40_b286_no_expo_versioncode.contract.test.js',
  'server/v5_99_43_b289_crash_screen.contract.test.js',
  'server/v5_99_44_b290_sky_money_layout.contract.test.js',
  'server/v5_99_45_b291_rail_start.contract.test.js',
  'server/v5_99_46_b292_sign_in_fields.contract.test.js',
  'server/v5_99_47_b293_scroll_content.contract.test.js',
  'server/v5_99_48_b294_menu_rows.contract.test.js',
  'server/v5_99_49_b295_menu_and_ball_house.contract.test.js',
  'server/v5_99_50_b296_dami_back.contract.test.js',
  'server/v5_99_42_b288_subscription_exports.contract.test.js',
  'server/vendorProductAi.test.js',
  'server/checkpoint_packaging.contract.test.js',
  'server/v6_0_46_b392_separation.contract.test.js',
];

const missing = currentContracts.filter(p => !fs.existsSync(path.join(root, p)));
if (missing.length) {
  console.error('RELEASE GATE FAILED — missing current contracts');
  missing.forEach(p => console.error(`- ${p}`));
  process.exit(1);
}

const audit = run(process.execPath, ['scripts/release-audit.mjs']);
const tests = run(process.execPath, ['--test', ...currentContracts]);
const identity = run(process.execPath, ['scripts/release-identity.mjs', 'check']);
const seal = run(process.execPath, ['scripts/release-seal.mjs', 'verify']);

const report = {
  releaseAudit: audit.status === 0,
  currentCumulativeContracts: tests.status === 0,
  releaseIdentity: identity.status === 0,
  permanentReleaseSeal: seal.status === 0,
  evidenceScope: { sourceAudit: audit.status === 0 ? 'PASS' : 'FAIL', currentContractSuite: tests.status === 0 ? 'PASS' : 'FAIL', identityConsistency: identity.status === 0 ? 'PASS' : 'FAIL', permanentSeal: seal.status === 0 ? 'PASS' : 'FAIL' },
  acceptanceNotRunByThisGate: { runtimeServerSuite: 'NOT RUN BY THIS GATE', dependencyBackedTypecheck: 'NOT RUN BY THIS GATE', browserAcceptance: 'NOT RUN BY THIS GATE', deviceAcceptance: 'NOT RUN BY THIS GATE', androidNativeBuild: 'NOT RUN BY THIS GATE', iosNativeBuild: 'NOT RUN BY THIS GATE', liveExternalIntegrations: 'NOT RUN BY THIS GATE' },
  environmentChecks: 'EXCLUDED_FROM_RELEASE_CERTIFICATION; see acceptanceNotRunByThisGate',
  historicalContracts: 'RETAINED_AS_IMMUTABLE_EVIDENCE',
};
console.log(JSON.stringify(report, null, 2));
if (audit.status !== 0 || tests.status !== 0 || identity.status !== 0 || seal.status !== 0) {
  if (audit.stdout) process.stdout.write(audit.stdout);
  if (audit.stderr) process.stderr.write(audit.stderr);
  if (tests.stdout) process.stdout.write(tests.stdout);
  if (tests.stderr) process.stderr.write(tests.stderr);
  if (identity.stdout) process.stdout.write(identity.stdout);
  if (identity.stderr) process.stderr.write(identity.stderr);
  if (seal.stdout) process.stdout.write(seal.stdout);
  if (seal.stderr) process.stderr.write(seal.stderr);
  process.exit(1);
}
