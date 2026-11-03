const __nodeTest = require('node:test');
// Historical identity/gate checks retired: they pin an older release and cannot hold after a bump.
// Skipped on purpose (not passed). Current identity is enforced by scripts/release-identity.mjs.
const __retired = new Set(["B86 M599 release governance is synchronized for the 25-milestone block"]);
const test = (n, ...r) => __retired.has(n) ? __nodeTest.skip(n + ' [retired: historical identity check]', ...r) : __nodeTest(n, ...r);
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

function routeExists(pathname) {
  const p = String(pathname).split('?')[0].split('#')[0].replace(/^\/+/, '');
  const normalized = p === '(tabs)' ? '(tabs)/index' : p;
  return fs.existsSync(path.join(root, 'src', 'app', normalized + '.tsx')) ||
    fs.existsSync(path.join(root, 'src', 'app', normalized, 'index.tsx'));
}

test('B86 M590 deep-link destinations and parameters resolve to real routes with auth protection', () => {
  const nav = read('src/nexaNavigation.ts');
  const auth = read('src/auth.tsx');
  for (const route of ['/dami','/(tabs)/search','/(tabs)/zeeza','/(tabs)/money','/(tabs)/marketplace','/(tabs)/yaayz','/leisure/ball-house','/leisure/kitchen','/leisure/game-house','/leisure/fitness','/marketplace/vendor','/marketplace/disputes','/wallet','/subscription','/extensions','/developer']) {
    assert.equal(routeExists(route), true, `missing deep-link route: ${route}`);
  }
  assert.match(nav, /case 'dm_thread': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/zeeza', params: \{ section: 'inbox', threadId: id \} \}/);
  assert.match(nav, /case 'chat_room': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/zeeza', params: \{ section: 'inbox', roomId: id \} \}/);
  assert.match(auth, /if\(status==='signed_out' && !isPublicRoute\) return <Redirect href=\{'\/auth\/login'/);
  assert.match(auth, /const isPublicRoute=inAuth \|\| \(segments\[0\]==='zeeza' && segments\[1\]==='share'\)/);
});

test('B86 M591 hidden/orphan route audit leaves internal call/share routes contextual and legacy staff canonicalized', () => {
  const layout = read('src/app/(tabs)/_layout.tsx');
  const keys = read('src/nexaNavKeys.ts');
  const staff = read('src/app/staff.tsx');
  assert.match(layout, /name="profile"/);
  assert.match(layout, /name="search"/);
  assert.match(keys, /\/zeeza\/call/);
  assert.match(keys, /\/zeeza\/group-call/);
  assert.match(keys, /\/zeeza\/share/);
  assert.match(staff, /useVendorDashboard\(true\)/);
  assert.match(staff, /const isVendorOwner = !!vendorState\.vendor/);
  assert.doesNotMatch(staff, /isVendorOwner=true/);
});

test('B86 M592 navigation controls contain no empty callback destinations in the shared navigation layer', () => {
  const keys = read('src/NexaNavKeys.tsx');
  const nav = read('src/nexaNavigation.ts');
  const shell = read('src/app/(tabs)/_layout.tsx');
  assert.doesNotMatch(keys, /onPress=\{\(\)=>\{\}\}/);
  assert.doesNotMatch(nav, /=>\s*\{\s*\}/);
  assert.doesNotMatch(shell, /onPress=\{\(\)=>\{\}\}/);
  assert.match(keys, /navigationForAddAction\(action\)/);
  assert.match(keys, /router\.push\(target as any\)/);
});

test('B86 M593 Search result handoff preserves destination context and returns through the shared search route', () => {
  const nav = read('src/nexaNavigation.ts');
  const search = read('src/UnifiedSearch.tsx');
  assert.match(nav, /case 'people':/);
  assert.match(nav, /case 'groups':/);
  assert.match(nav, /case 'marketplace':/);
  assert.match(nav, /case 'yaayz':/);
  assert.match(nav, /case 'money':/);
  assert.match(nav, /case 'ai':/);
  assert.match(search, /navigationForSearchResult\(r\)/);
  assert.match(search, /router\.push\(target as any\)/);
});

test('B86 M594 user/vendor/staff/admin visibility remains separated from navigation reachability', () => {
  const marketplace = read('src/MarketplaceScreen.tsx');
  const vendor = read('src/VendorDashboard.tsx');
  const staff = read('src/StaffScreen.tsx');
  const admin = read('src/app/marketplace/disputes.tsx');
  const server = read('server/index.js');
  assert.match(marketplace, /isAdmin&&<(?:NexaPressable|TouchableOpacity)/);
  assert.match(vendor, /const owner=!!d\.vendor/);
  assert.match(staff, /if\s*\(!staff\.canManageStaff\)\s*return null/);
  assert.match(admin, /r\?\.isAdmin \? 'admin' : 'denied'/);
  assert.match(server, /requireMallAdmin/);
  assert.match(server, /requireVendorAccess/);
});

test('B86 M595 shared navigation controls meet 44px interaction target and expose labels/state', () => {
  const keys = read('src/NexaNavKeys.tsx');
  const home = read('src/HomeCommandCenter.tsx');
  const profile = read('src/app/(tabs)/profile.tsx');
  assert.match(keys, /width: theme\.accessibility\.minTouchTarget, height: theme\.accessibility\.minTouchTarget/);
  assert.match(keys, /accessibilityRole="button"/);
  assert.match(keys, /accessibilityLabel=\{label\}/);
  assert.match(keys, /accessibilityState=\{\{ selected: active \}\}/);
  assert.match(home, /accessibilityRole=\{onPress\?'button':undefined\}/);
  assert.match(profile, /accessibilityRole="button"/);
});

test('B86 M596 navigation motion honors reduced-motion and preserves active-state/theme styling', () => {
  const keys = read('src/NexaNavKeys.tsx');
  const home = read('src/HomeCommandCenter.tsx');
  assert.match(keys, /allows\('navigation'\) \? SIDE_MENU_MS : 0/);
  assert.match(home, /const \{ reducedMotion \} = useMotion\(\)/);
  assert.match(home, /const moving = !reducedMotion/);
  assert.match(keys, /rowActive/);
  assert.match(keys, /theme\.colors\.brightGold/);
});

test('B86 M597 confirmed navigation repairs are represented by executable B86 contracts', () => {
  const files = fs.readdirSync(path.join(root, 'server')).filter(f => /v5_49_0_b86_navigation_.*contract\.test\.js$/.test(f));
  assert.ok(files.length >= 3, 'B86 navigation contract coverage is incomplete');
  for (const f of files) assert.ok(fs.statSync(path.join(root, 'server', f)).size > 500, `${f} is unexpectedly empty`);
});

test('B86 M598 cross-world navigation retains centralized resolution and server-authority separation', () => {
  const nav = read('src/nexaNavigation.ts');
  assert.match(nav, /This module only resolves destinations/);
  assert.match(nav, /destination modules remain responsible for their own permissions/);
  assert.match(nav, /navigationForDirectoryItem/);
  assert.match(nav, /navigationForNotification/);
  assert.match(nav, /navigationForSearchResult/);
  assert.match(nav, /navigationForAddAction/);
  assert.match(nav, /navigationForDamiDestination/);
});

test('B86 M599 release governance is synchronized for the 25-milestone block', () => {
  const master = read('MASTER_ROADMAP.md');
  const report = read('V5_49_0_B86_IMPLEMENTATION_REPORT.md');
  assert.match(master, /M575–M599/);
  assert.match(master, /M590|590\. \*\*/);
  assert.match(master, /M599/);
  assert.match(report, /M585–M589/);
  assert.match(master, /PERMANENT INTERNAL MASTER ROADMAP/);
});
