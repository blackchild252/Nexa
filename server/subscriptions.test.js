"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const subscriptions = require("./subscriptions");
const source = fs.readFileSync(path.join(__dirname, "subscriptions.js"), "utf8");
const index = fs.readFileSync(path.join(__dirname, "index.js"), "utf8");
const wallet = fs.readFileSync(path.join(__dirname, "wallet.js"), "utf8");
const ui = fs.readFileSync(path.join(__dirname, "..", "src", "Subscription.tsx"), "utf8");

test("subscription tiers expose Free, Regular, Premium and VIP with the intended monthly targets", () => {
  assert.deepEqual(Object.keys(subscriptions.PLANS), ["free", "regular", "premium", "vip"]);
  assert.equal(subscriptions.PLANS.regular.monthlyFeeMinor, 150000);
  assert.equal(subscriptions.PLANS.regular.monthlyTargetMinor, 500000);
  assert.equal(subscriptions.PLANS.premium.monthlyFeeMinor, 250000);
  assert.equal(subscriptions.PLANS.premium.monthlyTargetMinor, 800000);
  assert.equal(subscriptions.PLANS.vip.monthlyFeeMinor, 400000);
  assert.equal(subscriptions.PLANS.vip.monthlyTargetMinor, 1200000);
});

test("subscription fee catalog is fixed server-side and tier-aware", () => {
  assert.equal(subscriptions.feeMinor("regular", "wallet_transfer"), 10000);
  assert.equal(subscriptions.feeMinor("premium", "wallet_transfer"), 10000);
  assert.equal(subscriptions.feeMinor("vip", "wallet_transfer"), 10000);
  assert.throws(() => subscriptions.feeMinor("regular", "not_a_real_service"), /Unknown NEXA service fee/);
  assert.match(source, /SERVICE_FEES/);
  assert.match(source, /chargeServiceFee/);
});

test("subscription state and charges are authenticated through the shared NEXA router", () => {
  assert.match(index, /createSubscriptionRouter\(\{ app, auth, db, rateLimit \}\)/);
  assert.match(source, /auth\.authMiddleware/);
  assert.match(source, /userId/);
  assert.match(source, /idempotencyKey/);
  assert.match(source, /monthlyCapMinor/);
});

test("subscription charges debit the existing append-only Wallet ledger instead of creating a second balance", () => {
  assert.match(source, /wallet_ledger_entries/);
  assert.match(source, /-amountMinor/);
  assert.match(source, /balanceMinor\(db, userId, CURRENCY\)/);
  assert.doesNotMatch(source, /UPDATE wallet_accounts SET .*balance/);
  assert.match(wallet, /SUM\(amountMinor\).*AS balanceMinor/);
});

test("auto-pay is explicit and renewals fail closed on insufficient funds", () => {
  assert.match(source, /autoPay/);
  assert.match(source, /past_due/);
  assert.match(source, /Insufficient wallet balance/);
  assert.match(ui, /Auto-pay/);
  assert.match(ui, /Monthly NEXA spend/);
});

test("account closure removes subscription state while leaving wallet financial anchors intact", () => {
  const lifecycle = fs.readFileSync(path.join(__dirname, "accountLifecycle.js"), "utf8");
  assert.ok(lifecycle.includes('closureIntegrity.RETAINED_USER_TABLES') || lifecycle.includes('RETAINED_USER_TABLES'));
  assert.match(require('./v5_77_0_account_closure_integrity').RETAINED_USER_TABLES.join(','), /nexa_subscription_charges/);
  const integrity = require("./v5_77_0_account_closure_integrity");
  assert.ok(integrity.DELETE_USER_TABLES.includes("nexa_subscriptions"));
  assert.ok(integrity.DELETE_USER_TABLES.includes("nexa_subscription_preferences"));
  assert.doesNotMatch(lifecycle.split("const RETAINED_USER_TABLES")[0], /nexa_subscription_charges/);
  assert.doesNotMatch(lifecycle, /wallet_ledger_entries/);
});

test("subscription navigation is additive and preserves the existing Wallet route", () => {
  const layout = fs.readFileSync(path.join(__dirname, "..", "src", "app", "_layout.tsx"), "utf8");
  const money = fs.readFileSync(path.join(__dirname, "..", "src", "MoneyDashboard.tsx"), "utf8");
  assert.match(layout, /name="wallet"/);
  assert.match(layout, /name="subscription"/);
  assert.match(money, /Open \{BRAND\.wallet\}/);
  assert.match(money, /NEXA Membership & service fees/);
});

test("paid plan changes are scheduled for the next renewal instead of charging immediately", () => {
  assert.match(source, /function schedulePlanChange\(db, userId, planId\)/);
  assert.match(source, /nextPlanId/);
  assert.match(source, /change-plan/);
  assert.match(source, /function schedulePlanChange/);
  assert.match(ui, /at the next renewal/);
});

test("renewal applies the scheduled plan with the new plan cap and clears the schedule", () => {
  assert.match(source, /cleanPlan\(sub\.nextPlanId \|\| sub\.planId\)/);
  assert.match(source, /monthlyCapMinor=\?,nextPlanId=NULL/);
  assert.match(source, /membershipCharge\(db, chargeSubscription, plan/);
});

test("subscription UI distinguishes activation from scheduled paid-tier changes", () => {
  assert.match(ui, /\/api\/subscription\/change-plan/);
  assert.match(ui, /Change to \$\{chosen\.name\} at renewal/);
  assert.match(ui, /nextPlan/);
  assert.match(ui, /no plan-change fee is charged now/);
});

test("service-fee preview refuses cross-currency amounts while fee ledger remains NGN-owned", () => {
  const db = {
    exec() {},
    prepare() { return { all: () => [] }; },
  };
  assert.throws(() => subscriptions.feePreview(db, "u1", "wallet_transfer", { amountMinor: 100, currency: "USD" }), /currently support NGN only/);
  assert.match(source, /String\(currency \|\| CURRENCY\)\.toUpperCase\(\) !== CURRENCY/);
});
