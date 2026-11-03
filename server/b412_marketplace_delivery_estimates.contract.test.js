const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const delivery = require('./marketplaceDelivery');
const source = fs.readFileSync(path.join(__dirname, 'index.js'), 'utf8');
const client = fs.readFileSync(path.join(__dirname, '..', 'src', 'marketplace.ts'), 'utf8');
const hook = fs.readFileSync(path.join(__dirname, '..', 'src', 'useMarketplace.ts'), 'utf8');
const screen = fs.readFileSync(path.join(__dirname, '..', 'src', 'MarketplaceScreen.tsx'), 'utf8');
const vendor = fs.readFileSync(path.join(__dirname, '..', 'src', 'VendorDashboard.tsx'), 'utf8');

function dbMock() {
  const rows = new Map();
  const products = new Map([
    ['p1', { id:'p1', vendorId:'v1', currency:'NGN', active:1, stock:10, vendorName:'Shop One' }],
    ['p2', { id:'p2', vendorId:'v2', currency:'NGN', active:1, stock:10, vendorName:'Shop Two' }],
  ]);
  return {
    exec() {},
    prepare(sql) {
      return {
        run(...args) {
          if (/INSERT INTO mall_vendor_delivery_settings/.test(sql)) rows.set(args[0], { vendorId:args[0], mode:args[1], amount:args[2], currency:args[3], updatedAt:args[4] });
          return { changes:1 };
        },
        get(...args) {
          if (/mall_vendor_delivery_settings/.test(sql)) return rows.get(args[0]) || null;
          if (/mall_products/.test(sql)) return products.get(args[0]) || null;
          return null;
        },
      };
    },
  };
}

const stock = {
  hasVariants: () => false,
  variantsOf: () => [],
};

test('delivery settings accept flat and per-item seller policies', () => {
  const db = dbMock();
  delivery.ensureSchema(db);
  assert.equal(delivery.saveSettings(db, 'v1', { mode:'flat', amount:1500 }).amount, 1500);
  assert.equal(delivery.saveSettings(db, 'v1', { mode:'per_item', amount:500 }).mode, 'per_item');
  assert.throws(() => delivery.saveSettings(db, 'v1', { mode:'zone', amount:500 }), /flat or per_item/);
});

test('delivery estimate is grouped by seller and multiplies per-item policy', () => {
  const db = dbMock();
  delivery.saveSettings(db, 'v1', { mode:'per_item', amount:500 });
  delivery.saveSettings(db, 'v2', { mode:'flat', amount:1000 });
  const out = delivery.estimateForLines(db, [{productId:'p1',quantity:2},{productId:'p2',quantity:3}], stock);
  assert.equal(out.total, 2000);
  assert.equal(out.status, 'estimated');
  assert.equal(out.vendors.find(v => v.vendorId === 'v1').amount, 1000);
  assert.equal(out.vendors.find(v => v.vendorId === 'v2').amount, 1000);
  assert.equal(out.finalConfirmationRequired, true);
});

test('unconfigured sellers are explicit instead of inventing a delivery fee', () => {
  const out = delivery.estimateForLines(dbMock(), [{productId:'p1',quantity:1}], stock);
  assert.equal(out.total, 0);
  assert.equal(out.status, 'partially_configured');
  assert.equal(out.vendors[0].status, 'seller_not_configured');
});

test('delivery estimate preserves Marketplace variant validation', () => {
  const variantStock = { hasVariants: () => true, variantsOf: () => [{id:'v1',size:'M',stock:2}] };
  assert.throws(() => delivery.estimateForLines(dbMock(), [{productId:'p1',quantity:1}], variantStock), /Choose an option/);
});

test('client wiring exposes seller settings and buyer delivery estimates', () => {
  assert.match(source, /marketplaceDelivery/);
  assert.match(source, /\/api\/mall\/vendor\/delivery-settings/);
  assert.match(source, /\/api\/mall\/delivery-estimate/);
  assert.match(client, /getVendorDeliverySettings/);
  assert.match(client, /updateVendorDeliverySettings/);
  assert.match(client, /previewMarketplaceDelivery/);
  assert.match(hook, /deliveryEstimate/);
  assert.match(hook, /previewMarketplaceDelivery/);
  assert.match(screen, /Delivery estimate/);
  assert.match(screen, /final delivery fee is confirmed by the seller/);
  assert.match(vendor, /Delivery settings/);
});
