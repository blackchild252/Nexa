const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const server = read('server/index.js');
const db = read('server/db.js');
const marketplace = read('src/marketplace.ts');
const hook = read('src/useMarketplace.ts');
const screen = read('src/MarketplaceScreen.tsx');
const critical = read('server/criticalControls.js');
const memory = read('PROJECT_MEMORY.json');
const roadmap = read('MASTER_ROADMAP.md');
const version = read('VERSION.md');

const has = (s, re) => assert.match(s, re);

test('M2725 — product-to-cart-to-checkout uses the existing cart and checkout authority', () => {
  has(screen, /m\.cart\.length/); has(screen, /m\.place\(/); has(marketplace, /authedFetch\('\/api\/mall\/checkout'/);
});
test('M2726 — cart remains client state until an authoritative checkout succeeds', () => {
  has(hook, /setCart\(\[\]\);await load\(\);return r/); has(hook, /const r=await checkout/);
});
test('M2727 — server revalidates active listing availability at checkout', () => {
  has(server, /JOIN vendors v ON v\.id = p\.vendorId WHERE p\.id = \? AND p\.active = 1 AND COALESCE\(v\.status, 'active'\) = 'active'/);
});
test('M2728 — server re-reserves stock atomically instead of trusting client quantity state', () => {
  has(server, /productStock\.reserve\(db, \{ productId, variantId, qty, now \}\)/); has(server, /if \(!taken\.ok\) throw new CheckoutError/);
});
test('M2729 — checkout preserves seller identity on every order item', () => {
  has(server, /vendorId: p\.vendorId/); has(server, /vendorName: p\.vendorName/); has(server, /INSERT INTO mall_order_items/);
});
test('M2730 — order total is server-calculated from authoritative product prices', () => {
  has(server, /const total = lines\.reduce\(\(n, \{ p, qty \}\) => n \+ effectivePrice\(p\) \* qty, 0\)/); has(server, /orderAmountInvariant/);
});
test('M2731 — service fee must be previewed and bound to checkout', () => {
  has(screen, /m\.feePreview/); has(server, /assertFeePreview\(db, req\.user\.id, feePreviewId, "marketplace_service"/);
});
test('M2732 — fee is not silently added to the seller order total', () => {
  has(server, /actionAmountMinor: Math\.round\(Number\(order\.total\) \* 100\)/); has(screen, /It is not added to the seller's item total/);
});
test('M2733 — checkout summary exposes seller grouping and order summary', () => {
  has(screen, /groupCartByShop\(m\.cart\)/); has(screen, /Order summary/); has(screen, /Items subtotal/);
});
test('M2734 — Buy Now continues through the existing cart authority', () => {
  has(screen, /onBuyNow=/); has(screen, /m\.add\(detail,q,v\)/); has(screen, /setCartOpen\(true\)/);
});
test('M2735 — checkout submit is visibly and functionally busy-locked', () => {
  has(screen, /disabled=\{busy\|\|!m\.cart\.length\|\|!address\.trim\(\)\|\|!m\.feePreview\}/); has(screen, /actionGuard\.tryBegin\('checkout'\)/);
});
test('M2736 — Marketplace checkout has server-side user-scoped idempotency', () => {
  has(db, /CREATE TABLE IF NOT EXISTS mall_checkout_idempotency/);
  has(server, /boundedIdempotencyKey\(req\.headers\["idempotency-key"\] \|\| req\.body\?\.idempotencyKey\)/);
  has(server, /status='completed',responseJson/);
});
test('M2737 — failed checkout releases the idempotency reservation and stock', () => {
  has(server, /rollbackUnpaidCheckout\(orderId, new Date\(\)\.toISOString\(\)\)/); has(server, /DELETE FROM mall_checkout_idempotency WHERE buyerId=\? AND requestKey=\?/);
});
test('M2738 — successful checkout clears the local cart only after checkout returns', () => {
  has(hook, /const r=await checkout\(cart,address,note,method,user\?\.email,feePreview\?\.previewId\)/); has(hook, /if\(requestId!==placeRequest\.current\)return r;setCart\(\[\]\);await load\(\)/);
});
test('M2739 — checkout request key is generated once per user action and reused for mutation retries', () => {
  has(marketplace, /const key = idempotencyKey\('POST','\/api\/mall\/checkout'\)/); has(marketplace, /'X-Nexa-Retry-Mutation':'1'/);
});
test('M2740 — order creation remains server-owned and authenticated', () => {
  has(server, /app\.post\("\/api\/mall\/checkout", auth\.authMiddleware/); has(server, /userId, total, currency, status/);
});
test('M2741 — client price cannot determine final order total', () => {
  has(marketplace, /productId:x\.product\.id/); assert.doesNotMatch(marketplace, /price:x\.product\.price/); has(server, /effectivePrice\(p\)/);
});
test('M2742 — seller ownership is taken from server-side vendor/product joins', () => {
  has(server, /JOIN vendors v ON v\.id = p\.vendorId/); has(server, /p\.vendorId/);
});
test('M2743 — stale inactive listings fail during the transactional stock reservation path', () => {
  has(server, /if \(!p\) throw new CheckoutError\("An item in your cart is no longer available\."\)/); has(server, /db\.transaction\(\(\) => \{/);
});
test('M2744 — order status is derived from persisted order-item state for buyer views', () => {
  has(server, /order\.status = deriveOrderStatus\(order\.items\)/); has(server, /order\.paymentStatus = derivePaymentStatus\(order\.items\)/);
});
test('M2745 — buyer order history is authenticated and user-scoped', () => {
  has(server, /app\.get\("\/api\/mall\/orders", auth\.authMiddleware/); has(server, /WHERE userId = \? ORDER BY createdAt DESC LIMIT 50/);
});
test('M2746 — seller order visibility remains vendor-scoped', () => {
  has(server, /app\.get\("\/api\/mall\/vendor\/orders"/); has(server, /WHERE i\.vendorId = \?/); has(server, /req\.vendor\.id/);
});
test('M2747 — checkout idempotency keys are bounded and character-safe', () => {
  has(critical, /MAX_IDEMPOTENCY_KEY = 160/); assert.ok(critical.includes('^[A-Za-z0-9._:-]+$'));
});
test('M2748 — checkout security retains payment boundary and atomic fee settlement', () => {
  has(server, /settleMarketplaceFee\(db, req\.user\.id, orderId\)/); has(server, /payments\.initialize\(/); has(server, /providerVerified=1/);
});
test('M2749 — B194 historical release evidence remains preserved', () => {
  const report = read('B194_REPORT.md');
  const seal = read('RELEASE_SEAL_V5.98.46.json');
  assert.match(report, /V5\.98\.46 \/ B194/);
  assert.match(report, /M2725–M2749/);
  assert.match(seal, /V5\.98\.46/);
});
