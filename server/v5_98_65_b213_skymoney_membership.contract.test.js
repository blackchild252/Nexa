const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const hub = () => read('server/skyMoneyHub.js');
const aami = () => read('server/aamiEconomy.js');
const subs = () => read('server/subscriptions.js');
const centre = () => read('src/Subscription.tsx');

const milestones = [
  ['M3210','SkyMoney keeps Cash and Aami as separate authoritative balances',()=>{const s=hub();assert.match(s,/kind: "cash"/);assert.match(s,/kind: "reward"/);assert.match(s,/Cash and Aami are displayed together but remain separate ledgers/);assert.match(s,/cannot be silently converted into cash/);assert.match(aami(),/cashValue:false/);}],
  ['M3211','Subscription Centre remains a SkyMoney sub-block with one server authority',()=>{assert.match(hub(),/subscriptionCentre:/);assert.match(hub(),/subscription: "SkyMoney sub-block"/);assert.match(aami(),/app\.get\('\/api\/subscription\/centre'/);assert.match(centre(),/Subscription Centre · Aami Economy/);assert.match(read('src/app/subscription.tsx'),/money\?view=subscription/);}],
  ['M3212','Free, Regular, Premium and VIP configuration matches the canonical values',()=>{const s=subs();for(const id of ['free','regular','premium','vip']) assert.match(s,new RegExp(`${id}: Object\\.freeze`));assert.match(s,/regular: Object\.freeze\(\{ id: "regular", name: "Regular", monthlyFeeMinor: 150_000, monthlyTargetMinor: 500_000, monthlyCapMinor: 600_000/);assert.match(s,/premium: Object\.freeze\(\{ id: "premium", name: "Premium", monthlyFeeMinor: 250_000, monthlyTargetMinor: 800_000, monthlyCapMinor: 1_000_000/);assert.match(s,/vip: Object\.freeze\(\{ id: "vip", name: "VIP", monthlyFeeMinor: 400_000, monthlyTargetMinor: 1_200_000, monthlyCapMinor: 1_500_000/);assert.match(s,/free: Object\.freeze\(\{ id: "free", name: "Free", monthlyFeeMinor: 0/);}],
  ['M3213','PPV and Aami subscription redemption are bounded to active tiers and controlled redemption',()=>{const s=aami();assert.match(s,/regular: Object\.freeze\(\{ percent: 15/);assert.match(s,/premium: Object\.freeze\(\{ percent: 25/);assert.match(s,/vip: Object\.freeze\(\{ percent: 35/);assert.match(s,/sub\?\.status === "active"/);assert.match(s,/current && current\.status!=='cancelled'/);assert.match(s,/debit\(db,userId,cost,"subscription_redemption"/);assert.match(centre(),/Redeem .* with Aami/);}],
  ['M3214','membership charges and service fees remain distinct, server-priced and preview-bound',()=>{const s=subs();assert.match(s,/kind.*membership/);assert.match(s,/kind.*service_fee/);assert.match(s,/SERVICE_FEES = Object\.freeze/);assert.match(centre(),/fixed service code/);assert.match(s,/assertFeePreview\(db, userId, previewId, serviceCode/);assert.match(s,/monthlyCapMinor/);assert.match(centre(),/transparent service charges/);}],
];
for (const [id,title,fn] of milestones) test(`${id} ${title}`,fn);
assert.equal(milestones.length,5);
