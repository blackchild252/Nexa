const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
let utils;
{
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'nexa-currency-cart-'));
  const source = fs.readFileSync(path.join(root, 'src/marketplaceStoreUtils.ts'), 'utf8');
  const transpiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS } });
  fs.writeFileSync(path.join(out, 'marketplaceStoreUtils.js'), transpiled.outputText);
  utils = require(path.join(out, 'marketplaceStoreUtils.js'));
}
const product = (id, currency) => ({ id, name: id, price: 10, currency, stock: 10 });
test('Marketplace cart rejects missing and unsupported currency instead of assuming NGN', () => {
  assert.equal(utils.cartCurrencyCompatibility([], product('unknown', '')).ok, false);
  assert.equal(utils.cartCurrencyCompatibility([], product('unsupported', 'ISK')).ok, false);
});
test('Marketplace cart enforces a single supported source currency', () => {
  const usd = { product: product('usd', 'USD'), quantity: 1 };
  assert.equal(utils.cartCurrencyCompatibility([usd], product('usd2', 'USD')).ok, true);
  const mixed = utils.cartCurrencyCompatibility([usd], product('ngn', 'NGN'));
  assert.equal(mixed.ok, false);
  assert.match(mixed.reason, /Remove the existing items/);
});
test('Marketplace hook and screen enforce cart currency and avoid default-NGN display', () => {
  const hook = fs.readFileSync(path.join(root, 'src/useMarketplace.ts'), 'utf8');
  const screen = fs.readFileSync(path.join(root, 'src/MarketplaceScreen.tsx'), 'utf8');
  assert.match(hook, /cartCurrencyCompatibility\(cart,p\)/);
  assert.match(hook, /previewMarketplaceFee\(total,currency\)/);
  assert.match(screen, /formatMajorCurrency\(p\.price,p\.currency,'en-NG'\)/);
  assert.doesNotMatch(screen, /currency:p\.currency\|\|'NGN'/);
  assert.match(screen, /Online checkout currently supports NGN orders only/);
});
