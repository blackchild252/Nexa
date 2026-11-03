const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const os = require('os');
const { execFileSync } = require('child_process');
const utilsDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-marketplace-utils-'));
const emptyTypes = path.join(utilsDir, 'empty-types'); fs.mkdirSync(emptyTypes);
const tscArgs = ['src/marketplaceStoreUtils.ts','--target','ES2020','--module','commonjs','--outDir',utilsDir,'--skipLibCheck','--pretty','false','--typeRoots',emptyTypes];
// TypeScript 6 refuses file arguments next to a tsconfig.json (TS5112) unless --ignoreConfig is given; TypeScript 5.x does not know that flag.
const tscMajor = Number(((require('child_process').execFileSync('tsc', ['-v'], { encoding: 'utf8' }).match(/(\d+)\./)) || [])[1]);
if (tscMajor >= 6) tscArgs.push('--ignoreConfig');
execFileSync('tsc', tscArgs, { cwd: root, stdio: 'ignore' });
const utils = require(path.join(utilsDir, 'marketplaceStoreUtils.js'));

// Marketplace storefront contract carried forward into B193. (Temu-style discovery on Walmart-style structure).

test('discountPercent only counts a sale that is still running', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  assert.equal(utils.discountPercent({ id: 'a', price: 75, regularPrice: 100 }, now), 25);
  assert.equal(utils.discountPercent({ id: 'a', price: 75, regularPrice: 100, saleEndsAt: '2026-10-01T11:00:00Z' }, now), 0);
  assert.equal(utils.discountPercent({ id: 'a', price: 100 }, now), 0);
  assert.equal(utils.discountPercent({ id: 'a', price: 120, regularPrice: 100 }, now), 0);
  assert.equal(utils.discountPercent({ id: 'a', price: 0.4, regularPrice: 100000 }, now), 99);
});

test('soldLabel and ratingLabel give honest social proof', () => {
  assert.equal(utils.soldLabel(0), ''); assert.equal(utils.soldLabel(undefined), '');
  assert.equal(utils.soldLabel(7), '7 sold'); assert.equal(utils.soldLabel(57), '50+ sold');
  assert.equal(utils.soldLabel(340), '300+ sold'); assert.equal(utils.soldLabel(1234), '1.2k+ sold'); assert.equal(utils.soldLabel(25000), '25k+ sold');
  assert.equal(utils.ratingLabel(null, 0), 'New'); assert.equal(utils.ratingLabel(4.62, 12), '4.6 (12)'); assert.equal(utils.ratingLabel(4.5, 1500), '4.5 (1.5k)');
});

test('countdownText formats a running sale and reports when it has ended', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');
  assert.equal(utils.countdownText(null, now), '');
  assert.equal(utils.countdownText('not-a-date', now), '');
  assert.equal(utils.countdownText('2026-09-30T23:59:59Z', now), 'Ended');
  assert.equal(utils.countdownText('2026-10-01T03:12:09Z', now), '03:12:09');
  assert.equal(utils.countdownText('2026-10-03T04:10:00Z', now), '2d 04h 10m');
});

test('gridColumns scales from phone to desktop and CARD_WIDTH fits every column count in one row', () => {
  assert.deepEqual([360, 600, 900, 1180].map(utils.gridColumns), [2, 3, 4, 5]);
  for (const [cols, w] of Object.entries(utils.CARD_WIDTH)) assert.ok(parseFloat(w) * Number(cols) <= 100, `${cols} columns overflow`);
});

test('groupCartByShop groups lines per seller and totals each subtotal', () => {
  const line = (id, vendorId, price, quantity) => ({ product: { id, vendorId, vendorName: 'Shop ' + vendorId, price }, quantity });
  const groups = utils.groupCartByShop([line('1', 'a', 100, 2), line('2', 'b', 50, 1), line('3', 'a', 10, 3)]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(g => [g.shopName, g.lines.length, g.subtotal]), [['Shop a', 2, 230], ['Shop b', 1, 50]]);
});

test('hero banners are built only from catalogue data that exists', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  assert.deepEqual(utils.buildBanners(null, now), []);
  assert.deepEqual(utils.buildBanners({ deals: [{ id: 'x', price: 100, regularPrice: 100 }] }, now), []);
  const b = utils.buildBanners({ deals: [{ id: 'x', price: 60, regularPrice: 100 }, { id: 'y', price: 90, regularPrice: 100 }], topRated: [{ id: 'z' }] }, now);
  assert.deepEqual(b.map(x => x.id), ['deals', 'top']);
  assert.match(b[0].title, /up to 40% off/);
});

test('server: product list gained additive filters without touching pagination or visibility', () => {
  const idx = read('server/index.js');
  assert.match(idx, /query\?\.onSale/); assert.match(idx, /query\?\.inStock/); assert.match(idx, /query\?\.minRating/); assert.match(idx, /query\.ids/);
  assert.match(idx, /Invalid rating filter/); assert.match(idx, /Invalid product list/);
  assert.match(idx, /AND p\.id IN \(\$\{ids\.map/);                 // ids are bound parameters, never concatenated
  assert.match(idx, /COALESCE\(v\.status, 'active'\) = 'active'/);   // suspended sellers stay hidden
  assert.match(idx, /soldCount/); assert.match(idx, /NOT IN \('cancelled','refunded'\)/);
});

test('server: /api/mall/storefront is public, rate limited, active-seller only and ranks on the server', () => {
  const idx = read('server/index.js');
  const at = idx.indexOf('app.get("/api/mall/storefront"');
  assert.ok(at > 0);
  const block = idx.slice(at, at + 1800);
  assert.match(block, /rateLimit\(/);
  assert.match(block, /p\.active = 1 AND p\.stock > 0 AND COALESCE\(v\.status, 'active'\) = 'active'/);
  for (const k of ['deals', 'bestSellers', 'topRated', 'newArrivals']) assert.match(block, new RegExp(k + ':'));
  assert.match(block, /toClientProduct/);
  assert.match(read('server/db.js'), /idx_mallorderitems_product/);
});

test('client: hook owns filters, pagination, favourites and stock-capped cart; checkout contract is unchanged', () => {
  const hook = read('src/useMarketplace.ts');
  for (const k of ['loadMore', 'toggleFavorite', 'removeLine', 'resetBrowse', 'nextCursor', 'storefront']) assert.match(hook, new RegExp(k));
  assert.match(hook, /stockCap/);
  assert.match(hook, /moreRequest/); assert.match(hook, /base!==loadRequest\.current/); // stale "load more" is dropped after a new search
  assert.match(hook, /checkout\(cart,address,note,method,user\?\.email,feePreview\?\.previewId\)/);
  const api = read('src/marketplace.ts');
  assert.match(api, /export async function getStorefront/); assert.match(api, /api\/mall\/storefront/);
  assert.match(api, /params\.set\('onSale','1'\)/); assert.match(api, /params\.set\('ids'/);
});

test('client: screen shows the marketplace sections and keeps every existing commerce action', () => {
  const src = read('src/MarketplaceScreen.tsx');
  for (const k of ['<HeroBanners', '<DepartmentGrid', '<ProductRail title="⚡ Flash deals"', 'Best sellers', 'Top rated', 'New arrivals', 'Just for you', '<FilterBar', '<FilterSheet', '<ProductDetail', '<SavedPanel', '<TrustStrip']) assert.ok(src.includes(k), k);
  assert.match(src, /accessibilityLabel="Load more products"/);
  assert.match(src, /accessibilityLabel=\{`Remove \$\{i\.product\.name\} from cart`\}/);
  assert.match(src, /groupCartByShop\(m\.cart\)/);
  assert.match(src, /tryBegin\('checkout'\)/);                       // double-submit guard intact
  assert.match(src, /NEXA Marketplace service fee/);                 // fee preview still shown before ordering
  assert.match(src, /onBuyNow=\{\(q,v\)=>\{m\.add\(detail,q,v\);setDetail\(null\);setCartOpen\(true\);\}\}/); // Buy now goes through the normal cart + checkout (B144 WIP9: with the chosen size/colour)
});

test('client: product page exposes accessible, labelled controls and no new payment authority', () => {
  const sf = read('src/MarketplaceStorefront.tsx');
  for (const label of ['Close product', 'Decrease quantity', 'Increase quantity', 'Send question to seller', 'Report this listing', 'Apply filters', 'Reset filters']) assert.ok(sf.includes(`accessibilityLabel="${label}"`), label);
  assert.match(sf, /accessibilityRole="switch"/);
  assert.doesNotMatch(sf, /checkout\(|verifyMallPayment|openPaymentUrl|authorization_url/);
});
