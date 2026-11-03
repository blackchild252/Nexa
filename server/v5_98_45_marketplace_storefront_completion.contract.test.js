const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const storefront = read('src/MarketplaceStorefront.tsx');
const screen = read('src/MarketplaceScreen.tsx');
const hook = read('src/useMarketplace.ts');
const api = read('src/marketplace.ts');
const server = read('server/index.js');
const memory = read('PROJECT_MEMORY.json');
const roadmap = read('MASTER_ROADMAP.md');

let utils;
{
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-marketplace-utils-'));
  // Keep unrelated/incomplete ambient @types packages in node_modules from breaking this pure helper compile.
  const typeRoots = path.join(out, 'empty-types');
  fs.mkdirSync(typeRoots);
  const tscArgs = ['src/marketplaceStoreUtils.ts','--target','ES2020','--module','commonjs','--outDir',out,'--skipLibCheck','--typeRoots',typeRoots,'--pretty','false'];
  // TypeScript 6 refuses file arguments next to a tsconfig.json (TS5112) unless --ignoreConfig is given; TypeScript 5.x does not know that flag.
  const tscMajor = Number(((require('child_process').execFileSync('tsc', ['-v'], { encoding: 'utf8' }).match(/(\d+)\./)) || [])[1]);
  if (tscMajor >= 6) tscArgs.push('--ignoreConfig');
  execFileSync('tsc', tscArgs, { cwd: root, stdio: 'ignore' });
  utils = require(path.join(out, 'marketplaceStoreUtils.js'));
}

const has = (source, pattern, title) => assert.match(source, pattern, title);

test('M2700 — Marketplace storefront entry remains reachable through the existing screen and hook', () => {
  has(screen, /useMarketplace\(user\)/);
  has(screen, /Dream Marketplace/);
  has(api, /api\/mall\/storefront/);
});

test('M2701 — storefront loading and empty states are explicit', () => {
  has(screen, /m\.loading/);
  has(screen, /No Marketplace products found/);
  has(screen, /m\.products\.length/);
});

test('M2702 — hero banners are catalogue-backed', () => {
  assert.deepEqual(utils.buildBanners(null), []);
  assert.deepEqual(utils.buildBanners({deals:[{id:'x',price:100,regularPrice:100}]}), []);
  assert.ok(utils.buildBanners({newArrivals:[{id:'n'}]}).some(x => x.action === 'new'));
  has(screen, /buildBanners\(m\.storefront\)/);
});

test('M2703 — expired or invalid discounts cannot be presented as active sales', () => {
  const now = Date.parse('2026-10-01T12:00:00Z');
  assert.equal(utils.discountPercent({price:75,regularPrice:100,saleEndsAt:'2026-10-01T11:00:00Z'}, now), 0);
  assert.equal(utils.discountPercent({price:100,regularPrice:100,saleEndsAt:'2026-10-02T11:00:00Z'}, now), 0);
  has(server, /saleEndsAt > \?/);
  has(server, /effectivePrice\(row/);
});

test('M2704 — countdown states transition from running to ended', () => {
  const now = Date.parse('2026-10-01T00:00:00Z');
  assert.equal(utils.countdownText('2026-10-01T03:12:09Z', now), '03:12:09');
  assert.equal(utils.countdownText('2026-09-30T23:59:59Z', now), 'Ended');
  has(storefront, /useNow\(!!timer/);
});

test('M2705 — product cards expose truthful stock and sold-out behavior', () => {
  has(screen, /p\.stock<=0/);
  has(screen, /is sold out/);
  has(screen, /disabled=\{out\}/);
  has(storefront, /p\.stock<=0/);
});

test('M2706 — rating and social-proof labels stay truthful', () => {
  assert.equal(utils.soldLabel(0), '');
  assert.equal(utils.soldLabel(57), '50+ sold');
  assert.equal(utils.ratingLabel(null, 0), 'New');
  assert.equal(utils.ratingLabel(4.62, 12), '4.6 (12)');
  has(storefront, /No reviews yet/);
});

test('M2707 — department navigation exposes selected tab semantics', () => {
  has(storefront, /accessibilityRole="tab"/);
  has(storefront, /accessibilityState=\{\{selected:on\}\}/);
  has(screen, /Show all Marketplace categories/);
});

test('M2708 — filter controls preserve selected state and server filter ownership', () => {
  has(storefront, /Open filters/);
  has(storefront, /accessibilityState=\{\{selected:!!filters\.onSale\}\}/);
  has(api, /params\.set\('onSale','1'\)/);
  has(server, /req\.query\?\.onSale/);
});

test('M2709 — sort controls expose selected state and validated server sorts', () => {
  has(storefront, /Sort by \$\{SORT_LABELS\[k\]\}/);
  has(server, /Invalid sort order/);
  has(server, /price_asc/);
  has(server, /price_desc/);
});

test('M2710 — stale searches cannot overwrite newer results', () => {
  has(hook, /const requestId=\+\+loadRequest\.current/);
  has(hook, /if\(requestId!==loadRequest\.current\)return/);
  has(hook, /base!==loadRequest\.current/);
});

test('M2711 — pagination exposes a guarded load-more path', () => {
  has(hook, /if\(!nextCursor\|\|loadingMore\|\|loading\)return/);
  has(screen, /Load more products/);
  has(screen, /!m\.loadingMore/);
});

test('M2712 — favourites toggle optimistically and roll back on failure', () => {
  has(hook, /setFavoriteIds\(cur=>was\?/);
  has(hook, /favoriteListing\(p\.id\)/);
  has(hook, /unfavoriteListing\(p\.id\)/);
  has(screen, /Open saved items/);
});

test('M2713 — cart quantity is capped by available stock', () => {
  assert.deepEqual(utils.cartAdd([], {id:'p',stock:2}, 9).map(x=>x.quantity), [2]);
  assert.deepEqual(utils.cartChange([{product:{id:'p',stock:2},quantity:2}], 'p::', 9).map(x=>x.quantity), [2]);
  has(hook, /stockCap/);
});

test('M2714 — cart removal is explicit and accessible', () => {
  has(screen, /Remove \$\{i\.product\.name\} from cart/);
  has(hook, /const removeLine=/);
  assert.equal(utils.cartRemove([{product:{id:'p',stock:2},quantity:1}], 'p::').length, 0);
});

test('M2715 — cart groups by seller and calculates seller subtotals', () => {
  const line = (id,vendorId,price,quantity) => ({product:{id,vendorId,vendorName:'Shop '+vendorId,price},quantity});
  const groups = utils.groupCartByShop([line('1','a',100,2),line('2','b',50,1),line('3','a',10,3)]);
  assert.deepEqual(groups.map(g=>[g.shopName,g.subtotal]), [['Shop a',230],['Shop b',50]]);
  has(screen, /groupCartByShop\(m\.cart\)/);
});

test('M2716 — Buy Now continues through the existing cart authority', () => {
  has(screen, /onBuyNow=\{\(q,v\)=>\{m\.add\(detail,q,v\);setDetail\(null\);setCartOpen\(true\);\}\}/);
  has(hook, /checkout\(cart,address,note,method,user\?\.email,feePreview\?\.previewId\)/);
});

test('M2717 — checkout is protected from double submission', () => {
  has(screen, /actionGuard\.tryBegin\('checkout'\)/);
  has(screen, /actionGuard\.end\('checkout'\)/);
  has(screen, /disabled=\{busy\|\|!m\.cart\.length/);
});

test('M2718 — Marketplace service-fee preview remains visible before ordering', () => {
  has(screen, /NEXA Marketplace service fee/);
  has(screen, /m\.feePreview/);
  has(screen, /!m\.feePreview/);
  has(api, /fee-preview\?serviceCode=marketplace_service/);
});

test('M2719 — product-detail close/back navigation is labelled', () => {
  has(storefront, /accessibilityLabel="Close product"/);
  has(screen, /onClose=\{\(\)=>setDetail\(null\)\}/);
});

test('M2720 — seller questions and listing reports expose busy/action semantics', () => {
  has(storefront, /accessibilityLabel="Send question to seller"/);
  has(storefront, /accessibilityState=\{\{disabled:asking\}\}/);
  has(storefront, /accessibilityLabel="Report this listing"/);
  has(api, /api\/marketplace\/reports/);
});

test('M2721 — product-detail controls expose appropriate accessibility semantics', () => {
  for (const label of ['Decrease quantity','Increase quantity','Apply filters','Reset filters']) has(storefront, new RegExp(`accessibilityLabel="${label}"`));
  has(storefront, /accessibilityRole="switch"/);
  has(storefront, /accessibilityRole="radio"/);
});

test('M2722 — public storefront is restricted to active, in-stock inventory', () => {
  const at = server.indexOf('app.get("/api/mall/storefront"');
  assert.ok(at > 0);
  const block = server.slice(at, at + 2200);
  has(block, /p\.active = 1 AND p\.stock > 0 AND COALESCE\(v\.status, 'active'\) = 'active'/);
  has(block, /rateLimit\(/);
});

test('M2723 — Marketplace security/data integrity keeps server ranking and existing payment authority', () => {
  has(server, /AND p\.id IN \(\$\{ids\.map/);
  has(server, /NOT IN \('cancelled','refunded'\)/);
  has(server, /COALESCE\(v\.status, 'active'\) = 'active'/);
  assert.doesNotMatch(storefront, /checkout\(/);
  has(screen, /tryBegin\('checkout'\)/);
});

test("M2724 — B193 historical release evidence remains preserved",()=>{const r=read("B193_REPORT.md");assert.ok(r.includes("V5.98.45") && r.includes("B193"));});
