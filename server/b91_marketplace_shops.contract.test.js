const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('server exposes a public shop directory and a vendorId product filter', () => {
  const idx = read('server/index.js');
  assert.match(idx, /app\.get\("\/api\/mall\/vendors"/);
  assert.match(idx, /COALESCE\(v\.status, 'active'\) = 'active'\s+GROUP BY v\.id/);
  assert.match(idx, /p\.vendorId = \?/);
});
test('client wires shops through api, hook and screen', () => {
  assert.match(read('src/marketplace.ts'), /export async function listShops/);
  const hook = read('src/useMarketplace.ts');
  assert.match(hook, /listProducts\(query,category,searchOptions\(\)\)/);
  assert.match(hook, /\.\.\.\(vendorId\?\{vendorId\}:\{\}\)/);
  assert.match(hook, /vendorId,setVendorId,shops/);
  const screen = read('src/MarketplaceScreen.tsx');
  assert.match(screen, /<ShopRail /);
  assert.match(screen, /<ShopHeader /);
  assert.match(screen, /useColumns\(\)/);
  assert.match(read('src/marketplaceStoreUtils.ts'), /2: '48\.5%'/);
});
test('runtime ReferenceErrors fixed: setError, useModalFocus, setNexaTextScale are declared/imported', () => {
  assert.match(read('src/useMarketplace.ts'), /\[error,setError\]=useState\(''\)/);
  assert.match(read('src/HomeCommandCenter.tsx'), /import \{ useModalFocus \} from '\.\/modalFocus'/);
  assert.match(read('src/NexaTextSizeControl.tsx'), /setNexaTextScale, useNexaTextScale/);
});
