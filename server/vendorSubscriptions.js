"use strict";

const crypto = require("crypto");

const CURRENCY = "NGN";
const FREE_SLOT_LIMIT = 10;
const ENTRY_AMOUNT_MINOR = 3_000_000; // ₦30,000
const RENEWAL_AMOUNT_MINOR = 1_000_000; // ₦10,000
const PERIOD_MS = 30 * 24 * 60 * 60 * 1000;
const REMINDER_OFFSET_MS = 25 * 24 * 60 * 60 * 1000;

const PERIOD_TYPES = Object.freeze({ FREE_LAUNCH: "FREE_LAUNCH", PAID_ENTRY: "PAID_ENTRY", RENEWAL: "RENEWAL" });
const PERIOD_STATUSES = Object.freeze({ ACTIVE: "ACTIVE", EXPIRED: "EXPIRED", CANCELLED: "CANCELLED" });
const PAYMENT_STATUSES = Object.freeze({ PENDING: "PENDING", VERIFIED: "VERIFIED", FAILED: "FAILED", CANCELLED: "CANCELLED" });

function id(prefix) { return `${prefix}_${Date.now()}_${crypto.randomBytes(7).toString("hex")}`; }
function nowIso(now = new Date()) { return (now instanceof Date ? now : new Date(now)).toISOString(); }
function addDays(iso, days) { return new Date(new Date(iso).getTime() + Number(days) * 24 * 60 * 60 * 1000).toISOString(); }
function addPeriod(iso) { return new Date(new Date(iso).getTime() + PERIOD_MS).toISOString(); }
function cleanReference(value) { return String(value || "").trim().slice(0, 160); }
function money(minor) { return { amount: Number(minor) / 100, currency: CURRENCY }; }

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS vendor_subscription_periods (
      id TEXT PRIMARY KEY,
      vendorId TEXT NOT NULL,
      userId TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('FREE_LAUNCH','PAID_ENTRY','RENEWAL')),
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','EXPIRED','CANCELLED')),
      startAt TEXT NOT NULL,
      endAt TEXT NOT NULL,
      paymentReference TEXT,
      amountMinor INTEGER NOT NULL DEFAULT 0 CHECK (amountMinor >= 0),
      currency TEXT NOT NULL DEFAULT 'NGN',
      reminderAt TEXT NOT NULL,
      reminderSentAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vendor_sub_period_vendor_status ON vendor_subscription_periods(vendorId,status,endAt DESC);
    CREATE INDEX IF NOT EXISTS idx_vendor_sub_period_reminder ON vendor_subscription_periods(reminderAt,reminderSentAt);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_sub_period_payment_ref ON vendor_subscription_periods(paymentReference) WHERE paymentReference IS NOT NULL;

    CREATE TABLE IF NOT EXISTS vendor_launch_allocations (
      slot INTEGER PRIMARY KEY CHECK (slot BETWEEN 1 AND 10),
      vendorId TEXT NOT NULL UNIQUE,
      userId TEXT NOT NULL UNIQUE,
      periodId TEXT NOT NULL UNIQUE,
      allocatedAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_vendor_launch_user ON vendor_launch_allocations(userId);

    CREATE TABLE IF NOT EXISTS vendor_subscription_payments (
      id TEXT PRIMARY KEY,
      vendorId TEXT NOT NULL,
      userId TEXT NOT NULL,
      kind TEXT NOT NULL CHECK (kind IN ('PAID_ENTRY','RENEWAL')),
      reference TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','VERIFIED','FAILED','CANCELLED')),
      amountMinor INTEGER NOT NULL CHECK (amountMinor > 0),
      currency TEXT NOT NULL DEFAULT 'NGN',
      providerReference TEXT,
      authorizationUrl TEXT,
      createdAt TEXT NOT NULL,
      verifiedAt TEXT,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_vendor_sub_payment_vendor ON vendor_subscription_payments(vendorId,createdAt DESC);
    CREATE INDEX IF NOT EXISTS idx_vendor_sub_payment_user ON vendor_subscription_payments(userId,createdAt DESC);

    CREATE TABLE IF NOT EXISTS vendor_subscription_reminders (
      id TEXT PRIMARY KEY,
      subscriptionPeriodId TEXT NOT NULL,
      userId TEXT NOT NULL,
      reminderType TEXT NOT NULL,
      sentAt TEXT NOT NULL,
      UNIQUE(subscriptionPeriodId,reminderType)
    );
  `);
  const vendorCols = db.prepare("PRAGMA table_info(vendors)").all().map((c) => c.name);
  if (!vendorCols.includes("status")) db.exec("ALTER TABLE vendors ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
  const cols = db.prepare("PRAGMA table_info(vendors)").all().map((c) => c.name);
  if (!cols.includes("moderationStatus")) db.exec("ALTER TABLE vendors ADD COLUMN moderationStatus TEXT NOT NULL DEFAULT 'active'");
  if (!cols.includes("moderationReason")) db.exec("ALTER TABLE vendors ADD COLUMN moderationReason TEXT");
  if (!cols.includes("moderationUpdatedAt")) db.exec("ALTER TABLE vendors ADD COLUMN moderationUpdatedAt TEXT");
}

function countFreeSlots(db) {
  ensureSchema(db);
  return Number(db.prepare("SELECT COUNT(*) AS n FROM vendor_launch_allocations").get().n || 0);
}

function freeSlotsRemaining(db) { return Math.max(0, FREE_SLOT_LIMIT - countFreeSlots(db)); }

function expireDue(db, now = new Date()) {
  ensureSchema(db);
  const iso = nowIso(now);
  const tx = db.transaction(() => {
    const periods = db.prepare("SELECT id,vendorId FROM vendor_subscription_periods WHERE status='ACTIVE' AND endAt <= ?").all(iso);
    if (!periods.length) return 0;
    const changed = db.prepare("UPDATE vendor_subscription_periods SET status='EXPIRED',updatedAt=? WHERE id=? AND status='ACTIVE' AND endAt <= ?");
    const vendors = new Set();
    for (const row of periods) {
      const result = changed.run(iso, row.id, iso);
      if (result.changes) vendors.add(row.vendorId);
    }
    const setInactive = db.prepare(`UPDATE vendors SET status='inactive' WHERE id=? AND status='active' AND NOT EXISTS (
      SELECT 1 FROM vendor_subscription_periods p WHERE p.vendorId=vendors.id AND p.status='ACTIVE' AND p.endAt > ?
    )`);
    for (const vendorId of vendors) setInactive.run(vendorId, iso);
    return vendors.size;
  });
  return tx();
}

function activePeriod(db, vendorId, now = new Date()) {
  ensureSchema(db);
  expireDue(db, now);
  return db.prepare("SELECT * FROM vendor_subscription_periods WHERE vendorId=? AND status='ACTIVE' AND startAt <= ? AND endAt > ? ORDER BY endAt DESC LIMIT 1").get(vendorId, nowIso(now), nowIso(now)) || null;
}

function businessTypeParts(vendor) { return String(vendor?.businessType || "marketplace").split(",").map((x) => x.trim()).filter(Boolean); }
function isYouTubeOnly(vendor) { const p = businessTypeParts(vendor); return p.length > 0 && p.every((x) => x.startsWith("youtube")); }
// A shop exists unless the account signed up as YouTube-only and never added one.
function hasShop(db, vendor) {
  if (!vendor) return false;
  if (!isYouTubeOnly(vendor)) return true;
  if (db.prepare("SELECT 1 FROM vendor_subscription_periods WHERE vendorId=? LIMIT 1").get(vendor.id)) return true;
  if (db.prepare("SELECT 1 FROM vendor_subscription_payments WHERE vendorId=? LIMIT 1").get(vendor.id)) return true;
  if (db.prepare("SELECT 1 FROM vendor_launch_allocations WHERE vendorId=? LIMIT 1").get(vendor.id)) return true;
  try { if (db.prepare("SELECT 1 FROM mall_products WHERE vendorId=? LIMIT 1").get(vendor.id)) return true; } catch (e) { /* products table not present */ }
  return false;
}

function vendorEntitlement(db, vendorId, now = new Date()) {
  const vendor = db.prepare("SELECT * FROM vendors WHERE id=?").get(vendorId);
  if (vendor && String(vendor.moderationStatus || "active").toLowerCase() !== "active") {
    return { active: false, source: "VENDOR_ADMIN_SUSPENDED", period: null, reason: vendor.moderationReason || null };
  }
  const period = activePeriod(db, vendorId, now);
  if (period) return { active: true, source: "VENDOR_SUBSCRIPTION", period };
  const hasHistory = Boolean(db.prepare("SELECT 1 FROM vendor_subscription_periods WHERE vendorId=? LIMIT 1").get(vendorId));
  if (vendor && String(vendor.moderationStatus || "active").toLowerCase() === "active" && String(vendor.status || "active").toLowerCase() === "active" && !hasHistory && hasShop(db, vendor)) {
    return { active: true, source: "LEGACY_VENDOR_STATE", period: null };
  }
  return { active: false, source: hasHistory ? "VENDOR_SUBSCRIPTION_EXPIRED" : "VENDOR_INACTIVE", period: null };
}

function isVendorActive(db, vendorId, now = new Date()) {
  return vendorEntitlement(db, vendorId, now).active;
}

function publicPeriod(row, now = new Date()) {
  if (!row) return null;
  const remainingMs = Math.max(0, new Date(row.endAt).getTime() - new Date(now).getTime());
  return {
    id: row.id,
    type: row.type,
    status: row.status,
    startAt: row.startAt,
    endAt: row.endAt,
    paymentReference: row.paymentReference || null,
    amount: money(row.amountMinor),
    daysRemaining: Math.max(0, Math.ceil(remainingMs / (24 * 60 * 60 * 1000))),
  };
}

function getVendorState(db, vendorId, now = new Date()) {
  ensureSchema(db);
  expireDue(db, now);
  const vendor = db.prepare("SELECT * FROM vendors WHERE id=?").get(vendorId);
  if (!vendor) return null;
  const period = activePeriod(db, vendor.id, now);
  const last = db.prepare("SELECT * FROM vendor_subscription_periods WHERE vendorId=? ORDER BY endAt DESC,createdAt DESC LIMIT 1").get(vendor.id);
  const pending = db.prepare("SELECT * FROM vendor_subscription_payments WHERE vendorId=? AND status='PENDING' ORDER BY createdAt DESC LIMIT 1").get(vendor.id);
  const hasSubscription = Boolean(last || pending);
  let status = String(vendor.status || "active").toLowerCase();
  if (period) status = "active";
  else if (hasSubscription && status !== "pending_payment") status = last ? "expired" : "pending_payment";
  return {
    vendor: { id: vendor.id, userId: vendor.userId, shopName: vendor.shopName, bio: vendor.bio, status, moderationStatus: String(vendor.moderationStatus || "active").toLowerCase(), moderationReason: vendor.moderationReason || null, businessType: String(vendor.businessType || "marketplace") },
    platforms: { shop: hasShop(db, vendor), youtube: businessTypeParts(vendor).some((x) => x.startsWith("youtube")) },
    // Launch benefits are decided once, at sign-up. This only reports what happened; nothing here can grant one.
    launchBenefit: db.prepare("SELECT 1 FROM vendor_launch_allocations WHERE userId=?").get(vendor.userId) ? "received" : "not_received",
    subscription: publicPeriod(period, now),
    latestSubscription: publicPeriod(last, now),
    pendingPayment: pending ? {
      id: pending.id,
      kind: pending.kind,
      reference: pending.reference,
      status: pending.status,
      amount: money(pending.amountMinor),
      authorizationUrl: pending.authorizationUrl || null,
      createdAt: pending.createdAt,
    } : null,
    freeSlotsRemaining: freeSlotsRemaining(db),
    renewalPrice: money(RENEWAL_AMOUNT_MINOR),
    entryPrice: money(ENTRY_AMOUNT_MINOR),
  };
}

function assertServerAmount(result, expectedMinor, reference) {
  const status = String(result?.status || "").toLowerCase();
  const ref = cleanReference(result?.reference || result?.transaction || reference);
  const currency = String(result?.currency || "").toUpperCase();
  const amount = Number(result?.amount);
  return status === "success" && ref === reference && currency === CURRENCY && Number.isFinite(amount) && amount === expectedMinor;
}

function createFreeVendor(db, { userId, shopName, bio, now = new Date() }) {
  ensureSchema(db);
  const iso = nowIso(now);
  return db.transaction(() => {
    const existing = db.prepare("SELECT * FROM vendors WHERE userId=?").get(userId);
    if (existing) return { existing: true, vendorId: existing.id, allocated: false };
    const slot = db.prepare("SELECT MIN(s.slot + 1) AS nextSlot FROM vendor_launch_allocations s WHERE NOT EXISTS (SELECT 1 FROM vendor_launch_allocations x WHERE x.slot=s.slot+1)").get()?.nextSlot;
    const allocatedSlot = countFreeSlots(db) < FREE_SLOT_LIMIT ? (slot || 1) : null;
    if (!allocatedSlot || allocatedSlot > FREE_SLOT_LIMIT) return { freeAvailable: false };
    const vendorId = id("v");
    const periodId = id("vsp");
    const startAt = iso;
    const endAt = addPeriod(startAt);
    const reminderAt = addDays(startAt, 25);
    db.prepare("INSERT INTO vendors(id,userId,shopName,bio,createdAt,status) VALUES(?,?,?,?,?, 'active')").run(vendorId,userId,shopName,bio,iso);
    db.prepare("INSERT INTO vendor_subscription_periods(id,vendorId,userId,type,status,startAt,endAt,paymentReference,amountMinor,currency,reminderAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(periodId,vendorId,userId,PERIOD_TYPES.FREE_LAUNCH,PERIOD_STATUSES.ACTIVE,startAt,endAt,null,0,CURRENCY,reminderAt,iso,iso);
    db.prepare("INSERT INTO vendor_launch_allocations(slot,vendorId,userId,periodId,allocatedAt) VALUES(?,?,?,?,?)")
      .run(allocatedSlot,vendorId,userId,periodId,iso);
    return { existing:false, freeAvailable:true, allocated:true, slot:allocatedSlot, vendorId, periodId };
  })();
}

function createPaymentForVendor(db, { vendorId, userId, kind = PERIOD_TYPES.PAID_ENTRY, now = new Date() }) {
  ensureSchema(db);
  const iso = nowIso(now);
  const existing = db.prepare("SELECT * FROM vendor_subscription_payments WHERE vendorId=? AND status='PENDING' ORDER BY createdAt DESC LIMIT 1").get(vendorId);
  if (existing) return { existing: true, payment: existing };
  const vendor = db.prepare("SELECT * FROM vendors WHERE id=? AND userId=?").get(vendorId, userId);
  if (!vendor) throw new Error("Vendor account not found.");
  const paymentId = id("vspay");
  const reference = `nexa-vendor-${crypto.randomBytes(12).toString("hex")}`;
  const amountMinor = kind === PERIOD_TYPES.PAID_ENTRY ? ENTRY_AMOUNT_MINOR : RENEWAL_AMOUNT_MINOR;
  db.prepare("INSERT INTO vendor_subscription_payments(id,vendorId,userId,kind,reference,status,amountMinor,currency,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)")
    .run(paymentId,vendorId,userId,kind,reference,PAYMENT_STATUSES.PENDING,amountMinor,CURRENCY,iso,iso);
  return { existing:false, payment:db.prepare("SELECT * FROM vendor_subscription_payments WHERE id=?").get(paymentId), reference, amountMinor, kind };
}

function createPendingVendor(db, { userId, shopName, bio, kind = PERIOD_TYPES.PAID_ENTRY, now = new Date() }) {
  ensureSchema(db);
  const iso = nowIso(now);
  return db.transaction(() => {
    const existing = db.prepare("SELECT * FROM vendors WHERE userId=?").get(userId);
    if (existing) return { existing: true, vendorId: existing.id };
    const vendorId = id("v");
    const paymentId = id("vspay");
    const reference = `nexa-vendor-${crypto.randomBytes(12).toString("hex")}`;
    const amountMinor = kind === PERIOD_TYPES.PAID_ENTRY ? ENTRY_AMOUNT_MINOR : RENEWAL_AMOUNT_MINOR;
    db.prepare("INSERT INTO vendors(id,userId,shopName,bio,createdAt,status) VALUES(?,?,?,?,?, 'pending_payment')").run(vendorId,userId,shopName,bio,iso);
    db.prepare("INSERT INTO vendor_subscription_payments(id,vendorId,userId,kind,reference,status,amountMinor,currency,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?)")
      .run(paymentId,vendorId,userId,kind,reference,PAYMENT_STATUSES.PENDING,amountMinor,CURRENCY,iso,iso);
    return { existing:false, vendorId, paymentId, reference, amountMinor, kind };
  })();
}

function updatePaymentInitialization(db, reference, pay, status = PAYMENT_STATUSES.PENDING) {
  ensureSchema(db);
  db.prepare("UPDATE vendor_subscription_payments SET status=?,providerReference=?,authorizationUrl=?,updatedAt=? WHERE reference=? AND status='PENDING'")
    .run(status, cleanReference(pay?.reference || reference), pay?.authorization_url ? String(pay.authorization_url).slice(0,1000) : null, nowIso(), reference);
  return db.prepare("SELECT * FROM vendor_subscription_payments WHERE reference=?").get(reference);
}

function activateVerifiedPayment(db, payment, now = new Date()) {
  ensureSchema(db);
  const iso = nowIso(now);
  return db.transaction(() => {
    const current = db.prepare("SELECT * FROM vendor_subscription_payments WHERE id=? AND reference=?").get(payment.id, payment.reference);
    if (!current) throw new Error("Vendor payment record not found.");
    if (current.status === PAYMENT_STATUSES.VERIFIED) {
      const existingPeriod = db.prepare("SELECT * FROM vendor_subscription_periods WHERE paymentReference=?").get(current.reference);
      return { alreadyVerified:true, period:existingPeriod };
    }
    if (current.status === PAYMENT_STATUSES.CANCELLED) throw new Error("This vendor payment was cancelled.");
    const vendor = db.prepare("SELECT * FROM vendors WHERE id=? AND userId=?").get(current.vendorId,current.userId);
    if (!vendor) throw new Error("Vendor account not found.");
    const last = db.prepare("SELECT * FROM vendor_subscription_periods WHERE vendorId=? AND status IN ('ACTIVE','EXPIRED') ORDER BY endAt DESC LIMIT 1").get(vendor.id);
    const startAt = last && last.status === PERIOD_STATUSES.ACTIVE && new Date(last.endAt).getTime() > new Date(iso).getTime() ? last.endAt : iso;
    const endAt = addPeriod(startAt);
    const periodId = id("vsp");
    const reminderAt = new Date(new Date(startAt).getTime() + REMINDER_OFFSET_MS).toISOString();
    db.prepare("INSERT INTO vendor_subscription_periods(id,vendorId,userId,type,status,startAt,endAt,paymentReference,amountMinor,currency,reminderAt,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?)")
      .run(periodId,vendor.id,vendor.userId,current.kind,PERIOD_STATUSES.ACTIVE,startAt,endAt,current.reference,current.amountMinor,CURRENCY,reminderAt,iso,iso);
    db.prepare("UPDATE vendor_subscription_payments SET status='VERIFIED',providerReference=COALESCE(providerReference,?),verifiedAt=?,updatedAt=? WHERE id=? AND status!='VERIFIED'")
      .run(current.reference,iso,iso,current.id);
    db.prepare("UPDATE vendors SET status=CASE WHEN COALESCE(moderationStatus, 'active')='active' THEN 'active' ELSE 'inactive' END WHERE id=?").run(vendor.id);
    return { alreadyVerified:false, period:db.prepare("SELECT * FROM vendor_subscription_periods WHERE id=?").get(periodId) };
  })();
}

function retryPayment(db, { vendorId, userId, now = new Date() }) {
  ensureSchema(db);
  const vendor = db.prepare("SELECT * FROM vendors WHERE id=? AND userId=?").get(vendorId, userId);
  if (!vendor) throw new Error("Vendor account not found.");
  const pending = db.prepare("SELECT * FROM vendor_subscription_payments WHERE vendorId=? AND status='PENDING' ORDER BY createdAt DESC LIMIT 1").get(vendorId);
  if (pending) return { existing: true, payment: pending };
  const latest = db.prepare("SELECT * FROM vendor_subscription_payments WHERE vendorId=? ORDER BY createdAt DESC LIMIT 1").get(vendorId);
  const kind = latest?.kind === PERIOD_TYPES.PAID_ENTRY && !db.prepare("SELECT 1 FROM vendor_subscription_periods WHERE vendorId=? LIMIT 1").get(vendorId)
    ? PERIOD_TYPES.PAID_ENTRY
    : PERIOD_TYPES.RENEWAL;
  return createPaymentForVendor(db, { vendorId, userId, kind, now });
}

function launchOfferSummary(db) {
  ensureSchema(db);
  const used = countFreeSlots(db);
  const rows = db.prepare("SELECT slot, vendorId, userId, periodId, allocatedAt FROM vendor_launch_allocations ORDER BY slot ASC").all();
  return { freeSlotLimit: FREE_SLOT_LIMIT, consumed: used, remaining: Math.max(0, FREE_SLOT_LIMIT - used), open: used < FREE_SLOT_LIMIT, allocations: rows };
}

function closeVendorForAccount(db, userId, now = new Date(), withinTransaction = false) {
  ensureSchema(db);
  const iso = nowIso(now);
  const run = () => {
    const vendor = db.prepare("SELECT id FROM vendors WHERE userId=?").get(userId);
    if (!vendor) return { vendorFound: false, changed: false };
    db.prepare("UPDATE vendor_subscription_periods SET status='EXPIRED', updatedAt=? WHERE vendorId=? AND status='ACTIVE'").run(iso, vendor.id);
    const cancelled = db.prepare("UPDATE vendor_subscription_payments SET status='CANCELLED', updatedAt=? WHERE vendorId=? AND status='PENDING'").run(iso, vendor.id);
    const changed = db.prepare("UPDATE vendors SET status='inactive' WHERE id=? AND status!='inactive'").run(vendor.id);
    return { vendorFound: true, changed: changed.changes > 0, cancelledPayments: cancelled.changes, vendorId: vendor.id };
  };
  return withinTransaction ? run() : db.transaction(run)();
}

function cancelPayment(db, reference) {
  ensureSchema(db);
  return db.prepare("UPDATE vendor_subscription_payments SET status='CANCELLED',updatedAt=? WHERE reference=? AND status='PENDING'").run(nowIso(),reference).changes > 0;
}

function scheduleReminder(db, periodId) {
  ensureSchema(db);
  return db.prepare("SELECT * FROM vendor_subscription_periods WHERE id=?").get(periodId) || null;
}

function markReminderSent(db, periodId, userId, reminderType, sentAt) {
  ensureSchema(db);
  const inserted = db.prepare("INSERT OR IGNORE INTO vendor_subscription_reminders(id,subscriptionPeriodId,userId,reminderType,sentAt) VALUES(?,?,?,?,?)")
    .run(id("vsrem"),periodId,userId,reminderType,sentAt);
  if (inserted.changes) db.prepare("UPDATE vendor_subscription_periods SET reminderSentAt=?,updatedAt=? WHERE id=? AND reminderSentAt IS NULL").run(sentAt,sentAt,periodId);
  return inserted.changes > 0;
}

function dueReminders(db, now = new Date(), limit = 100) {
  ensureSchema(db);
  return db.prepare("SELECT * FROM vendor_subscription_periods WHERE status='ACTIVE' AND reminderAt <= ? AND reminderSentAt IS NULL ORDER BY reminderAt ASC LIMIT ?").all(nowIso(now), Math.min(Math.max(Number(limit)||100,1),500));
}

function history(db, userId, vendorId) {
  ensureSchema(db);
  const vendor = db.prepare("SELECT id FROM vendors WHERE id=? AND userId=?").get(vendorId,userId);
  if (!vendor) return null;
  return {
    periods: db.prepare("SELECT id,type,status,startAt,endAt,paymentReference,amountMinor,currency,createdAt,updatedAt FROM vendor_subscription_periods WHERE vendorId=? ORDER BY startAt DESC LIMIT 100").all(vendorId).map((r)=>({...publicPeriod(r),amount:money(r.amountMinor)})),
    payments: db.prepare("SELECT id,kind,reference,status,amountMinor,currency,providerReference,createdAt,verifiedAt FROM vendor_subscription_payments WHERE vendorId=? ORDER BY createdAt DESC LIMIT 100").all(vendorId).map((r)=>({...r,amount:money(r.amountMinor)})),
  };
}

function publicConstants() {
  return { freeSlotLimit: FREE_SLOT_LIMIT, entryPrice: money(ENTRY_AMOUNT_MINOR), renewalPrice: money(RENEWAL_AMOUNT_MINOR), periodDays: 30, reminderDay: 25 };
}

module.exports = {
  CURRENCY, FREE_SLOT_LIMIT, ENTRY_AMOUNT_MINOR, RENEWAL_AMOUNT_MINOR, PERIOD_MS, PERIOD_TYPES, PERIOD_STATUSES, PAYMENT_STATUSES,
  ensureSchema, countFreeSlots, freeSlotsRemaining, expireDue, activePeriod, vendorEntitlement, isVendorActive, publicPeriod, getVendorState,
  createFreeVendor, createPendingVendor, createPaymentForVendor, retryPayment, launchOfferSummary, closeVendorForAccount, updatePaymentInitialization, assertServerAmount, activateVerifiedPayment,
  cancelPayment, scheduleReminder, markReminderSent, dueReminders, history, publicConstants,
};
