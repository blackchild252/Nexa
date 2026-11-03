const test=require('node:test');
const CURRENT_VERSION = require('../package.json').version;
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const json=p=>JSON.parse(read(p));

test('M3450 B222 is frozen historical evidence',()=>{assert.match(read('B222_REPORT.md'),/V5\.98\.74 B222/);assert.doesNotMatch(read('scripts/release-gate.mjs'),/v5_98_74_b222_reconciliation\.contract\.test\.js/)});
test('M3457 Expo Router entry remains canonical',()=>assert.equal(json('package.json').main,'expo-router/entry'));
test('M3458 account security contract remains present',()=>assert.match(read('server/index.js'),/auth\.authMiddleware/));
test('M3459 Subscription Centre remains server-authoritative',()=>{assert.match(read('server/subscriptions.js'),/auth\.authMiddleware/);assert.match(read('server/subscriptions.js'),/idempotencyKey/);assert.match(read('src/Subscription.tsx'),/Sky Wallet auto-pay/)});
test('M3460 subscription plans remain Regular Premium VIP',()=>{const s=read('server/subscriptions.js');for(const p of ['regular','premium','vip']) assert.match(s,new RegExp(`id: "${p}"`))});
test('M3461 scheduled plan changes remain renewal-bound',()=>assert.match(read('server/subscriptions.js'),/nextPlanId/));
test('M3462 cancellation disables auto-pay',()=>assert.match(read('server/subscriptions.js'),/status='cancelled',autoPay=0/));
test('M3463 vendor and user subscriptions remain separate',()=>{assert.match(read('server/subscriptionHub.js'),/userSubscription/);assert.match(read('server/subscriptionHub.js'),/vendorSubscription/);assert.match(read('server/subscriptionHub.js'),/independent: true/)});
test('M3464 Aami remains separate from SkyMoney cash',()=>assert.match(read('B209_REPORT.md'),/two balances together/));
test('M3465 PPV remains bounded by active subscription allocation',()=>assert.match(read('B208_REPORT.md'),/bounded PPV allocation rules/));
test('M3466 Yaayz and Zeeza remain canonical destinations',()=>{const s=read('src/nexaNavigation.ts');assert.match(s,/zeeza:/);assert.match(s,/yaayz:/)});
test('M3467 Add/Search/Home quick access remains declared',()=>{const s=read('src/nexaRouteInventory.ts');assert.match(s,/search','add','home','menu/)});
test('M3468 accessibility authorities remain active',()=>{assert.match(read('src/interactionAccessibility.ts'),/minTouchTarget/);assert.match(read('src/NexaTextSizeControl.tsx'),/Device accessibility scaling/)});
test('M3469 reduced motion remains authoritative',()=>assert.match(read('src/motion.tsx'),/reducedMotion/));
test('M3470 vendor AI credential isolation remains active',()=>{assert.match(read('server/index.js'),/requireVendorAccess/);assert.doesNotMatch(read('src/VendorPhotos.tsx'),/OPENAI_API_KEY/)});
test('M3471 AdMob sample identifiers are absent',()=>{assert.doesNotMatch(read('app.json'),/3940256099942544/);assert.doesNotMatch(read('src/YaayzNativeAd.tsx'),/3940256099942544/)});
test('M3472 store production profile is structurally configured',()=>{const e=json('eas.json');assert.equal(e.build.production.environment,'production');assert.equal(e.build.production.channel,'production');assert.equal(e.build.production.android.buildType,'app-bundle')});
test('M3473 legal publication blockers are explicit',()=>{assert.match(read('docs/legal/LEGAL_PUBLICATION_CHECKLIST.md'),/Replace privacy contact placeholder/);assert.match(read('docs/legal/PRIVACY_POLICY.md'),/REPLACE WITH NEXA PRIVACY CONTACT/);assert.match(read('docs/legal/TERMS_OF_SERVICE.md'),/REPLACE WITH NEXA LEGAL CONTACT/)});
test('M3474 launch certification is fail-closed and release gate registers B223',()=>{assert.match(read('server/productionLaunchCertification.js'),/NEXA_STRICT_LAUNCH/);assert.match(read('server/productionLaunchCertification.js'),/NEXA_LAUNCH_CERTIFIED/);assert.ok(fs.existsSync(path.join(root,"server/v5_98_75_b223_launch_readiness.contract.test.js")))})
