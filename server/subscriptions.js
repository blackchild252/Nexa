"use strict";

const crypto = require("crypto");
const { balanceMinor, pendingDebitMinor, ensureWallet, serviceFeesWaived } = require("./wallet");

const CURRENCY = "NGN";
const VERSION = "4.15.0";
const PLANS = Object.freeze({
  free: Object.freeze({ id: "free", name: "Free", monthlyFeeMinor: 0, monthlyTargetMinor: 0, monthlyCapMinor: 0, chaseReach: Object.freeze({ label: "Nearby Chase", tiers: ["local"], limits: Object.freeze({ local: 5, country: 0, international: 0 }) }), description: "Core NEXA access with pay-as-you-use services where applicable. Chase stays focused on nearby discovery." }),
  regular: Object.freeze({ id: "regular", name: "Regular", monthlyFeeMinor: 150_000, monthlyTargetMinor: 500_000, monthlyCapMinor: 600_000, chaseReach: Object.freeze({ label: "Country Chase", tiers: ["local", "country"], limits: Object.freeze({ local: 5, country: 2, international: 0 }) }), description: "NEXA Everyday: a connected daily-use membership with transparent metered services and wider Chase discovery within your country." }),
  premium: Object.freeze({ id: "premium", name: "Premium", monthlyFeeMinor: 250_000, monthlyTargetMinor: 800_000, monthlyCapMinor: 1_000_000, chaseReach: Object.freeze({ label: "Global Chase", tiers: ["local", "country", "international"], limits: Object.freeze({ local: 5, country: 3, international: 2 }) }), description: "NEXA Plus: broader bundled value, higher convenience limits, premium experiences and global Chase discovery." }),
  vip: Object.freeze({ id: "vip", name: "VIP", monthlyFeeMinor: 400_000, monthlyTargetMinor: 1_200_000, monthlyCapMinor: 1_500_000, chaseReach: Object.freeze({ label: "Royal Global Chase", tiers: ["local", "country", "international"], limits: Object.freeze({ local: 10, country: 6, international: 4 }) }), description: "NEXA Royal: premium service treatment, royal-dark experience and expanded global Chase discovery." }),
});

// These are transparent service prices, not hidden deductions. Product modules should
// call chargeServiceFee() with a fixed service code immediately before a chargeable action.
const SERVICE_FEES = Object.freeze({
  wallet_transfer: Object.freeze({ label: "Wallet transfer", fees: { free: 10_000, regular: 10_000, premium: 10_000, vip: 10_000 } }),
  wallet_withdrawal: Object.freeze({ label: "Wallet withdrawal", fees: { free: 10_000, regular: 10_000, premium: 10_000, vip: 10_000 } }),
  ajo_contribution: Object.freeze({ label: "Ajo contribution", fees: { free: 5_000, regular: 5_000, premium: 5_000, vip: 5_000 } }),
  marketplace_service: Object.freeze({ label: "Dream Marketplace service", fees: { free: 10_000, regular: 10_000, premium: 10_000, vip: 10_000 } }),
  yaayz_service: Object.freeze({ label: "Yaayz service", fees: { free: 10_000, regular: 10_000, premium: 10_000, vip: 10_000 } }),
  kitchen_service: Object.freeze({ label: "Kitchen service", fees: { free: 10_000, regular: 7_500, premium: 10_000, vip: 7_500 } }),
  zeeza_premium_action: Object.freeze({ label: "Zeeza premium action", fees: { free: 5_000, regular: 5_000, premium: 5_000, vip: 5_000 } }),
  dami_enhanced_action: Object.freeze({ label: "Dami enhanced action", fees: { free: 5_000, regular: 5_000, premium: 5_000, vip: 5_000 } }),
  extension_service: Object.freeze({ label: "Extension service", fees: { free: 10_000, regular: 10_000, premium: 10_000, vip: 10_000 } }),
});

function now() { return new Date().toISOString(); }
function id(prefix) { return `${prefix}_${Date.now()}_${crypto.randomBytes(5).toString("hex")}`; }
function cleanPlan(planId) {
  const plan = PLANS[String(planId || "").trim().toLowerCase()];
  if (!plan) throw new Error("Unknown NEXA subscription plan.");
  return plan;
}
function money(minor, currency = CURRENCY) { return { amount: Number(minor) / 100, currency }; }
function periodKey(date = new Date()) { return date.toISOString().slice(0, 7); }
function addMonth(iso) {
  const d = new Date(iso);
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + 1);
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString();
}
function feeMinor(planId, serviceCode) {
  const plan = cleanPlan(planId);
  const service = SERVICE_FEES[String(serviceCode || "").trim()];
  if (!service) throw new Error("Unknown NEXA service fee.");
  // B146: while no wallet money can exist (production, no wallet partner yet) every wallet-debited service fee is
  // waived. A zero fee takes the existing "bundled" path, so no wallet balance is read or debited.
  if (serviceFeesWaived()) return 0;
  return Number(service.fees[plan.id] || 0);
}
function publicPlan(plan) {
  return { id: plan.id, name: plan.name, monthlyFee: money(plan.monthlyFeeMinor), monthlyTarget: money(plan.monthlyTargetMinor), monthlyCap: money(plan.monthlyCapMinor), description: plan.description, chaseReach: { label: plan.chaseReach.label, tiers: [...plan.chaseReach.tiers], limits: { ...plan.chaseReach.limits } } };
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS nexa_subscriptions (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL UNIQUE,
      planId TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','past_due','cancelled')),
      autoPay INTEGER NOT NULL DEFAULT 1 CHECK (autoPay IN (0,1)),
      currentPeriodStart TEXT NOT NULL,
      currentPeriodEnd TEXT NOT NULL,
      nextBillingAt TEXT NOT NULL,
      monthlyCapMinor INTEGER NOT NULL DEFAULT 0,
      nextPlanId TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_nexa_subscriptions_user_status ON nexa_subscriptions(userId,status);
    CREATE TABLE IF NOT EXISTS nexa_subscription_charges (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      subscriptionId TEXT,
      kind TEXT NOT NULL CHECK (kind IN ('membership','service_fee')),
      serviceCode TEXT,
      amountMinor INTEGER NOT NULL CHECK (amountMinor > 0),
      currency TEXT NOT NULL DEFAULT 'NGN',
      periodKey TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed' CHECK (status IN ('completed','failed')),
      idempotencyKey TEXT,
      reference TEXT NOT NULL UNIQUE,
      description TEXT NOT NULL DEFAULT '',
      createdAt TEXT NOT NULL,
      previewId TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_nexa_sub_charge_idempotency ON nexa_subscription_charges(userId,idempotencyKey) WHERE idempotencyKey IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_nexa_sub_charge_user_period ON nexa_subscription_charges(userId,periodKey,createdAt DESC);
    CREATE TABLE IF NOT EXISTS nexa_subscription_preferences (
      userId TEXT PRIMARY KEY,
      autoPay INTEGER NOT NULL DEFAULT 1 CHECK (autoPay IN (0,1)),
      monthlyCapMinor INTEGER,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS nexa_fee_previews (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      serviceCode TEXT NOT NULL,
      actionAmountMinor INTEGER NOT NULL DEFAULT 0,
      currency TEXT NOT NULL DEFAULT 'NGN',
      feeMinor INTEGER NOT NULL DEFAULT 0,
      planId TEXT NOT NULL,
      periodKey TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      consumedAt TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_nexa_fee_previews_user_created ON nexa_fee_previews(userId,createdAt DESC);
  `);
  const subCols = db.prepare("PRAGMA table_info(nexa_subscriptions)").all().map((c) => c.name);
  if (!subCols.includes("nextPlanId")) db.exec("ALTER TABLE nexa_subscriptions ADD COLUMN nextPlanId TEXT");
  const chargeCols = db.prepare("PRAGMA table_info(nexa_subscription_charges)").all().map((c) => c.name);
  if (!chargeCols.includes("previewId")) db.exec("ALTER TABLE nexa_subscription_charges ADD COLUMN previewId TEXT");
}

function currentSubscription(db, userId) {
  ensureSchema(db);
  const row = db.prepare("SELECT * FROM nexa_subscriptions WHERE userId=?").get(userId);
  return row || null;
}
function spendForPeriod(db, userId, key) {
  ensureSchema(db);
  const row = db.prepare("SELECT COALESCE(SUM(amountMinor),0) AS amountMinor FROM nexa_subscription_charges WHERE userId=? AND periodKey=? AND status='completed'").get(userId, key);
  return Number(row?.amountMinor || 0);
}
function publicCharge(row) {
  return { id: row.id, kind: row.kind, serviceCode: row.serviceCode || null, amount: Number(row.amountMinor) / 100, currency: row.currency, periodKey: row.periodKey, status: row.status, reference: row.reference, description: row.description, createdAt: row.createdAt };
}

function insertWalletCharge(db, userId, amountMinor, { source, description, idempotencyKey, subscriptionId, serviceCode, previewId = null }) {
  ensureWallet(db, userId, CURRENCY);
  if (balanceMinor(db, userId, CURRENCY) - pendingDebitMinor(db, userId, CURRENCY) < amountMinor) throw new Error("Insufficient wallet balance for this NEXA charge.");
  const createdAt = now();
  const chargeId = id("nsc");
  const reference = `NEXA-SUB-${crypto.randomBytes(7).toString("hex").toUpperCase()}`;
  db.prepare(`INSERT INTO nexa_subscription_charges(id,userId,subscriptionId,kind,serviceCode,amountMinor,currency,periodKey,status,idempotencyKey,reference,description,createdAt,previewId)
    VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(chargeId,userId,subscriptionId,source === "membership" ? "membership" : "service_fee",serviceCode || null,amountMinor,CURRENCY,periodKey(new Date()),"completed",idempotencyKey || null,reference,description,createdAt,previewId);
  db.prepare("INSERT INTO wallet_ledger_entries(id,transactionId,userId,amountMinor,currency,createdAt) VALUES(?,?,?,?,?,?)")
    .run(id("wle"), chargeId, userId, -amountMinor, CURRENCY, createdAt);
  return db.prepare("SELECT * FROM nexa_subscription_charges WHERE id=?").get(chargeId);
}

function membershipCharge(db, subscription, plan, period) {
  if (plan.monthlyFeeMinor === 0) return null;
  const key = `membership:${subscription.id}:${period}`;
  const existing = db.prepare("SELECT * FROM nexa_subscription_charges WHERE userId=? AND idempotencyKey=?").get(subscription.userId, key);
  if (existing) return existing;
  const currentSpend = spendForPeriod(db, subscription.userId, period);
  if (currentSpend + plan.monthlyFeeMinor > subscription.monthlyCapMinor) throw new Error("The subscription monthly cap would be exceeded.");
  return insertWalletCharge(db, subscription.userId, plan.monthlyFeeMinor, { source: "membership", description: `${plan.name} NEXA membership`, idempotencyKey: key, subscriptionId: subscription.id });
}

function createSubscription(db, userId, planId, { autoPay = true } = {}) {
  ensureSchema(db);
  const plan = cleanPlan(planId);
  const existing = currentSubscription(db, userId);
  if (existing && existing.status !== "cancelled") throw new Error("A NEXA subscription is already active. Change the plan instead.");
  // B146: a paid plan is billed from the wallet. While fees are waived (no wallet partner yet) say so plainly
  // instead of failing later with an "Insufficient wallet balance" error. Anyone whose wallet was credited before
  // B145 and can cover the plan is not blocked.
  if (plan.monthlyFeeMinor > 0 && serviceFeesWaived()) {
    ensureWallet(db, userId, CURRENCY);
    if (balanceMinor(db, userId, CURRENCY) - pendingDebitMinor(db, userId, CURRENCY) < plan.monthlyFeeMinor) {
      throw Object.assign(new Error("Paid NEXA plans open together with Sky Wallet. NEXA stays free to use until then."), { status: 503, code: "plans_not_open" });
    }
  }
  const start = new Date();
  const end = new Date(addMonth(start.toISOString()));
  const subscription = { id:id("sub"), userId, planId:plan.id, status:"active", autoPay:autoPay ? 1 : 0, currentPeriodStart:start.toISOString(), currentPeriodEnd:end.toISOString(), nextBillingAt:end.toISOString(), monthlyCapMinor:plan.monthlyCapMinor, createdAt:start.toISOString(), updatedAt:start.toISOString() };
  const tx = db.transaction(() => {
    db.prepare("INSERT INTO nexa_subscriptions(id,userId,planId,status,autoPay,currentPeriodStart,currentPeriodEnd,nextBillingAt,monthlyCapMinor,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
      .run(subscription.id,subscription.userId,subscription.planId,subscription.status,subscription.autoPay,subscription.currentPeriodStart,subscription.currentPeriodEnd,subscription.nextBillingAt,subscription.monthlyCapMinor,subscription.createdAt,subscription.updatedAt);
    if (plan.monthlyFeeMinor > 0) membershipCharge(db, subscription, plan, periodKey(start));
    db.prepare("INSERT INTO nexa_subscription_preferences(userId,autoPay,monthlyCapMinor,updatedAt) VALUES(?,?,?,?) ON CONFLICT(userId) DO UPDATE SET autoPay=excluded.autoPay,monthlyCapMinor=excluded.monthlyCapMinor,updatedAt=excluded.updatedAt")
      .run(userId,subscription.autoPay,subscription.monthlyCapMinor,subscription.updatedAt);
    return subscription;
  });
  try { return tx(); } catch (e) { throw e; }
}

function renewIfDue(db, userId, nowDate = new Date()) {
  const sub = currentSubscription(db, userId);
  if (!sub || sub.status === "cancelled" || new Date(sub.nextBillingAt) > nowDate) return sub;
  const plan = cleanPlan(sub.nextPlanId || sub.planId);
  if (!sub.autoPay) return sub;
  try {
    const start = new Date(sub.currentPeriodEnd);
    const end = new Date(addMonth(start.toISOString()));
    const next = { ...sub, planId:plan.id, currentPeriodStart:start.toISOString(), currentPeriodEnd:end.toISOString(), nextBillingAt:end.toISOString(), status:"active", monthlyCapMinor:plan.monthlyCapMinor, nextPlanId:null, updatedAt:nowDate.toISOString() };
    const chargeSubscription = { ...sub, monthlyCapMinor:plan.monthlyCapMinor };
    db.transaction(() => {
      membershipCharge(db, chargeSubscription, plan, periodKey(start));
      db.prepare("UPDATE nexa_subscriptions SET planId=?,status='active',currentPeriodStart=?,currentPeriodEnd=?,nextBillingAt=?,monthlyCapMinor=?,nextPlanId=NULL,updatedAt=? WHERE id=? AND userId=?")
        .run(next.planId,next.currentPeriodStart,next.currentPeriodEnd,next.nextBillingAt,next.monthlyCapMinor,next.updatedAt,sub.id,userId);
    })();
    return db.prepare("SELECT * FROM nexa_subscriptions WHERE id=?").get(sub.id);
  } catch (e) {
    db.prepare("UPDATE nexa_subscriptions SET status='past_due',updatedAt=? WHERE id=? AND userId=?").run(nowDate.toISOString(),sub.id,userId);
    return db.prepare("SELECT * FROM nexa_subscriptions WHERE id=?").get(sub.id);
  }
}

function feePreview(db, userId, serviceCode, { amountMinor = 0, currency = CURRENCY, ttlMs = 10 * 60 * 1000 } = {}) {
  ensureSchema(db);
  if (String(currency || CURRENCY).toUpperCase() !== CURRENCY) throw new Error("NEXA service fees currently support NGN only.");
  const sub = currentSubscription(db, userId);
  const planId = sub && sub.status === "active" ? sub.planId : "free";
  const fee = feeMinor(planId, serviceCode);
  const amount = Number(amountMinor || 0);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("Invalid action amount.");
  const spend = spendForPeriod(db, userId, periodKey(new Date()));
  const cap = sub && sub.status === "active" ? Number(sub.monthlyCapMinor) : null;
  const capRemaining = cap === null ? null : Math.max(0, cap - spend);
  const createdAt = now();
  const expiresAt = new Date(Date.now() + Math.max(30_000, Math.min(Number(ttlMs) || 10 * 60 * 1000, 30 * 60 * 1000))).toISOString();
  const previewId = id("nfp");
  db.prepare("INSERT INTO nexa_fee_previews(id,userId,serviceCode,actionAmountMinor,currency,feeMinor,planId,periodKey,expiresAt,createdAt) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .run(previewId, userId, String(serviceCode), amount, CURRENCY, fee, planId, periodKey(new Date()), expiresAt, createdAt);
  return { previewId, expiresAt, planId, planName: cleanPlan(planId).name, serviceCode: String(serviceCode), fee: money(fee), actionAmount: money(amount), totalDebit: money(amount + fee), currentPeriodSpend: money(spend), cap: cap === null ? null : money(cap), capRemaining: capRemaining === null ? null : money(capRemaining) };
}

function assertFeePreview(db, userId, previewId, serviceCode, { amountMinor = 0, currency = CURRENCY } = {}) {
  ensureSchema(db);
  const idValue = String(previewId || "").trim();
  if (!idValue) throw new Error("A current NEXA service-fee preview is required before confirmation.");
  const row = db.prepare("SELECT * FROM nexa_fee_previews WHERE id=? AND userId=?").get(idValue, userId);
  if (!row) throw new Error("The NEXA service-fee preview was not found. Preview the fee again before confirming.");
  if (row.consumedAt) throw new Error("That NEXA service-fee preview has already been used. Preview the fee again before confirming.");
  if (new Date(row.expiresAt).getTime() <= Date.now()) throw new Error("The NEXA service-fee preview has expired. Preview the fee again before confirming.");
  const expectedAmount = Number(amountMinor || 0);
  const expectedCurrency = String(currency || CURRENCY).toUpperCase();
  if (row.serviceCode !== String(serviceCode) || Number(row.actionAmountMinor) !== expectedAmount || String(row.currency).toUpperCase() !== expectedCurrency) throw new Error("The NEXA service-fee preview no longer matches this action. Preview the fee again before confirming.");
  const sub = currentSubscription(db, userId);
  const currentPlan = sub && sub.status === "active" ? sub.planId : "free";
  if (String(row.planId) !== String(currentPlan) || Number(row.feeMinor) !== feeMinor(currentPlan, serviceCode)) throw new Error("Your NEXA service plan changed after the preview. Preview the fee again before confirming.");
  return { ...row, fee: money(Number(row.feeMinor)), actionAmount: money(Number(row.actionAmountMinor)), totalDebit: money(Number(row.actionAmountMinor) + Number(row.feeMinor)) };
}

function chargeServiceFee(db, userId, serviceCode, { idempotencyKey, withinTransaction = false, previewId, actionAmountMinor = 0, currency = CURRENCY } = {}) {
  ensureSchema(db);
  const sub = currentSubscription(db, userId);
  const planId = sub && sub.status === "active" ? sub.planId : "free";
  const amountMinor = feeMinor(planId, serviceCode);
  if (amountMinor === 0) return { charged:false, fee:money(0), reason:"bundled" };
  const key = String(idempotencyKey || "").trim();
  if (!key) throw new Error("An idempotency key is required for a metered NEXA service charge.");
  const existing = db.prepare("SELECT * FROM nexa_subscription_charges WHERE userId=? AND idempotencyKey=?").get(userId,key);
  if (existing) return { charged:true, idempotent:true, charge:publicCharge(existing), fee:money(existing.amountMinor) };
  const preview = assertFeePreview(db, userId, previewId, serviceCode, { amountMinor: Number(actionAmountMinor || 0), currency });
  if (!sub || sub.status !== "active") {
    // Free-tier charges are pay-as-you-use, so they still use the same transparent ledger.
  }
  const period = periodKey(new Date());
  const cap = sub && sub.status === "active" ? Number(sub.monthlyCapMinor) : null;
  const spend = spendForPeriod(db,userId,period);
  if (cap !== null && spend + amountMinor > cap) throw new Error("Your monthly NEXA spending cap would be exceeded.");
  const service = SERVICE_FEES[serviceCode];
  const create = () => {
    const charge = insertWalletCharge(db,userId,amountMinor,{source:"service_fee",description:service.label,idempotencyKey:key,subscriptionId:sub?.id || null,serviceCode,previewId:preview.id});
    db.prepare("UPDATE nexa_fee_previews SET consumedAt=? WHERE id=? AND userId=? AND consumedAt IS NULL").run(now(), preview.id, userId);
    return charge;
  };
  const charge = withinTransaction ? create() : db.transaction(create)();
  return { charged:true,idempotent:false,charge:publicCharge(charge),fee:money(amountMinor) };
}

function ensureApprovalSchema(db) {
  ensureSchema(db);
  db.exec(`
    CREATE TABLE IF NOT EXISTS nexa_subscription_requests (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('new','plan_change')),
      planId TEXT NOT NULL,
      autoPay INTEGER NOT NULL DEFAULT 1 CHECK (autoPay IN (0,1)),
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','cancelled')),
      decisionReason TEXT,
      decidedBy TEXT,
      decidedAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_nexa_sub_requests_status ON nexa_subscription_requests(status,createdAt);
    CREATE INDEX IF NOT EXISTS idx_nexa_sub_requests_user ON nexa_subscription_requests(userId,createdAt DESC);
  `);
}

function requestSubscription(db, userId, planId, { autoPay = true, kind = 'new' } = {}) {
  ensureApprovalSchema(db);
  const plan = cleanPlan(planId);
  if (plan.id === 'free') throw new Error('Free access does not require an approval request.');
  const sub = currentSubscription(db,userId);
  if (kind === 'new' && sub && sub.status !== 'cancelled') throw new Error('A NEXA subscription is already active. Change the plan instead.');
  if (kind === 'plan_change' && (!sub || sub.status === 'cancelled')) throw new Error('No active NEXA subscription.');
  const existing = db.prepare("SELECT * FROM nexa_subscription_requests WHERE userId=? AND status='pending' ORDER BY createdAt DESC LIMIT 1").get(userId);
  if (existing) return existing;
  const t=now(), row={id:id('sreq'),userId,kind,planId:plan.id,autoPay:autoPay?1:0,status:'pending',createdAt:t,updatedAt:t};
  db.prepare("INSERT INTO nexa_subscription_requests(id,userId,kind,planId,autoPay,status,createdAt,updatedAt) VALUES(?,?,?,?,?,'pending',?,?)").run(row.id,row.userId,row.kind,row.planId,row.autoPay,row.createdAt,row.updatedAt);
  return row;
}

function pendingSubscriptionRequest(db,userId) {
  ensureApprovalSchema(db);
  return db.prepare("SELECT * FROM nexa_subscription_requests WHERE userId=? AND status='pending' ORDER BY createdAt DESC LIMIT 1").get(userId) || null;
}

function schedulePlanChange(db, userId, planId) {
  ensureSchema(db);
  const plan = cleanPlan(planId);
  if (plan.id === "free") throw new Error("A paid NEXA plan must be selected for a scheduled plan change.");
  const sub = currentSubscription(db, userId);
  if (!sub || sub.status === "cancelled") throw new Error("No active NEXA subscription.");
  if (sub.planId === plan.id) {
    db.prepare("UPDATE nexa_subscriptions SET nextPlanId=NULL,updatedAt=? WHERE userId=?").run(now(),userId);
    return db.prepare("SELECT * FROM nexa_subscriptions WHERE userId=?").get(userId);
  }
  db.prepare("UPDATE nexa_subscriptions SET nextPlanId=?,updatedAt=? WHERE userId=?").run(plan.id,now(),userId);
  return db.prepare("SELECT * FROM nexa_subscriptions WHERE userId=?").get(userId);
}

function clearScheduledPlanChange(db, userId) {
  ensureSchema(db);
  const sub = currentSubscription(db, userId);
  if (!sub || sub.status === "cancelled") throw new Error("No active NEXA subscription.");
  db.prepare("UPDATE nexa_subscriptions SET nextPlanId=NULL,updatedAt=? WHERE userId=?").run(now(),userId);
  return db.prepare("SELECT * FROM nexa_subscriptions WHERE userId=?").get(userId);
}

function setAutoPay(db,userId,enabled) {
  ensureSchema(db);
  const sub = currentSubscription(db,userId);
  if (!sub || sub.status === "cancelled") throw new Error("No active NEXA subscription.");
  const value = enabled ? 1 : 0;
  db.prepare("UPDATE nexa_subscriptions SET autoPay=?,updatedAt=? WHERE userId=?").run(value,now(),userId);
  db.prepare("INSERT INTO nexa_subscription_preferences(userId,autoPay,monthlyCapMinor,updatedAt) VALUES(?,?,?,?) ON CONFLICT(userId) DO UPDATE SET autoPay=excluded.autoPay,monthlyCapMinor=excluded.monthlyCapMinor,updatedAt=excluded.updatedAt")
    .run(userId,value,sub.monthlyCapMinor,now());
  return db.prepare("SELECT * FROM nexa_subscriptions WHERE userId=?").get(userId);
}

function cancelSubscription(db,userId) {
  ensureSchema(db);
  const sub = currentSubscription(db,userId);
  if (!sub || sub.status === "cancelled") return sub;
  db.prepare("UPDATE nexa_subscriptions SET status='cancelled',autoPay=0,nextPlanId=NULL,updatedAt=? WHERE userId=?").run(now(),userId);
  return db.prepare("SELECT * FROM nexa_subscriptions WHERE userId=?").get(userId);
}

function publicSubscription(db,userId) {
  ensureSchema(db);
  let sub = renewIfDue(db,userId);
  const plan = sub ? cleanPlan(sub.planId) : PLANS.free;
  const key = periodKey(new Date());
  const spendMinor = spendForPeriod(db,userId,key);
  const charges = db.prepare("SELECT * FROM nexa_subscription_charges WHERE userId=? AND periodKey=? ORDER BY createdAt DESC LIMIT 50").all(userId,key).map(publicCharge);
  const pendingRequest = pendingSubscriptionRequest(db,userId);
  return { version:VERSION, feesWaived:serviceFeesWaived(), plans:Object.values(PLANS).map(publicPlan), serviceFees:Object.entries(SERVICE_FEES).map(([code,v])=>({code,label:v.label,fee:money(feeMinor(plan.id,code))})), subscription:sub ? { id:sub.id, planId:sub.planId, status:sub.status, autoPay:Boolean(sub.autoPay), currentPeriodStart:sub.currentPeriodStart,currentPeriodEnd:sub.currentPeriodEnd,nextBillingAt:sub.nextBillingAt,monthlyCap:money(sub.monthlyCapMinor),plan:publicPlan(plan),nextPlanId:sub.nextPlanId || null,nextPlan:sub.nextPlanId ? publicPlan(cleanPlan(sub.nextPlanId)) : null } : { id:null,planId:"free",status:"active",autoPay:false,currentPeriodStart:null,currentPeriodEnd:null,nextBillingAt:null,monthlyCap:money(0),plan:publicPlan(plan) }, pendingRequest: pendingRequest ? { id:pendingRequest.id, kind:pendingRequest.kind, planId:pendingRequest.planId, autoPay:Boolean(pendingRequest.autoPay), status:pendingRequest.status, createdAt:pendingRequest.createdAt } : null, spend:{period:key,amount:money(spendMinor),target:money(plan.monthlyTargetMinor),cap:money(plan.monthlyCapMinor),remaining:money(Math.max(0,plan.monthlyCapMinor-spendMinor)),percentOfTarget:plan.monthlyTargetMinor?Number((spendMinor/plan.monthlyTargetMinor*100).toFixed(2)):0}, charges };
}

function createSubscriptionRouter({ app, auth, db, rateLimit }) {
  ensureSchema(db);
  const limited = rateLimit ? rateLimit({windowMs:60_000,max:20,keyFn:req=>req.user?.id||req.ip,message:"Too many subscription actions. Please try again shortly."}) : (req,res,next)=>next();
  app.get("/api/subscription/fee-preview", auth.authMiddleware, limited, (req,res)=>{ try {
    const rawAmount = Number(req.query?.amount || req.body?.amount || 0);
    const amountMinor = Math.round(rawAmount * 100);
    res.json({ preview: feePreview(db, req.user.id, req.query?.serviceCode || req.body?.serviceCode, { amountMinor, currency:req.query?.currency || req.body?.currency || CURRENCY }) });
  } catch(e) { res.status(400).json({error:e.message||"Fee preview unavailable."}); } });
  app.get("/api/subscription", auth.authMiddleware, (req,res)=>{ try { res.json(publicSubscription(db,req.user.id)); } catch(e) { res.status(400).json({error:e.message||"Subscription unavailable."}); } });
  app.post("/api/subscription", auth.authMiddleware, limited, (req,res)=>{ try { const planId=String(req.body?.planId||"").trim().toLowerCase(); if(planId==='free'){ const result=createSubscription(db,req.user.id,planId,{autoPay:false}); return res.status(201).json({subscription:publicSubscription(db,req.user.id),created:result}); } const request=requestSubscription(db,req.user.id,planId,{autoPay:req.body?.autoPay !== false,kind:'new'}); res.status(202).json({pendingApproval:true,request,subscription:publicSubscription(db,req.user.id)}); } catch(e) { res.status(e.status===503?503:(/Insufficient|monthly cap/.test(e.message||"")?409:400)).json({error:e.message||"Subscription request could not be created."}); } });
  app.patch("/api/subscription/autopay", auth.authMiddleware, limited, (req,res)=>{ try { const result=setAutoPay(db,req.user.id,Boolean(req.body?.enabled)); res.json({subscription:publicSubscription(db,req.user.id),updated:result}); } catch(e) { res.status(400).json({error:e.message||"Auto-pay could not be updated."}); } });
  app.post("/api/subscription/change-plan", auth.authMiddleware, limited, (req,res)=>{ try { const request=requestSubscription(db,req.user.id,req.body?.planId,{autoPay:true,kind:'plan_change'}); res.status(202).json({pendingApproval:true,request,subscription:publicSubscription(db,req.user.id)}); } catch(e) { res.status(400).json({error:e.message||"Plan change request could not be created."}); } });
  app.post("/api/subscription/change-plan/cancel", auth.authMiddleware, limited, (req,res)=>{ try { const result=clearScheduledPlanChange(db,req.user.id); res.json({subscription:publicSubscription(db,req.user.id),scheduled:result}); } catch(e) { res.status(400).json({error:e.message||"Scheduled plan change could not be cancelled."}); } });
  app.post("/api/subscription/cancel", auth.authMiddleware, limited, (req,res)=>{ try { cancelSubscription(db,req.user.id); res.json({subscription:publicSubscription(db,req.user.id)}); } catch(e) { res.status(400).json({error:e.message||"Subscription could not be cancelled."}); } });
}

module.exports = { VERSION, PLANS, SERVICE_FEES, ensureSchema, ensureApprovalSchema, requestSubscription, pendingSubscriptionRequest, feeMinor, feePreview, assertFeePreview, spendForPeriod, createSubscription, renewIfDue, chargeServiceFee, setAutoPay, cancelSubscription, publicSubscription, schedulePlanChange, clearScheduledPlanChange, createSubscriptionRouter, currentSubscription, money };
