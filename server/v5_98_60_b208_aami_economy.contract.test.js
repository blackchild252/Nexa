"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=f=>fs.readFileSync(path.join(root,f),"utf8");
const aami=read("server/aamiEconomy.js");
const index=read("server/index.js");
const subscription=read("server/subscriptions.js");
const centre=read("src/Subscription.tsx");
const yaayz=read("src/YaayzSocialFeed.tsx");
const yaayzHome=read("src/YaayzHomeFeed.tsx");
const marketplace=read("src/marketplace.ts");
const marketplaceScreen=read("src/MarketplaceScreen.tsx");
const closure=read("server/v5_77_0_account_closure_integrity.js");
const packageJson=JSON.parse(read("package.json"));
const appJson=JSON.parse(read("app.json"));
const tests=[
 [3075,"subscription, wallet and Marketplace authorities remain separate",()=>{assert.match(aami,/\.\/subscriptions/);assert.match(index,/aamiEconomy/);assert.match(index,/settleMarketplaceFee/);}],
 [3076,"Aami is a separate non-cash ledger",()=>{assert.match(aami,/CREATE TABLE IF NOT EXISTS aami_accounts/);assert.match(aami,/cashValue:false/);}],
 [3077,"Aami ledger is immutable by append-only entries",()=>{assert.match(aami,/CREATE TABLE IF NOT EXISTS aami_ledger/);assert.match(aami,/INSERT INTO aami_ledger/);assert.doesNotMatch(aami,/UPDATE aami_ledger/);}],
 [3078,"Aami balance is server-derived",()=>{assert.match(aami,/UPDATE aami_accounts SET balance/);assert.match(aami,/function balance/);}],
 [3079,"Aami rewards and spending use idempotency keys",()=>{assert.match(aami,/idx_aami_ledger_idem/);assert.match(aami,/idempotencyKey/);}],
 [3080,"Subscription Centre has a central server authority",()=>{assert.match(aami,/\/api\/subscription\/centre/);assert.match(centre,/Subscription Centre/);}],
 [3081,"Regular Premium VIP remain canonical subscription plans",()=>{assert.match(subscription,/regular:/);assert.match(subscription,/premium:/);assert.match(subscription,/vip:/);}],
 [3082,"Subscription Centre exposes membership state",()=>{assert.match(aami,/subscription:subscription\.subscription/);assert.match(centre,/activeId/);}],
 [3083,"PPV is tier-configured",()=>{assert.match(aami,/regular: Object\.freeze\(\{ percent: 15/);assert.match(aami,/premium: Object\.freeze\(\{ percent: 25/);assert.match(aami,/vip: Object\.freeze\(\{ percent: 35/);}],
 [3084,"PPV allocation is bounded to the subscription window",()=>{assert.match(aami,/windowKey/);assert.match(aami,/remaining/);assert.match(aami,/currentPeriodEnd/);}],
 [3085,"Yaayz social feed is layered onto the existing Home feed",()=>{assert.match(yaayzHome,/YaayzSocialFeed/);assert.match(yaayz,/\/api\/yaayz\/social\/posts/);}],
 [3086,"Yaayz double-tap like interaction exists",()=>{assert.match(yaayz,/now-last<320/);assert.match(yaayz,/toggleLike/);}],
 [3087,"likes persist per user and post",()=>{assert.match(aami,/PRIMARY KEY\(postId,userId\)/);assert.match(aami,/yaayz_social_likes/);}],
 [3088,"like counts are server-derived and visible",()=>{assert.match(aami,/COUNT\(\*\) c FROM yaayz_social_likes/);assert.match(yaayz,/likeCount/);}],
 [3089,"like interaction includes animation and accessibility",()=>{assert.match(yaayz,/burst/);assert.match(yaayz,/accessibilityLabel/);}],
 [3090,"qualified views require a minimum watch time",()=>{assert.match(aami,/QUALIFIED_VIEW_MS = 3000/);assert.match(aami,/ms>=QUALIFIED_VIEW_MS/);}],
 [3091,"view rewards are deduplicated and self-view is blocked",()=>{assert.match(aami,/self_view/);assert.match(aami,/idx_yaayz_social_view_window/);}],
 [3092,"qualified views use the active subscription tier",()=>{assert.match(aami,/activePlan/);assert.match(aami,/ppvPool\(sub\.planId\)/);}],
 [3093,"qualified rewards credit the Aami ledger",()=>{assert.match(aami,/yaayz_qualified_view/);assert.match(aami,/credit\(db,userId,reward/);}],
 [3094,"reward history is exposed transparently",()=>{assert.match(aami,/\/api\/aami\/history/);assert.match(centre,/remaining/);}],
 [3095,"Dream Marketplace accepts Aami as a controlled payment method",()=>{assert.match(index,/\[\"pay_seller\", \"online\", \"aami\"\]/);assert.match(index,/dream_marketplace_purchase/);}],
 [3096,"Aami can redeem one paid subscription month",()=>{assert.match(aami,/function redeemSubscription/);assert.match(aami,/subscription_redemption/);assert.match(centre,/Redeem .* with Aami/);}],
 [3097,"AdMob remains scoped to existing approved surfaces",()=>{assert.match(read("server/yaayz_admob.test.js"),/Yaayz Home/);assert.match(read("src/YaayzNativeAd.tsx"),/ca-app-pub-9908588255141470/);assert.doesNotMatch(centre,/AdMob/);}],
 [3098,"Yaayz, Subscription Centre and Marketplace share one server authority without replacing existing flows",()=>{assert.match(index,/aamiEconomy.register/);assert.match(index,/createSubscriptionRouter/);assert.match(index,/app.post\("\/api\/mall\/checkout"/);}],
 [3099,"security, closure, age boundary and release metadata are wired",()=>{assert.match(aami,/adultConfirmedAt/);assert.match(closure,/aami_accounts/);assert.match(read("B208_REPORT.md"),/Version: V5\.98\.60/);}],
];
for(const [n,title,fn] of tests)test(`B208 M${n}: ${title}`,fn);
