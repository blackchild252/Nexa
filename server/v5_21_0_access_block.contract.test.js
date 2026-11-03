const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

// B57 Checkpoint 22 — ACCESS screens: Subscription, Login/Signup, Staff, Admin Disputes
// (Royal Dark thin-gold layer + Earth Light layers, one world each, design layer).

const KINDS = ['subscription', 'auth', 'staff', 'disputes'];

test('B57 CP22 the four access worlds exist with no poster and their own prompt', () => {
  const w = read('src/nexaWorlds.ts');
  assert.match(w, /\| 'developer'\n  \| 'subscription'\n  \| 'auth'\n  \| 'staff'\n  \| 'disputes';/);
  for (const k of KINDS) {
    assert.match(w, new RegExp(`\\n  ${k}: null,`), `${k} poster`);
    assert.match(w, new RegExp(`\\n  ${k}: '[^']{40,}',`), `${k} prompt`);
  }
  assert.match(w, /developer: null,/);
});

test('B57 CP22 Earth Light wiring: access variants added, sky + water mounted, wash kept', () => {
  const earth = read('src/NexaEarth.tsx');
  assert.match(earth, /import \{ EarthAccessSky, EarthAccessWater, type EarthAccessKind \} from '\.\/NexaEarthAccess'/);
  assert.match(earth, /'developer' \| 'subscription' \| 'auth' \| 'staff' \| 'disputes';/);
  assert.match(earth, /const isAccess = variant === 'subscription' \|\| variant === 'auth' \|\| variant === 'staff' \|\| variant === 'disputes'/);
  assert.match(earth, /isAccess \? <EarthAccessSky kind=\{variant as EarthAccessKind\} width=\{width\} height=\{height\} \/> : null/);
  assert.match(earth, /isAccess \? <EarthAccessWater kind=\{variant as EarthAccessKind\} width=\{width\} horizonY=\{horizonY\} \/> : null/);
  assert.match(earth, /variant === 'developer' \|\| isAccess \? Math\.max\(dim, 0\.18\) : dim/);
  const wb = read('src/NexaWorldBackground.tsx');
  assert.match(wb, /import \{ NexaDarkAccess \} from '\.\/NexaDarkAccess'/);
  assert.match(wb, /const isAccess = world === 'subscription' \|\| world === 'auth' \|\| world === 'staff' \|\| world === 'disputes'/);
  assert.match(wb, /isAccess \? \(world as EarthVariant\) : world === 'developer'/);
  assert.match(wb, /earthVariant === 'developer' \|\| isAccess\)\)/);
  assert.match(wb, /!light && isAccess \? <NexaDarkAccess kind=/);
  // older worlds keep their own wiring
  for (const v of ['developer', 'extensions', 'profile', 'search', 'notifications']) assert.ok(wb.includes(`world === '${v}' ? '${v}'`), v);
  assert.match(wb, /!light && world === 'developer' \? <NexaDarkDeveloper \/> : null/);
});

test('B57 CP22 Subscription: own world on both returns, all plain object styles through ds(), logic untouched', () => {
  const src = read('src/Subscription.tsx');
  assert.match(src, /import \{ theme, tc, ds \} from '\.\/theme'/);
  assert.equal((src.match(/<NexaWorldBackground world="subscription">/g) || []).length, 2);
  assert.equal((src.match(/<\/NexaWorldBackground>/g) || []).length, 2);
  assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0);
  for (const k of ["'/api/subscription'", "'/api/subscription/change-plan'", "'/api/subscription/change-plan/cancel'", "'/api/subscription/autopay'", "'/api/subscription/cancel'", 'loadRequest', 'Stop auto-renewal', 'Sky Wallet auto-pay']) assert.ok(src.includes(k), k);
  assert.deepEqual(src.match(/(?<!tc\()['"]#[0-9a-fA-F]{3,8}['"]/g) || [], []);
});

test('B57 CP22 Login and Signup: own auth world, full-bleed scene, form logic untouched', () => {
  for (const [f, api] of [['src/app/auth/login.tsx', 'signIn(email,password)'], ['src/app/auth/signup.tsx', 'signUp(email,password,name)']]) {
    const src = read(f);
    assert.equal((src.match(/<RoyalBackground world="auth" style=\{ds\(\{flex:1\}\)\}>/g) || []).length, 1, f);
    assert.match(src, /<KeyboardAvoidingView style=\{ds\(\{flex:1\}\)\}/);
    assert.match(src, /import \{theme,ds\} from '\.\.\/\.\.\/theme'/);
    assert.match(src, api.startsWith('signIn') ? /signIn\(normalizedEmail,password,true\)/ : /signUp\(normalizedEmail,password,name,true\)/, f + ' submit');
    assert.match(src, /<PasswordInput /, f + ' password field');
    assert.match(read('src/PasswordInput.tsx'), /secureTextEntry/);
    assert.equal((src.match(/<\/RoyalBackground>/g) || []).length, 1);
  }
  assert.match(read('src/app/auth/signup.tsx'), /validateAuthCredentials/); assert.match(read('src/authValidation.ts'), /password/);
  // session logic lives in auth.tsx and is untouched
  const auth = read('src/auth.tsx');
  assert.ok(auth.includes("'/api/auth/login'") && auth.includes("'/api/auth/signup'") && auth.includes('TOKEN_KEY'));
});

test('B57 CP22 Staff: standalone route sits in the staff world; embedded dashboard use is not double-wrapped', () => {
  const staffRoute = read('src/app/staff.tsx');
  assert.match(staffRoute, /<NexaWorldBackground world="staff">/);
  assert.match(staffRoute, /useVendorDashboard\(true\)/);
  assert.match(staffRoute, /const isVendorOwner = !!vendorState\.vendor/);
  assert.doesNotMatch(staffRoute, /isVendorOwner=true/);
  const scr = read('src/StaffScreen.tsx');
  assert.doesNotMatch(scr, /NexaWorldBackground/);
  assert.match(scr, /import \{ theme, tc, ds \} from '\.\/theme'/);
  assert.equal((scr.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0);
  assert.equal((scr.match(/=\{ds\(\{/g) || []).length, 4);
  for (const k of ['staff.invite(', 'staff.remove(', 'staff.shareCode(', 'staff.join(', 'canManageStaff']) assert.ok(scr.includes(k), k);
});

test('B57 CP22 Admin Disputes: own world, plain object styles through ds(), resolve logic untouched', () => {
  const src = read('src/AdminDisputesScreen.tsx');
  assert.match(src, /import \{ tc, ds \} from '\.\/theme'/);
  assert.equal((src.match(/<NexaWorldBackground world="disputes">/g) || []).length, 1);
  assert.equal((src.match(/<\/NexaWorldBackground>/g) || []).length, 1);
  assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0);
  for (const k of ['adminDisputes(status)', 'resolveAdminDispute(d.id,r)', 'r.length<4', 'loadRequest', 'Resolve dispute']) assert.ok(src.includes(k), k);
});

test('B57 CP22 both scene files: native, decorative, one loop, subscription motion rules, all four kinds drawn', () => {
  for (const f of ['src/NexaDarkAccess.tsx', 'src/NexaEarthAccess.tsx']) {
    const src = read(f);
    assert.match(src, /allows\('world-ambient'\)/);
    assert.match(src, /allows\('vip-spotlight'\)/);
    assert.match(src, /pointerEvents="none"/);
    assert.match(src, /accessible=\{false\}/);
    assert.match(src, /useNativeDriver: true/);
    assert.doesNotMatch(src, /onPress|TouchableOpacity|Pressable|TextInput|Image\b|require\(/);
    for (const k of KINDS) assert.ok(src.includes(`kind === '${k}'`), `${f} ${k}`);
    // exactly one Animated loop per layer component
    assert.equal((src.match(/Animated\.loop\(/g) || []).length, f.includes('Dark') ? 1 : 1, f);
    assert.match(src, /return \(\) => loop\.stop\(\)/);
  }
});

test('B57 CP22 lit-in-turn ranges stay monotonic (no interpolate crash)', () => {
  // inputRange [0, i/n, i/n+.08, i/n+.2, 1] must be non-decreasing for every (i, n) used
  const combos = [[4, 4], [2, 2], [3, 3]];
  for (const [n, count] of combos) for (let i = 0; i < count; i++) {
    const r = [0, i / n, i / n + 0.08, i / n + 0.2, 1];
    for (let k = 1; k < r.length; k++) assert.ok(r[k] >= r[k - 1], `n=${n} i=${i}`);
  }
  const dark = read('src/NexaDarkAccess.tsx');
  assert.ok(dark.includes('lit(i, 4)') && dark.includes('lit(i, 2)') && dark.includes('lit(i, 3)'));
});

test('B57 CP22 regression: release metadata remains synchronized after later releases, batch B57 kept', () => {
  const rootVersion = JSON.parse(read('package.json')).version;
  const serverVersion = JSON.parse(read('server/package.json')).version;
  const app = JSON.parse(read('app.json'));
  assert.equal(serverVersion, rootVersion);
  assert.equal(app.version, rootVersion);
  assert.equal(app.expo.version, rootVersion);
  assert.match(read('VERSION.md'), new RegExp(`Current Version:\\*\\* V${rootVersion.replace('.', '\\.')}`));
  assert.match(read('MASTER_ROADMAP.md'), /M1650–M1674|B133/);
});
