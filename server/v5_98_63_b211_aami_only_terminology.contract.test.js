const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const banned = /Shopping Coins|Shopping Coin|shopping coins|shopping coin/;
const active = [
  'server/skyMoneyHub.js','src/MoneyDashboard.tsx','src/MarketplaceScreen.tsx','src/Subscription.tsx','VERSION.md'
];

test('B211 M3150 — active Aami terminology is audited', () => { for (const p of active) assert.doesNotMatch(read(p), banned); const m=JSON.parse(read('PROJECT_MEMORY.json')); assert.doesNotMatch(m.activeArchitecture.skyMoneyExperience,banned); });
test('B211 M3151 — SkyMoney server overview uses Aami', () => { const s=read('server/skyMoneyHub.js'); assert.match(s,/label: "Aami"/); assert.match(s,/rewardLedger: "Aami ledger"/); });
test('B211 M3152 — SkyMoney UI uses Aami as reward balance', () => { const s=read('src/MoneyDashboard.tsx'); assert.match(s,/>Aami</); assert.match(s,/Aami remains the internal reward balance/); });
test('B211 M3153 — Aami earning copy is Aami-only', () => { assert.match(read('src/MoneyDashboard.tsx'),/Earn Aami through useful NEXA activity/); });
test('B211 M3154 — Marketplace Aami payment copy is Aami-only', () => { assert.match(read('src/MarketplaceScreen.tsx'),/Pay with Aami/); });
test('B211 M3155 — Subscription Centre copy is Aami-only', () => { assert.match(read('src/Subscription.tsx'),/Aami is NEXA's internal reward balance/); });
test('B211 M3156 — project memory uses Aami-only active terminology', () => { const m=JSON.parse(read('PROJECT_MEMORY.json')); assert.match(m.activeArchitecture.skyMoneyExperience,/SkyMoney Cash \(real financial ledger\) and Aami \(internal reward ledger\)/); assert.doesNotMatch(m.activeArchitecture.skyMoneyExperience,banned); });
test('B211 M3157 — SkyMoney Cash remains the real-finance label', () => { assert.match(read('server/skyMoneyHub.js'),/SkyMoney Cash/); assert.match(read('src/MoneyDashboard.tsx'),/Real financial balance/); });
test('B211 M3158 — Aami remains the sole reward label', () => { assert.match(read('B211_REPORT.md'),/Aami.*sole internal reward balance/); });
test('B211 M3159 — Aami currency identifier is unchanged', () => { assert.match(read('server/skyMoneyHub.js'),/currency: "AAMI"/); });
test('B211 M3160 — Aami ledger authority remains unchanged', () => { assert.match(read('server/aamiEconomy.js'),/append-only|idempot/i); assert.match(read('server/aamiEconomy.js'),/aami_reward_events/); });
test('B211 M3161 — Aami earning rules remain present', () => { assert.match(read('server/aamiEconomy.js'),/ACTIVITY_RULES/); assert.match(read('server/aamiEconomy.js'),/yaayz_like/); });
test('B211 M3162 — Kitchen cashback still resolves to Aami', () => { assert.match(read('server/aamiEconomy.js'),/migrateKitchenCashback/); assert.match(read('server/index.js'),/kitchen_referral/); });
test('B211 M3163 — Marketplace Aami payment authority remains', () => { assert.match(read('server/index.js'),/aamiEconomy/); assert.match(read('src/MarketplaceScreen.tsx'),/pay==='aami'/); });
test('B211 M3164 — Subscription Centre remains under SkyMoney', () => { assert.match(read('server/skyMoneyHub.js'),/subscription: "SkyMoney sub-block"/); assert.match(read('src/MoneyDashboard.tsx'),/Subscription Centre/); });
test('B211 M3165 — frozen B209 evidence remains authoritative', () => { assert.match(read('B209_REPORT.md'),/Shopping Coins \(Aami\)/); });
test('B211 M3166 — frozen B210 evidence remains preserved', () => { assert.match(read('B210_REPORT.md'),/V5\.98\.62/); assert.match(read('B210_REPORT.md'),/Aami\/Shopping Coins/); });
test('B211 M3167 — active source has no stale terminology', () => { for (const p of active) assert.doesNotMatch(read(p), banned); const m=JSON.parse(read('PROJECT_MEMORY.json')); assert.doesNotMatch(m.activeArchitecture.skyMoneyExperience,banned); });
test('B211 M3168 — client cannot control Aami balance semantics', () => { assert.match(read('server/aamiEconomy.js'),/ensureAccount/); assert.match(read('server/aamiEconomy.js'),/awardActivity/); });
test('B211 M3169 — focused Aami/SkyMoney contract exists', () => { assert.match(read('server/v5_98_63_b211_aami_only_terminology.contract.test.js'),/M3150/); assert.match(read('server/v5_98_63_b211_aami_only_terminology.contract.test.js'),/M3174/); });
test('B211 M3170 — contract file is retained as evidence', () => { assert.ok(fs.existsSync(path.resolve(__dirname,"v5_98_63_b211_aami_only_terminology.contract.test.js"))); });
test('B211 M3171 — release metadata is synchronized', () => { assert.match(read('B211_REPORT.md'),/Version: V5\.98\.63/); assert.match(read('B211_REPORT.md'),/Android\/iOS build: 6031/i); });
test('B211 M3172 — release audit is active', () => { assert.match(read('scripts/release-audit.mjs'),/requiredVersion/); assert.match(read('scripts/release-audit.mjs'),/release metadata drift/); });
test('B211 M3173 — current roadmap is registered', () => { assert.match(read('B211_REPORT.md'),/Milestones: M3150–M3174/); });
test('B211 M3174 — next archive identity is correct', () => { assert.match(read('B211_REPORT.md'),/Android\/iOS build: 6031/i); assert.match(read('B211_REPORT.md'),/M3150–M3174/); });
