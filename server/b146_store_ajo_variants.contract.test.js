'use strict';
// B146 / CP3 — Store Ajo variant continuity.
// Store Ajo now carries an explicit size/colour choice through reservation and the savings account. Behaviour runs
// against a real SQLite database through node:sqlite (no node_modules needed): the real route handler is called with a fake app.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');
const ps = require('./productStock');
const { createStoreAjoRouter } = require('./storeAjo');

const read = (f) => fs.readFileSync(path.join(__dirname, f), 'utf8');

function setup() {
  const db = new DatabaseSync(':memory:');
  db.transaction = (fn) => (...a) => { db.exec('BEGIN'); try { const r = fn(...a); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; } };
  db.exec(`
    CREATE TABLE vendors (id TEXT PRIMARY KEY, shopName TEXT);
    CREATE TABLE mall_products (id TEXT PRIMARY KEY, vendorId TEXT, name TEXT, stock INTEGER NOT NULL DEFAULT 0, active INTEGER NOT NULL DEFAULT 1, price REAL, salePrice REAL, currency TEXT DEFAULT 'NGN', updatedAt TEXT);
    CREATE TABLE mall_order_items (id TEXT PRIMARY KEY, orderId TEXT, productId TEXT, quantity INTEGER);
    CREATE TABLE money_store_ajo_accounts (id TEXT PRIMARY KEY, userId TEXT NOT NULL, productId TEXT NOT NULL, productName TEXT NOT NULL, targetAmount REAL NOT NULL, currency TEXT NOT NULL DEFAULT 'NGN', status TEXT NOT NULL DEFAULT 'saving', interestRate REAL NOT NULL DEFAULT 0, discountRate REAL NOT NULL DEFAULT 0, termMonths INTEGER NOT NULL DEFAULT 2, variantId TEXT, variantLabel TEXT, orderId TEXT, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL);
    CREATE TABLE money_store_ajo_contributions (id TEXT PRIMARY KEY, ajoId TEXT NOT NULL, userId TEXT NOT NULL, amount REAL NOT NULL, currency TEXT NOT NULL, paymentRef TEXT UNIQUE NOT NULL, status TEXT, providerVerified INTEGER NOT NULL DEFAULT 0, feeStatus TEXT NOT NULL DEFAULT 'pending', feeChargeId TEXT, feePreviewId TEXT, createdAt TEXT, paidAt TEXT);
  `);
  ps.ensureSchema(db);
  db.prepare("INSERT INTO vendors(id,shopName) VALUES('v1','Shop')").run();
  const handlers = {};
  const app = { get: (p, ...h) => { handlers['GET ' + p] = h[h.length - 1]; }, post: (p, ...h) => { handlers['POST ' + p] = h[h.length - 1]; }, patch() {}, delete() {}, put() {} };
  let n = 0;
  createStoreAjoRouter({ db, auth: { authMiddleware: (q, r, next) => next() }, payments: { isEnabled: () => false }, genRowId: (p) => `${p}_${++n}` }).register(app);
  const call = (route, body) => {
    const out = { status: 200, body: null };
    const res = { status(c) { out.status = c; return res; }, json(b) { out.body = b; return res; } };
    handlers[route]({ user: { id: 'u1', email: 'u1@example.com' }, body, params: {}, query: {} }, res);
    return out;
  };
  return { db, call };
}
const addProduct = (db, id, stock, price = 20000) => db.prepare("INSERT INTO mall_products(id,vendorId,name,stock,active,price,currency) VALUES(?,?,?,?,1,?, 'NGN')").run(id, 'v1', `Item ${id}`, stock, price);
const stockOf = (db, id) => db.prepare('SELECT stock FROM mall_products WHERE id=?').get(id).stock;
const accounts = (db) => db.prepare('SELECT COUNT(*) AS n FROM money_store_ajo_accounts').get().n;

test('a product with size/colour options can be reserved with the selected option', () => {
  const { db, call } = setup();
  addProduct(db, 'shirt', 0);
  ps.replaceVariants(db, 'shirt', ps.readVariantList([{ size: 'M', colour: 'Blue', stock: 3 }, { size: 'L', colour: 'Blue', stock: 2 }]), '2026-10-01T00:00:00.000Z', (() => { let i = 0; return () => `mv_${++i}`; })());
  const r = call('POST /api/money/ajo/store', { productId: 'shirt', variantId: 'mv_1', termMonths: 3 });
  assert.equal(r.status, 201);
  assert.equal(r.body.account.variantId, 'mv_1');
  assert.equal(r.body.account.variantLabel, 'M / Blue');
  assert.equal(r.body.account.targetAmount, 20000);
  assert.equal(stockOf(db, 'shirt'), 4);
  assert.equal(db.prepare('SELECT stock FROM mall_product_variants WHERE id=?').get('mv_1').stock, 2);
});

test('a variant product without a selected option is refused without changing stock', () => {
  const { db, call } = setup();
  addProduct(db, 'shirt', 0);
  ps.replaceVariants(db, 'shirt', ps.readVariantList([{ size: 'M', colour: 'Blue', stock: 3 }]), '2026-10-01T00:00:00.000Z', () => 'mv_1');
  const r = call('POST /api/money/ajo/store', { productId: 'shirt', termMonths: 3 });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /Choose a size or colour/);
  assert.equal(accounts(db), 0);
  assert.equal(stockOf(db, 'shirt'), 3);
});

test('a product whose options are all sold out is also refused and nothing changes', () => {
  const { db, call } = setup();
  addProduct(db, 'cap', 0);
  ps.replaceVariants(db, 'cap', ps.readVariantList([{ size: 'S', colour: 'Red', stock: 0 }]), '2026-10-01T00:00:00.000Z', () => 'mv_x');
  const r = call('POST /api/money/ajo/store', { productId: 'cap', termMonths: 2 });
  assert.equal(r.status, 409);
  assert.equal(accounts(db), 0);
});

test('a plain product still works: 201, one unit reserved, price locked, no interest or discount', () => {
  const { db, call } = setup();
  addProduct(db, 'mug', 4, 15000);
  const r = call('POST /api/money/ajo/store', { productId: 'mug', termMonths: 4 });
  assert.equal(r.status, 201);
  assert.equal(r.body.account.targetAmount, 15000);
  assert.equal(r.body.account.interestRate, 0);
  assert.equal(r.body.account.discountRate, 0);
  assert.equal(r.body.account.termMonths, 4);
  assert.equal(stockOf(db, 'mug'), 3);
  assert.equal(accounts(db), 1);
});

test('a plain product with no stock is refused and no account is made', () => {
  const { db, call } = setup();
  addProduct(db, 'gone', 0);
  const r = call('POST /api/money/ajo/store', { productId: 'gone', termMonths: 2 });
  assert.equal(r.status, 409);
  assert.match(r.body.error, /out of stock/);
  assert.equal(accounts(db), 0);
});

test('the app exposes variant choices and carries the selected option into Store Ajo creation', () => {
  const ui = read('../src/StoreAjo.tsx');
  assert.doesNotMatch(ui, /filter\(\(p: any\) => Number\(p\.stock\) > 0 && !p\.hasVariants/);
  assert.match(ui, /Choose your locked item option/);
  assert.match(ui, /variantByProduct/);
  assert.match(ui, /variantId \?/);
});

test('variant continuity remains wired through deletion release and final pickup order creation', () => {
  const router = read('storeAjo.js');
  const schema = read('db.js');
  assert.match(router, /productStock\.release\(db, \{ productId: ajo\.productId, variantId: ajo\.variantId \|\| null/);
  assert.match(router, /variantId,variantLabel/);
  assert.match(router, /ajo\.variantId \|\| null, ajo\.variantLabel \|\| null/);
  assert.match(schema, /variantId TEXT/);
  assert.match(schema, /variantLabel TEXT/);
});
