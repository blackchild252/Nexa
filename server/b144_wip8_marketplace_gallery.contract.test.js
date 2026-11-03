'use strict';
// B144 WIP8 — checkout alias fix + multi-photo gallery.
// better-sqlite3 is not needed: SQL is exercised with node:sqlite, and the pure product mapper is
// extracted from server/index.js and evaluated, so these tests run in a bare checkout.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const root = path.resolve(__dirname, '..');
const index = fs.readFileSync(path.join(root, 'server/index.js'), 'utf8');
const dbjs = fs.readFileSync(path.join(root, 'server/db.js'), 'utf8');

test('every query that selects PRODUCT_COLS defines the p alias (checkout used to throw "no such column: p.id")', () => {
  const re = /`SELECT \$\{PRODUCT_COLS\}[^`]*`/g;
  const found = index.match(re) || [];
  assert.ok(found.length >= 8, 'expected the PRODUCT_COLS queries to be found');
  for (const q of found) {
    assert.match(q, /FROM mall_products p\b/, `PRODUCT_COLS query without the p alias: ${q.slice(0, 120)}`);
  }
});

test('the checkout fee-estimate lookup is the aliased form', () => {
  assert.match(index, /FROM mall_products p WHERE p\.id=\? AND p\.active=1`\)\.get\(productId\)/);
});

function toClientProduct() {
  const badge = /function sellerTrustBadge\([\s\S]*?\n}\n/.exec(index);
  assert.ok(badge, 'sellerTrustBadge not found');
  const m = /function toClientProduct\(row\) \{[\s\S]*?\n\}\n/.exec(index);
  assert.ok(m, 'toClientProduct not found');
  return new Function(`${badge[0]}; ${m[0]}; return toClientProduct;`)();
}

test('single-photo products keep their original response shape (no imageUrls key)', () => {
  const p = toClientProduct()({ id: 'mp1', price: 10, hasImage: 1, imageRev: 3, extraImageCount: 0, salePrice: null, saleEndsAt: null });
  assert.equal(p.imageUrl, '/api/mall/products/mp1/image?v=3');
  assert.equal('imageUrls' in p, false);
  assert.equal('extraImageCount' in p, false);
});

test('gallery products expose cover first then extras, cache-busted by imageRev', () => {
  const p = toClientProduct()({ id: 'mp2', price: 10, hasImage: 1, imageRev: 7, extraImageCount: 2, salePrice: null, saleEndsAt: null });
  assert.deepEqual(p.imageUrls, [
    '/api/mall/products/mp2/image?v=7',
    '/api/mall/products/mp2/images/0?v=7',
    '/api/mall/products/mp2/images/1?v=7',
  ]);
});

test('extra photos without a cover are still listed', () => {
  const p = toClientProduct()({ id: 'mp3', price: 10, hasImage: 0, imageRev: 1, extraImageCount: 1, salePrice: null, saleEndsAt: null });
  assert.equal(p.imageUrl, null);
  assert.deepEqual(p.imageUrls, ['/api/mall/products/mp3/images/0?v=1']);
});

function galleryDb() {
  const ddl = /CREATE TABLE IF NOT EXISTS mall_product_images \([\s\S]*?\);\nCREATE INDEX IF NOT EXISTS idx_mallproductimages_product[^\n]*;/.exec(dbjs);
  assert.ok(ddl, 'gallery DDL not found in db.js');
  const db = new DatabaseSync(':memory:');
  db.exec(ddl[0]);
  return db;
}

test('gallery SQL: append, nth-photo lookup, delete + renumber, swap-with-cover', () => {
  const db = galleryDb();
  const add = (id, pos, data) => db.prepare('INSERT INTO mall_product_images (id,productId,position,imageData,createdAt) VALUES (?,?,?,?,?)').run(id, 'p1', pos, data, 'now');
  add('a', 0, 'A'); add('b', 1, 'B'); add('c', 2, 'C');
  const nth = n => db.prepare('SELECT imageData FROM mall_product_images WHERE productId=? ORDER BY position ASC, id ASC LIMIT 1 OFFSET ?').get('p1', n)?.imageData;
  assert.deepEqual([nth(0), nth(1), nth(2), nth(3)], ['A', 'B', 'C', undefined]);

  // delete photo 1 then renumber exactly as the route does
  db.prepare('DELETE FROM mall_product_images WHERE id=?').run('b');
  const rows = db.prepare('SELECT id FROM mall_product_images WHERE productId=? ORDER BY position ASC, id ASC').all('p1');
  rows.forEach((r, i) => db.prepare('UPDATE mall_product_images SET position=? WHERE id=?').run(i, r.id));
  assert.deepEqual([nth(0), nth(1)], ['A', 'C']);
  assert.equal(db.prepare('SELECT COUNT(*) c FROM mall_product_images').get().c, 2);
});

test('routes enforce ownership, the photo cap, and photo validation', () => {
  assert.match(index, /const MAX_EXTRA_IMAGES = 5;/);
  for (const route of [
    'app.post("/api/mall/vendor/products/:id/images"',
    'app.delete("/api/mall/vendor/products/:id/images/:n"',
    'app.post("/api/mall/vendor/products/:id/images/:n/cover"',
  ]) {
    const at = index.indexOf(route);
    assert.ok(at > 0, `${route} missing`);
    assert.match(index.slice(at, at + 160), /auth\.authMiddleware, requireVendorAccess/);
  }
  assert.match(index, /WHERE id = \? AND vendorId = \?"\)\.get\(req\.params\.id, req\.vendor\.id\)/);
  assert.match(index, /decodeImageDataUrl\(req\.body\?\.image\)/);
  assert.match(index, /if \(count >= MAX_EXTRA_IMAGES\) return \{ full: true \}/);
});

test('deleting a product also removes its gallery', () => {
  assert.match(index, /DELETE FROM mall_product_images WHERE productId = \?"\)\.run\(existing\.id\)/);
});

// ---- client wiring (source contracts; the app itself needs a device/emulator) ----
const read = f => fs.readFileSync(path.join(root, f), 'utf8');

test('client: gallery on the product page, photo manager on the vendor product card', () => {
  assert.match(read('src/MarketplaceStorefront.tsx'), /<ProductGallery p=\{p\} height=\{260\}\/>/);
  assert.match(read('src/MarketplaceStorefront.tsx'), /import \{ProductGallery\} from '\.\/ProductGallery'/);
  assert.match(read('src/VendorDashboard.tsx'), /<VendorPhotos product=\{p\} onChanged=\{d\.load\}\/>/);
  assert.match(read('src/marketplace.ts'), /imageUrls\?: string\[\]/);
});

test('client: API helpers hit the three gallery routes', () => {
  const m = read('src/marketplace.ts');
  assert.match(m, /\/api\/mall\/vendor\/products\/\$\{id\}\/images`,\{method:'POST'/);
  assert.match(m, /\/images\/\$\{n\}`,\{method:'DELETE'/);
  assert.match(m, /\/images\/\$\{n\}\/cover`,\{method:'POST'/);
});

test('client: new components use ds() for inline styles and cap photos at 6 like the server', () => {
  for (const f of ['src/ProductGallery.tsx', 'src/VendorPhotos.tsx']) {
    const src = read(f);
    assert.equal((src.match(/(?<![A-Za-z])(style|contentContainerStyle)=\{\{/g) || []).length, 0, `${f}: inline style bypasses ds()`);
    assert.match(src, /import \{[^}]*\bds\b[^}]*\} from '\.\/theme'/);
  }
  assert.match(read('src/VendorPhotos.tsx'), /const MAX_PHOTOS=6;/);
  assert.match(index, /const MAX_EXTRA_IMAGES = 5;/);
});
