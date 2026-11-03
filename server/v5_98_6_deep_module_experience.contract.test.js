const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const nav = fs.readFileSync(path.join(root, 'src/nexaNavigation.ts'), 'utf8');
const zeeza = fs.readFileSync(path.join(root, 'src/app/(tabs)/zeeza.tsx'), 'utf8');
const money = fs.readFileSync(path.join(root, 'src/app/(tabs)/money.tsx'), 'utf8');
const navKeys = fs.readFileSync(path.join(root, 'src/NexaNavKeys.tsx'), 'utf8');
const routes = fs.readFileSync(path.join(root, 'src/nexaRouteInventory.ts'), 'utf8');
const allSrc = fs.readdirSync(path.join(root, 'src'), {recursive:true}).filter(f => /\.(ts|tsx|js|mjs)$/.test(f)).map(f => fs.readFileSync(path.join(root,'src',f),'utf8')).join('\n');

const milestones = [
  ['home-action-routing', /navigationForDirectoryItem\('home'\)/],
  ['directory-authority', /DIRECTORY_ROUTES/],
  ['user-vendor-directory', /vendor:\s*\{ pathname: '\/marketplace\/vendor' \}/],
  ['search-rail', /router\.push\('\/\(tabs\)\/search'/],
  ['add-action-authority', /navigationForAddAction/],
  ['back-fallback', /router\.replace\('\/\(tabs\)'/],
  ['deep-link-inventory', /zeeza\/share\/\[token\]/],
  ['royal-dark', /NexaDarkHome/],
  ['earth-light', /NexaEarthHome/],
  ['theme-boundary', /NexaWorldBackground/],
  ['shared-visual-authority', /NexaWorldBackground|nexaVisualSystem/],
  ['responsive-typography', /nexaResponsive/],
  ['font-authority', /nexaFonts/],
  ['readable-nav-title', /fontSize: 16/],
  ['cinematic-layer', /NexaCinematicFrame/],
  ['three-d-layer', /NexaDepthLayer/],
  ['zeeza-section-routing', /requestedSection/],
  ['yaayz-route', /YaayzScreen/],
  ['marketplace-route', /MarketplaceScreen/],
  ['variant-state-authority', /initialTab/],
  ['ajo-route-compatibility', /store_savings:\s*'ajo'|['"]ajo['"]/],
  ['wallet-route-compatibility', /view === 'wallet'|pathname: '\/wallet'/],
  ['cross-module-navigation', /navigationForNotification/],
  ['navigation-keys', /Open NEXA Add actions/],
  ['route-inventory', /NEXA_ROUTE_INVENTORY/],
];

test('deep module and experience contract contains all 25 roadmap areas', () => {
  assert.equal(milestones.length, 25);
  for (const [name, pattern] of milestones) assert.match(`${nav}\n${zeeza}\n${money}\n${navKeys}\n${routes}\n${allSrc}`, pattern, name);
});

test('Dami vendor destination opens the vendor module', () => {
  assert.match(nav, /if \(value === 'vendor'\) return navigationForDirectoryItem\('vendor'\)/);
  assert.doesNotMatch(nav, /value === 'marketplace' \|\| value === 'vendor'/);
});

test('Dami legacy Money destinations map to current Money views', () => {
  assert.match(nav, /store_savings:\s*'ajo'/);
  assert.match(nav, /group_savings:\s*'groups'/);
  assert.match(nav, /if \(view === 'wallet'\) return validateNavigationTarget\(\{ pathname: '\/wallet' \}\)/);
});

test('current Money route accepts every mapped dashboard view', () => {
  for (const view of ['ajo','groups','planning','market','insights']) assert.match(money, new RegExp(`['"]${view}['"]`));
});
