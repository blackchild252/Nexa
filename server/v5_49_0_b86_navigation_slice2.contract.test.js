const test = require('node:test');
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

test('B86 M580 Profile & Settings remains reachable outside the world dock', () => {
  const layout = read('src/app/(tabs)/_layout.tsx');
  const home = read('src/homeDesign.ts');
  const nav = read('src/nexaNavigation.ts');
  const profile = read('src/app/(tabs)/profile.tsx');
  assert.equal(routeExists('/(tabs)/profile'), true);
  assert.match(layout, /name="profile" options=\{\{title:BRAND\.profile,href:null\}\}/);
  assert.match(home, /\['profile','Profile'/);
  assert.match(nav, /profile:\s*\{ pathname: '\/\(tabs\)\/profile' \}/);
  assert.match(profile, /Profile & Settings/);
  assert.match(profile, /Open NEXA Membership/);
  assert.match(profile, /Open Extensions/);
  assert.match(profile, /Open Developer Console/);
});

test('B86 M581 Zeeza keeps Inbox/Friends/Chase/Profile internal and preserves deep-link return', () => {
  const zeeza = read('src/app/(tabs)/zeeza.tsx');
  const profile = read('src/app/zeeza/profile.tsx');
  assert.match(zeeza, /accessibilityLabel="Open Zeeza Inbox"/);
  assert.match(zeeza, /accessibilityLabel="Open Zeeza Friends"/);
  assert.match(zeeza, /accessibilityLabel="Open Zeeza Chase"/);
  assert.match(zeeza, /const openProfile = \(\) => router\.push\('\/zeeza\/profile'/);
  assert.match(zeeza, /accessibilityState=\{\{selected:section==='inbox'\}\}/);
  assert.match(zeeza, /accessibilityState=\{\{selected:section==='friends'\}\}/);
  assert.match(zeeza, /accessibilityState=\{\{selected:section==='chase'\}\}/);
  assert.match(profile, /onBack=\{\(\) => router\.replace\('\/\(tabs\)\/zeeza'/);
  assert.equal(routeExists('/zeeza/profile'), true);
  assert.equal(routeExists('/zeeza/inbox'), true);
});

test('B86 M582 Marketplace customer/vendor/admin entry points preserve server authority boundaries', () => {
  const route = read('src/app/(tabs)/marketplace.tsx');
  const screen = read('src/MarketplaceScreen.tsx');
  const vendor = read('src/VendorDashboard.tsx');
  const disputes = read('src/app/marketplace/disputes.tsx');
  const server = read('server/index.js');
  assert.match(route, /onVendor=\{\(\) => router\.push\('\/marketplace\/vendor'/);
  assert.match(route, /onAdmin=\{\(\) => router\.push\('\/marketplace\/disputes'/);
  assert.match(screen, /adminStatus\(\)\.then/);
  assert.match(screen, /isAdmin&&<(?:NexaPressable|TouchableOpacity)[^>]*accessibilityLabel="Open Administrative Director disputes"/s);
  assert.match(vendor, /useVendorDashboard\(true\)/);
  assert.match(vendor, /useStaff\(\{isVendorOwner:!!d\.vendor/);
  assert.match(disputes, /adminStatus\(\)/);
  assert.match(server, /app\.get\("\/api\/mall\/admin\/disputes", auth\.authMiddleware, (?:adminAccess\.scopedGate\("[a-z_]+"\), )?(?:requireMallAdmin|mallAdminFor\("[a-z_]+"\))/);
  assert.match(server, /app\.post\("\/api\/mall\/admin\/disputes\/:disputeId\/resolve", auth\.authMiddleware, (?:adminAccess\.scopedGate\("[a-z_]+"\), )?(?:requireMallAdmin|mallAdminFor\("[a-z_]+"\))/);
  assert.match(server, /app\.get\("\/api\/mall\/vendor\/products", auth\.authMiddleware, requireVendorAccess/);
  assert.match(server, /app\.get\("\/api\/mall\/vendor\/orders", auth\.authMiddleware, requireVendorAccess/);
});

test('B86 M583 Sky Money payment/history entry uses the existing Marketplace world instead of a dead destination', () => {
  const moneyRoute = read('src/app/(tabs)/money.tsx');
  const dashboard = read('src/MoneyDashboard.tsx');
  const marketplace = read('src/app/(tabs)/marketplace.tsx');
  const api = read('src/marketplace.ts');
  assert.ok(moneyRoute.includes("onOpenMarketplace={()=>router.push('/(tabs)/marketplace' as any)}"));
  assert.match(dashboard, /Open Marketplace payments & history/);
  assert.match(api, /export async function paymentHistory\(\)\{ return authedFetch\('\/api\/mall\/payments\/history'\);/);
  assert.match(marketplace, /initialOrderId=\{params\.orderId/);
  assert.match(marketplace, /initialTab=\{params\.tab/);
  assert.equal(routeExists('/(tabs)/marketplace'), true);
});

test('B86 M584 Yaayz ticket/event navigation preserves authenticated purchase and verification authority', () => {
  const route = read('src/app/(tabs)/yaayz.tsx');
  const screen = read('src/YaayzScreen.tsx');
  const nav = read('src/nexaNavigation.ts');
  const server = read('server/index.js');
  assert.match(route, /<YaayzScreen\/>/);
  assert.match(screen, /useLocalSearchParams<\{type\?:string;search\?:string;returnTo\?:string;ticketOrderId\?:string\}>/);
  assert.match(screen, /authedFetch\(`\/api\/yaayz\/tickets\/\$\{encodeURIComponent\(ticket\.id\)\}\/purchase`/);
  assert.match(screen, /authedFetch\('\/api\/yaayz\/payments\/verify'/);
  assert.match(screen, /authedFetch\(`\/api\/yaayz\/orders\/\$\{encodeURIComponent\(order\.id\)\}\/fee-retry`/);
  assert.match(nav, /case 'ticket': return validateNavigationTarget\(\{ pathname: '\/\(tabs\)\/yaayz', params: \{ type: 'tickets', ticketOrderId: id \} \}\);/);
  assert.match(server, /app\.post\("\/api\/yaayz\/tickets\/:ticketId\/purchase", auth\.authMiddleware/);
  assert.match(server, /app\.post\("\/api\/yaayz\/payments\/verify", auth\.authMiddleware/);
  assert.match(server, /app\.post\("\/api\/yaayz\/orders\/:orderId\/fee-retry", auth\.authMiddleware/);
});
