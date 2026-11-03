'use strict';
// B144 WIP9 checkpoint 2 — size/colour variants with per-variant stock, one stock helper.
// Behaviour is exercised against a real SQLite database through node:sqlite, so this runs in a bare
// checkout (no better-sqlite3 / node_modules). Structural tests read the server sources.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');
const { DatabaseSync } = require('node:sqlite');
const ps = require('./productStock');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

function freshDb() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE mall_products (id TEXT PRIMARY KEY, vendorId TEXT, name TEXT, stock INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, updatedAt TEXT);
    CREATE TABLE mall_order_items (id TEXT PRIMARY KEY, orderId TEXT, productId TEXT, quantity INTEGER);
  `);
  ps.ensureSchema(db);
  return db;
}
const addProduct = (db, id, stock = 0, active = 1) => db.prepare('INSERT INTO mall_products (id,vendorId,name,stock,active) VALUES (?,?,?,?,?)').run(id, 'v1', `Shirt ${id}`, stock, active);
const stockOf = (db, id) => db.prepare('SELECT stock FROM mall_products WHERE id=?').get(id).stock;
const variantStock = (db, id) => db.prepare('SELECT stock FROM mall_product_variants WHERE id=?').get(id).stock;
let n = 0;
const mkId = () => `mv_${++n}`;
function withVariants(db, productId, list) {
  return ps.replaceVariants(db, productId, ps.readVariantList(list), '2026-10-01T00:00:00.000Z', mkId);
}

test('schema is created, idempotent, and order lines get variantId / variantLabel', () => {
  const db = freshDb();
  ps.ensureSchema(db);
  const cols = db.prepare('PRAGMA table_info(mall_order_items)').all().map((c) => c.name);
  assert.ok(cols.includes('variantId') && cols.includes('variantLabel'));
  assert.ok(db.prepare("SELECT 1 FROM sqlite_master WHERE name='mall_product_variants'").get());
});

test('a product without variants behaves exactly as before', () => {
  const db = freshDb(); addProduct(db, 'p1', 3);
  const r = ps.reserve(db, { productId: 'p1', qty: 2 });
  assert.equal(r.ok, true); assert.equal(r.variantId, null); assert.equal(r.before, 3); assert.equal(r.after, 1);
  assert.equal(stockOf(db, 'p1'), 1);
  const short = ps.reserve(db, { productId: 'p1', qty: 2 });
  assert.equal(short.ok, false); assert.equal(short.code, 'insufficient'); assert.equal(short.available, 1);
  assert.match(short.message, /Only 1 of "Shirt p1" left/);
  assert.equal(stockOf(db, 'p1'), 1, 'a refused reserve changes nothing');
  assert.deepEqual(ps.release(db, { productId: 'p1', qty: 2 }), { restored: true });
  assert.equal(stockOf(db, 'p1'), 3);
});

test('inactive, missing and sold-out products are refused with a clear code', () => {
  const db = freshDb(); addProduct(db, 'off', 5, 0); addProduct(db, 'zero', 0);
  assert.equal(ps.reserve(db, { productId: 'off', qty: 1 }).code, 'unavailable');
  assert.equal(ps.reserve(db, { productId: 'nope', qty: 1 }).code, 'unavailable');
  const z = ps.reserve(db, { productId: 'zero', qty: 1 });
  assert.equal(z.code, 'insufficient'); assert.match(z.message, /out of stock/);
  assert.equal(ps.reserve(db, { productId: 'zero', qty: 0 }).ok, false);
});

test('with variants: stock is per option and the product total is the sum', () => {
  const db = freshDb(); addProduct(db, 'p1', 99);
  const vs = withVariants(db, 'p1', [{ size: 'M', colour: 'Black', stock: 2 }, { size: 'L', colour: 'Black', stock: 1 }, { size: 'M', colour: 'White', stock: 4 }]);
  assert.equal(vs.length, 3);
  assert.equal(stockOf(db, 'p1'), 7, 'product total replaced by the sum of its options');
  const [mBlack, lBlack] = vs;
  const r = ps.reserve(db, { productId: 'p1', variantId: mBlack.id, qty: 2 });
  assert.equal(r.ok, true); assert.equal(r.variantLabel, 'M / Black');
  assert.equal(variantStock(db, mBlack.id), 0); assert.equal(variantStock(db, lBlack.id), 1);
  assert.equal(stockOf(db, 'p1'), 5);
});

test('a sold-out option cannot be bought even when other options have stock', () => {
  const db = freshDb(); addProduct(db, 'p1');
  const [a, b] = withVariants(db, 'p1', [{ size: 'S', stock: 0 }, { size: 'M', stock: 9 }]);
  const r = ps.reserve(db, { productId: 'p1', variantId: a.id, qty: 1 });
  assert.equal(r.ok, false); assert.equal(r.code, 'insufficient'); assert.match(r.message, /"Shirt p1 \(S\)" is out of stock/);
  assert.equal(stockOf(db, 'p1'), 9, 'product total untouched by the refused reserve');
  assert.equal(ps.reserve(db, { productId: 'p1', variantId: b.id, qty: 9 }).ok, true);
  assert.equal(stockOf(db, 'p1'), 0);
});

test('the last unit of an option can only be taken once', () => {
  const db = freshDb(); addProduct(db, 'p1');
  const [v] = withVariants(db, 'p1', [{ colour: 'Red', stock: 1 }]);
  assert.equal(ps.reserve(db, { productId: 'p1', variantId: v.id, qty: 1 }).ok, true);
  assert.equal(ps.reserve(db, { productId: 'p1', variantId: v.id, qty: 1 }).ok, false);
  assert.equal(variantStock(db, v.id), 0); assert.equal(stockOf(db, 'p1'), 0);
});

test('a product with variants needs a variant; an unknown or foreign variant is refused', () => {
  const db = freshDb(); addProduct(db, 'p1'); addProduct(db, 'p2', 5);
  const [v] = withVariants(db, 'p1', [{ size: 'M', stock: 3 }]);
  assert.equal(ps.reserve(db, { productId: 'p1', qty: 1 }).code, 'variant_required');
  assert.equal(ps.reserve(db, { productId: 'p1', variantId: 'ghost', qty: 1 }).code, 'variant_unknown');
  assert.equal(ps.reserve(db, { productId: 'p2', variantId: v.id, qty: 1 }).code, 'variant_unknown', 'a variant of another product is not accepted');
  assert.equal(ps.reserve(db, { productId: 'p2', variantId: 'stale', qty: 1 }).code, 'variant_unknown', 'a variant id on a product that has none');
  assert.equal(stockOf(db, 'p1'), 3); assert.equal(stockOf(db, 'p2'), 5);
});

test('release returns units to the option and the total; it cannot restock a removed option', () => {
  const db = freshDb(); addProduct(db, 'p1');
  const [m, l] = withVariants(db, 'p1', [{ size: 'M', stock: 3 }, { size: 'L', stock: 3 }]);
  ps.reserve(db, { productId: 'p1', variantId: m.id, qty: 2 });
  assert.deepEqual(ps.release(db, { productId: 'p1', variantId: m.id, qty: 2 }), { restored: true });
  assert.equal(variantStock(db, m.id), 3); assert.equal(stockOf(db, 'p1'), 6);
  // vendor drops size M while an order for it is still open
  withVariants(db, 'p1', [{ size: 'L', stock: 3 }]);
  assert.equal(stockOf(db, 'p1'), 3);
  assert.deepEqual(ps.release(db, { productId: 'p1', variantId: m.id, qty: 2 }), { restored: false, reason: 'variant_removed' });
  assert.equal(stockOf(db, 'p1'), 3, 'total still equals the sum of the options');
  assert.equal(variantStock(db, l.id), 3);
});

test('a pre-variant order line on a product that later gained variants is not restocked (would break the sum)', () => {
  const db = freshDb(); addProduct(db, 'p1', 4);
  withVariants(db, 'p1', [{ size: 'M', stock: 2 }]);
  assert.deepEqual(ps.release(db, { productId: 'p1', qty: 1 }), { restored: false, reason: 'no_variant' });
  assert.equal(stockOf(db, 'p1'), 2);
});

test('release on a deleted product is a harmless no-op', () => {
  const db = freshDb();
  assert.deepEqual(ps.release(db, { productId: 'gone', qty: 1 }), { restored: false, reason: 'product_gone' });
});

test('replacing variants keeps the id of an option whose size+colour is unchanged', () => {
  const db = freshDb(); addProduct(db, 'p1');
  const [m] = withVariants(db, 'p1', [{ size: 'M', colour: 'Black', stock: 1 }, { size: 'L', colour: 'Black', stock: 1 }]);
  const after = withVariants(db, 'p1', [{ size: 'm', colour: 'black', stock: 8 }, { size: 'XL', colour: 'Black', stock: 2 }]);
  assert.equal(after.length, 2);
  assert.equal(after[0].id, m.id, 'case-insensitive match keeps the id, so carts and orders still point at it');
  assert.equal(after[0].stock, 8);
  assert.equal(stockOf(db, 'p1'), 10);
  const cleared = ps.replaceVariants(db, 'p1', [], 'now', mkId);
  assert.deepEqual(cleared, []);
  assert.equal(ps.hasVariants(db, 'p1'), false);
  assert.equal(stockOf(db, 'p1'), 10, 'removing variants leaves the product total as it was');
});

test('variant input validation', () => {
  const bad = (list, re) => assert.throws(() => ps.readVariantList(list), (e) => e instanceof ps.VariantValidationError && re.test(e.message));
  bad('M', /list/);
  bad([{ stock: 1 }], /size, a colour, or both/);
  bad([{ size: 'M', colour: 'Red' }, { size: 'm', colour: 'RED' }], /listed twice/);
  bad([{ size: 'M', stock: -1 }], /whole number/);
  bad([{ size: 'M', stock: 1.5 }], /whole number/);
  bad([{ size: 'M', stock: 100001 }], /whole number/);
  bad([{ size: 'x'.repeat(31) }], /30 characters/);
  bad(Array.from({ length: 61 }, (_, i) => ({ size: `S${i}` })), /up to 60/);
  assert.deepEqual(ps.readVariantList([{ size: ' M ', colour: '', stock: '3' }]), [{ size: 'M', colour: '', stock: 3 }]);
  assert.equal(ps.labelOf({ size: 'M', colour: 'Black' }), 'M / Black');
  assert.equal(ps.labelOf({ size: '', colour: 'Black' }), 'Black');
});

test('every stock change in the server goes through productStock (no raw UPDATE of stock elsewhere)', () => {
  const dir = __dirname;
  const offenders = [];
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js') || f.endsWith('.test.js') || f === 'productStock.js') continue;
    const src = read(f);
    if (/UPDATE mall_products SET stock\s*=\s*stock\s*[-+]/.test(src)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], 'raw stock arithmetic found outside productStock.js');
  const callers = { 'index.js': 5, 'marketplaceOrders.js': 2, 'storeAjo.js': 2, 'accountLifecycle.js': 1 };
  for (const [f, min] of Object.entries(callers)) {
    const calls = (read(f).match(/productStock\.(reserve|release)\(/g) || []).length;
    assert.ok(calls >= min, `${f} should call the helper at least ${min} times, found ${calls}`);
  }
});

test('checkout keeps two sizes of one product as two lines and stores the choice on the order line', () => {
  const index = read('index.js');
  assert.match(index, /const key = `\$\{productId\}\\u0000\$\{variantId \|\| ""\}`/);
  assert.match(index, /INSERT INTO mall_order_items \(id, orderId, productId, vendorId, vendorName, name, price, quantity, imageEmoji, imageColor, status, variantId, variantLabel\)/);
  assert.match(index, /productStock\.reserve\(db, \{ productId, variantId, qty, now \}\)/);
  assert.match(index, /SELECT productId, variantId, quantity, status FROM mall_order_items/, 'the unpaid-checkout rollback must know the variant');
});

test('product responses carry hasVariants on lists and variants on single-product responses', () => {
  const index = read('index.js');
  assert.match(index, /AS variantCount/);
  assert.match(index, /\.\.\.\(Number\(variantCount\) > 0 \? \{ hasVariants: true \} : \{\}\)/);
  assert.match(index, /res\.json\(\{ product: withVariants\(toClientProduct\(row\)\) \}\)/);
  assert.match(index, /app\.put\("\/api\/mall\/vendor\/products\/:id\/variants"/);
});

test('vendor stock edits cannot override per-option stock', () => {
  assert.match(read('index.js'), /productStock\.hasVariants\(db, current\.id\) \? current\.stock : \(f\.stock \?\? current\.stock\)/);
});

test('Store Ajo refuses products that need a size/colour choice', () => {
  const db = freshDb(); addProduct(db, 'p1');
  withVariants(db, 'p1', [{ size: 'M', stock: 3 }]);
  assert.equal(ps.reserve(db, { productId: 'p1', qty: 1 }).code, 'variant_required');
  // B146 superseded the old refusal: Store Ajo now carries the explicit size/colour choice into the reservation.
  assert.match(read('storeAjo.js'), /productStock\.reserve\(db, \{ productId, variantId, qty: 1/);
});

// ---- client-side cart logic (pure helpers, compile the TypeScript source before loading) ----
// Node's CommonJS loader cannot parse TypeScript `export type` declarations. Keep the
// test dependency-light by compiling this one pure helper to a temporary directory.
const helperOut = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-variant-utils-'));
const emptyTypeRoots = path.join(helperOut, 'empty-types');
fs.mkdirSync(emptyTypeRoots);
const tscArgs = ['src/marketplaceStoreUtils.ts', '--target', 'ES2020', '--module', 'commonjs', '--outDir', helperOut, '--skipLibCheck', '--typeRoots', emptyTypeRoots, '--pretty', 'false'];
const tscVersion = execFileSync('tsc', ['-v'], { encoding: 'utf8' });
const tscMajor = Number((tscVersion.match(/(\d+)\./) || [])[1]);
if (tscMajor >= 6) tscArgs.push('--ignoreConfig');
execFileSync('tsc', tscArgs, { cwd: path.resolve(__dirname, '..'), stdio: 'pipe' });
const u = require(path.join(helperOut, 'marketplaceStoreUtils.js'));
const shirt = { id: 'p1', name: 'Shirt', stock: 7, price: 100 };
const vs = [
  { id: 'a', size: 'M', colour: 'Black', stock: 2 }, { id: 'b', size: 'L', colour: 'Black', stock: 0 },
  { id: 'c', size: 'M', colour: 'White', stock: 5 },
];

test('cart: two sizes of one product are two lines; the same option merges and is capped by that option', () => {
  let cart = u.cartAdd([], shirt, 1, vs[0]);
  cart = u.cartAdd(cart, shirt, 1, vs[2]);
  assert.equal(cart.length, 2);
  cart = u.cartAdd(cart, shirt, 5, vs[0]);
  assert.equal(cart.length, 2);
  assert.equal(cart.find((l) => l.variant.id === 'a').quantity, 2, 'capped at the option stock (2), not the product total (7)');
});

test('cart: a sold-out option cannot be added; products without variants still cap by product stock', () => {
  assert.equal(u.cartAdd([], shirt, 1, vs[1]).length, 0);
  const plain = { id: 'p2', stock: 3 };
  const cart = u.cartAdd(u.cartAdd([], plain, 2), plain, 5);
  assert.equal(cart.length, 1); assert.equal(cart[0].quantity, 3);
});

test('cart: change and remove act on one line by key, and a line at zero disappears', () => {
  let cart = u.cartAdd(u.cartAdd([], shirt, 1, vs[0]), shirt, 3, vs[2]);
  const ka = u.cartLineKey('p1', 'a'), kc = u.cartLineKey('p1', 'c');
  cart = u.cartChange(cart, kc, 1);
  assert.equal(cart.find((l) => l.variant.id === 'c').quantity, 4);
  cart = u.cartChange(cart, kc, 5);
  assert.equal(cart.find((l) => l.variant.id === 'c').quantity, 5, 'cannot pass the option stock of 5');
  cart = u.cartChange(cart, ka, -1);
  assert.equal(cart.length, 1);
  assert.equal(u.cartRemove(cart, kc).length, 0);
  assert.notEqual(ka, kc);
  assert.equal(u.cartLineKey('p1'), 'p1::');
});

test('picker logic: axes, matching option, and greying out sold-out values', () => {
  assert.deepEqual(u.variantAxes(vs), { sizes: ['M', 'L'], colours: ['Black', 'White'] });
  assert.equal(u.findVariant(vs, 'M', 'White').id, 'c');
  assert.equal(u.findVariant(vs, 'M'), null, 'both axes are needed');
  assert.equal(u.findVariant(vs, undefined, 'White'), null);
  const sizeOnly = [{ id: 's', size: 'S', stock: 1 }, { id: 'm', size: 'M', stock: 1 }];
  assert.equal(u.findVariant(sizeOnly, 'M', undefined).id, 'm', 'a product with only sizes ignores colour');
  assert.equal(u.axisValueInStock(vs, 'size', 'L'), false, 'L only exists as Black, which is sold out');
  assert.equal(u.axisValueInStock(vs, 'size', 'M'), true);
  assert.equal(u.axisValueInStock(vs, 'colour', 'Black', 'L'), false);
  assert.equal(u.axisValueInStock(vs, 'colour', 'Black', 'M'), true);
  assert.equal(u.variantLabel(vs[0]), 'M / Black');
  assert.equal(u.lineStockCap(shirt, vs[2]), 5);
  assert.equal(u.lineStockCap({ stock: 500 }), 99);
});

test('client wiring: checkout sends variantId, cards ask for a choice, vendor sees the option', () => {
  assert.match(read('../src/marketplace.ts'), /\.\.\.\(x\.variant\?\{variantId:x\.variant\.id\}:\{\}\)/);
  assert.match(read('../src/MarketplaceScreen.tsx'), /if\(p\.hasVariants\)\{setDetail\(p\);return;\}/);
  assert.match(read('../src/MarketplaceScreen.tsx'), /m\.lineKey\(i\.product\.id,i\.variant\?\.id\)/);
  assert.match(read('../src/VendorDashboard.tsx'), /it\.variantLabel\?/);
  assert.match(read('index.js'), /variantId: r\.variantId \|\| null, variantLabel: r\.variantLabel \|\| null/);
});
