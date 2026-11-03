'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = f => fs.readFileSync(path.join(__dirname, '..', f), 'utf8');

test('weight is persisted, migrated, selected and validated at the server boundary', () => {
  const db = read('server/db.js');
  const api = read('server/index.js');
  assert.match(db, /ALTER TABLE mall_products ADD COLUMN weightKg REAL/);
  assert.match(api, /p\.weightKg/);
  assert.match(api, /parseWeightKg\(p\.weightKg, \{ required: creating \}\)/);
  assert.match(api, /INSERT INTO mall_products[\s\S]{0,300}weightKg/);
  assert.match(api, /UPDATE mall_products SET name=\?, description=\?, price=\?, weightKg=\?/);
});

test('vendor form validates and sends weight, and shopping surfaces render it accessibly', () => {
  const vendor = read('src/VendorDashboard.tsx');
  const detail = read('src/MarketplaceStorefront.tsx');
  const cart = read('src/MarketplaceScreen.tsx');
  assert.match(vendor, /accessibilityLabel="Product weight in kilograms"/);
  assert.match(vendor, /weightKg:Number\(weightKg\)/);
  assert.match(vendor, /p\.weightKg!=null/);
  assert.match(detail, /Product weight \$\{p\.weightKg\} kilograms/);
  assert.match(cart, /line weight \$\{Math\.round\(i\.product\.weightKg\*i\.quantity\*1000\)\/1000\} kilograms/);
});

test('governance contract parks live Central, LORDGISTICS and companion-app dependencies', () => {
  const doc = read('docs/MAIN_GOVERNANCE_DESIGN_AND_SHIPMENT_CONTRACT.md');
  assert.match(doc, /Central provider credentials[\s\S]*parked/);
  assert.match(doc, /LORDGISTICS live shipment booking/);
  assert.match(doc, /No shipment is claimed to have been created/);
  assert.match(doc, /Admin AAMI companion-app company selector\/runtime/);
});
