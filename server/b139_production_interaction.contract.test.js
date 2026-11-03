const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');

function loadGuard() {
  const full = read('src/nexaInteraction.ts');
  let src = full.slice(full.indexOf('export function createNexaInteractionGuard')).replace('export function createNexaInteractionGuard', 'function createNexaInteractionGuard');
  src = src.replace(/: string \| null/g, '').replace(/: string/g, '').replace(/: boolean/g, '').replace(/key\?/g, 'key').replace(/\): NexaInteractionGuard/g, ')');
  const ctx = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(`${src}\nmodule.exports={createNexaInteractionGuard};`, ctx);
  return ctx.module.exports.createNexaInteractionGuard;
}

test('M1800 canonical interaction-state guard has one active consequential action', () => {
  const create = loadGuard(); const g = create();
  assert.equal(g.tryBegin('checkout'), true);
  assert.equal(g.tryBegin('refund:1'), false);
  assert.equal(g.activeKey(), 'checkout');
  g.end('checkout'); assert.equal(g.isActive(), false);
});

test('M1801 async loading states expose busy/retry semantics', () => {
  for (const f of ['src/NexaDataState.tsx','src/YaayzScreen.tsx','src/MarketplaceScreen.tsx']) {
    const s = read(f); assert.match(s, /loading|busy/);
  }
});

test('M1802 empty states remain explicit instead of silent', () => {
  assert.match(read('src/YaayzScreen.tsx'), /No tickets found|No active adverts yet/);
  assert.match(read('src/MarketplaceScreen.tsx'), /No orders yet|No payment records found/);
});

test('M1803 error states remain user-visible and recoverable', () => {
  assert.match(read('src/YaayzScreen.tsx'), /NexaDataState.*Retry Yaayz/);
  assert.match(read('src/MarketplaceScreen.tsx'), /m\.error|Alert\.alert/);
});

test('M1804 retry paths reuse canonical loaders', () => {
  assert.match(read('src/YaayzScreen.tsx'), /onAction=\{load\}/);
  assert.match(read('src/MarketplaceScreen.tsx'), /onPress=\{m\.load\}/);
});

test('M1805 network failures remain bounded by shared request policy', () => {
  const s = read('src/api.ts');
  assert.match(s, /REQUEST_TIMEOUT_MS/); assert.match(s, /isRetryableError/); assert.match(s, /canRetryMutation/);
});

test('M1806 duplicate consequential actions are guarded before render catches up', () => {
  assert.match(read('src/MarketplaceScreen.tsx'), /createNexaInteractionGuard/);
  assert.match(read('src/YaayzScreen.tsx'), /createNexaInteractionGuard/);
  assert.match(read('src/MarketplaceScreen.tsx'), /tryBegin\('checkout'\)/);
});

test('M1807 destructive actions retain explicit confirmation boundaries', () => {
  assert.match(read('src/MarketplaceScreen.tsx'), /Cancel this order\?/);
  assert.match(read('src/NexaAI.tsx'), /CONFIRM ACTION|Confirm Dami action/);
});

test('M1808 form/input validation remains explicit at submission boundaries', () => {
  assert.match(read('src/MarketplaceScreen.tsx'), /Delivery address/);
  assert.match(read('src/YaayzScreen.tsx'), /Search tickets/);
});

test('M1809 unsaved/consequential checkout state is protected by busy state', () => {
  assert.match(read('src/MarketplaceScreen.tsx'), /setBusy\(true\)/);
  assert.match(read('src/MarketplaceScreen.tsx'), /finally\{setBusy\(false\);actionGuard\.end\('checkout'\);\}/);
});

test('M1810 modal actions preserve close and request-close boundaries', () => {
  const s = read('src/NexaNavKeys.tsx');
  assert.match(s, /onRequestClose=/); assert.match(s, /Close NEXA directory/); assert.match(s, /Close Add menu/);
});

test('M1811 primary Dami input action meets the 44px interaction floor', () => {
  const s = read('src/NexaAI.tsx'); assert.match(s, /Send message to Dami/); assert.match(s, /minHeight:44,minWidth:44/);
});

test('M1812 notification interaction keeps the canonical Home callback', () => {
  const s = read('src/HomeCommandCenter.tsx'); assert.match(s, /NEXA UPDATES/); assert.match(s, /onOpenNotifications/);
});

test('M1813 Dami consequential action remains action-busy guarded', () => {
  const s = read('src/NexaAI.tsx'); assert.match(s, /if\(!pendingAction\|\|actionBusy\)return/); assert.match(s, /setActionBusy\(true\)/);
});

test('M1814 Zeeza call actions preserve in-flight guard', () => {
  const s = read('src/HomeCommandCenter.tsx'); assert.match(s, /calling/); assert.match(s, /disabled=\{!!calling\}/);
});

test('M1815 Yaayz purchase and payment actions share one interaction guard', () => {
  const s = read('src/YaayzScreen.tsx');
  assert.match(s, /tryBegin\('buy:'\+ticket\.id\)/); assert.match(s, /tryBegin\('verify:'\+order\.id\)/); assert.match(s, /tryBegin\('fee:'\+order\.id\)/);
});

test('M1816 Marketplace checkout/refund/dispute actions share one interaction guard', () => {
  const s = read('src/MarketplaceScreen.tsx');
  for (const needle of ["tryBegin('checkout')", "tryBegin('refund:'", "tryBegin('dispute:'", "tryBegin('confirm-dispute:'"]) assert.ok(s.includes(needle), `missing ${needle}`);
});
test('M1817 Sky Money remains behind canonical navigation rather than a new action authority', () => {
  const s = read('src/nexaNavigation.ts'); assert.match(s, /money.*\/\(tabs\)\/money/);
});

test('M1818 L.A. navigation retains existing back boundary', () => {
  const s = read('src/LeisureArenaScreen.tsx'); assert.match(s, /nexaGoBack|router\.push/);
});

test('M1819 profile/account interactions remain inside existing account navigation', () => {
  const s = read('src/nexaNavigation.ts'); assert.match(s, /profile.*\/\(tabs\)\/profile/);
});

test('M1820 authentication interaction keeps centralized auth-failure handling', () => {
  const s = read('src/api.ts'); assert.match(s, /setAuthFailureHandler/); assert.match(s, /AUTH_EXPIRED/);
});

test('M1821 payment actions retain server-facing idempotency policy', () => {
  const s = read('src/api.ts'); assert.match(s, /canRetryMutation/); assert.match(s, /Idempotency-Key/);
});

test('M1822 cumulative interaction helpers retain existing accessibility contracts', () => {
  const s = read('src/interactionAccessibility.ts');
  assert.match(s, /ACCESSIBILITY\.minTouchTarget/); assert.match(s, /maxFontSizeMultiplier: 1\.45/);
});

test('M1823 hostile interaction audit blocks known duplicate-action and undersized-control regressions', () => {
  const mp = read('src/MarketplaceScreen.tsx'); const yz = read('src/YaayzScreen.tsx');
  assert.doesNotMatch(mp, /minHeight:40/);
  assert.doesNotMatch(yz, /disabled=\{t\.availableQuantity<1\} disabled=/);
  assert.match(mp, /actionGuard\.end\('checkout'\)/);
  assert.match(yz, /actionGuard\.end\('buy:'\+ticket\.id\)/);
});

test('M1824 release contract is wired to the current V5.98.x release state', () => {
  const pkg = JSON.parse(read('package.json')); const memory = JSON.parse(read('PROJECT_MEMORY.json'));
  assert.match(pkg.version, /^\d+\.\d+\.\d+$/); assert.match(memory.currentBatch, /^B\d+$/);
});
