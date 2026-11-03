"use strict";
const crypto = require("node:crypto");
const EVENT_NAMES = new Set(["onboarding_started", "onboarding_completed", "module_intro_viewed", "activation", "lifecycle_message_viewed", "seller_acquisition_started", "vendor_acquisition_started", "creator_acquisition_started", "dami_adoption", "marketplace_adoption", "sky_money_adoption"]);
const MODULES = new Set(["marketplace", "dami", "sky_money", "social", "customer_care", "wallet", "profile", "creator_tools"]);
const FLAGS = ["onboarding_v2", "referral_invites", "lifecycle_messaging", "seller_acquisition", "vendor_acquisition", "creator_acquisition", "dami_adoption", "marketplace_adoption", "sky_money_adoption", "growth_experiments"];
const COUNTRIES = new Set(require("./countries.json").map((item) => String(item.code || "").toUpperCase()));
const LANGUAGES = new Set(["en", "fr", "es", "pt", "ar", "ha", "yo", "ig", "pcm", "sw"]);
function exists(db, table) { return !!db.prepare("SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name=?").get(table); }
function columns(db, table) { return exists(db, table) ? new Set(db.prepare(`PRAGMA table_info("${table}")`).all().map((r) => r.name)) : new Set(); }
function normalizedCountry(value) { const v = String(value || "").trim().toUpperCase(); return COUNTRIES.has(v) ? v : null; }
function normalizedLanguage(value) { const v = String(value || "").trim().toLowerCase().split(/[-_]/)[0]; return LANGUAGES.has(v) ? v : null; }
function onboardingConfig({ country, language, userId, env = process.env } = {}) {
  const flags = Object.fromEntries(FLAGS.map((key) => [key, env[`NEXA_FLAG_${key.toUpperCase()}`] === "true"]));
  const rollout = {};
  for (const key of FLAGS) { const n = Number(env[`NEXA_ROLLOUT_${key.toUpperCase()}`] || 0); rollout[key] = flags[key] ? Math.max(0, Math.min(100, Number.isFinite(n) ? Math.floor(n) : 0)) : 0; }
  const assignments = userId ? assignFeatureFlags(userId, flags, rollout) : {};
  return { schemaVersion: 1, country: normalizedCountry(country), language: normalizedLanguage(language), countrySelectionRequired: true, languageSelectionRequired: true, modules: [...MODULES], flags, rollout, assignments, safeDefaults: true, externalMessagingEnabled: false };
}
function assignFeatureFlags(userId, flags, rollout) {
  const uid = String(userId || "").trim(); const result = {};
  for (const key of FLAGS) {
    const percent = flags[key] === true ? Math.max(0, Math.min(100, Number(rollout[key]) || 0)) : 0;
    const bucket = Number.parseInt(crypto.createHash("sha256").update(`${key}:${uid}`).digest("hex").slice(0, 8), 16) % 100;
    result[key] = percent > 0 && bucket < percent;
  }
  return result;
}
function recordEvent(db, { userId, eventName, idempotencyKey, country, language, module } = {}) {
  const uid = String(userId || "").trim(); const name = String(eventName || "").trim(); const key = String(idempotencyKey || "").trim();
  if (!uid) return { ok: false, code: "AUTH_REQUIRED" };
  if (!EVENT_NAMES.has(name)) return { ok: false, code: "EVENT_NOT_ALLOWED" };
  if (!key || key.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(key)) return { ok: false, code: "INVALID_IDEMPOTENCY_KEY" };
  const safe = { country: normalizedCountry(country), language: normalizedLanguage(language), module: MODULES.has(String(module || "")) ? String(module) : null };
  const now = new Date().toISOString(); const id = crypto.randomUUID();
  try {
    db.prepare("INSERT INTO nexa_growth_events (id,userId,eventName,idempotencyKey,context,createdAt) VALUES (?,?,?,?,?,?)").run(id, uid, name, key, JSON.stringify(safe), now);
    return { ok: true, duplicate: false, eventId: id };
  } catch (error) {
    if (/unique/i.test(String(error?.message || ""))) return { ok: true, duplicate: true };
    throw error;
  }
}
function getOrCreateReferralCode(db, userId) {
  const uid = String(userId || "").trim(); if (!uid) return { ok: false, code: "AUTH_REQUIRED" };
  const token = crypto.randomBytes(18).toString("base64url"); const hash = crypto.createHash("sha256").update(token).digest("hex"); const now = new Date().toISOString(); const id = crypto.randomUUID();
  if (exists(db, "nexa_zeeza_referral_tokens")) {
    db.prepare("INSERT INTO nexa_zeeza_referral_tokens (id,userId,codeHash,createdAt,disabledAt) VALUES (?,?,?,?,NULL)").run(id, uid, hash, now);
    return { ok: true, token, referralId: id, createdAt: now, programme: "zeeza", sharePath: `nexa://auth/signup?ref=${token}` };
  }
  const existing = db.prepare("SELECT id, createdAt, disabledAt FROM nexa_referral_codes WHERE userId=?").get(uid);
  if (existing && !existing.disabledAt) return { ok: true, codeAvailable: false, referralId: existing.id, createdAt: existing.createdAt, reason: "Existing code is stored as a one-way hash; token history table is not available in this database." };
  db.prepare("INSERT INTO nexa_referral_codes (id,userId,codeHash,createdAt,disabledAt) VALUES (?,?,?,?,NULL) ON CONFLICT(userId) DO UPDATE SET id=excluded.id,codeHash=excluded.codeHash,createdAt=excluded.createdAt,disabledAt=NULL").run(id, uid, hash, now);
  return { ok: true, token, referralId: id, createdAt: now };
}
function attributeReferral(db, { userId, token } = {}) {
  const uid = String(userId || "").trim(); const raw = String(token || "").trim();
  if (!uid) return { ok: false, code: "AUTH_REQUIRED" };
  if (!/^[A-Za-z0-9_-]{20,80}$/.test(raw)) return { ok: false, code: "INVALID_REFERRAL" };
  const hash = crypto.createHash("sha256").update(raw).digest("hex");
  const ref = exists(db, "nexa_zeeza_referral_tokens")
    ? (db.prepare("SELECT id,userId FROM nexa_zeeza_referral_tokens WHERE codeHash=? AND disabledAt IS NULL").get(hash) || db.prepare("SELECT id,userId FROM nexa_referral_codes WHERE codeHash=? AND disabledAt IS NULL").get(hash))
    : db.prepare("SELECT id,userId FROM nexa_referral_codes WHERE codeHash=? AND disabledAt IS NULL").get(hash);
  if (!ref || ref.userId === uid) return { ok: false, code: "INVALID_REFERRAL" };
  try { db.prepare("INSERT INTO nexa_referral_attributions (id,referralId,referrerUserId,referredUserId,createdAt) VALUES (?,?,?,?,?)").run(crypto.randomUUID(), ref.id, ref.userId, uid, new Date().toISOString()); return { ok: true, attributed: true }; }
  catch (error) { if (/unique/i.test(String(error?.message || ""))) return { ok: true, attributed: false, duplicate: true }; throw error; }
}

function normalizeReferralAccountType(value) {
  const v = String(value || "").trim().toLowerCase();
  if (["vendor", "seller", "merchant", "business"].includes(v)) return "vendor";
  if (["user", "consumer", "customer", "member"].includes(v)) return "user";
  return "unknown";
}
// Canonical account classification. req.user carries only id/email/name/username, so the type is
// read from server records: a vendors row means vendor; any other existing account is a user.
// Client-supplied or token-supplied hints are never used to grant vendor status.
function resolveReferralAccountType(db, userId) {
  const uid = String(userId || "").trim();
  if (!uid) return "unknown";
  try {
    if (exists(db, "vendors") && db.prepare("SELECT 1 AS ok FROM vendors WHERE userId=?").get(uid)) return "vendor";
    if (exists(db, "users") && db.prepare("SELECT 1 AS ok FROM users WHERE id=?").get(uid)) return "user";
  } catch (_) { /* fall through: unknown never earns a reward */ }
  return "unknown";
}
const DAY_MS = 24 * 60 * 60 * 1000;
const REWARD_STATUS_LABELS = Object.freeze({
  not_started: "Not started", scheduled: "Scheduled", in_progress: "In progress",
  account_type_review: "Account type review", pending_review: "Pending review",
  window_expired: "Expired", approved: "Approved", rejected: "Rejected", credited: "Credited",
});
const REWARD_ACCOUNT_TYPES = new Set(["user", "vendor", "unknown"]);
const REWARD_TYPE = "subscription_month";
function rewardTablesReady(db) { return exists(db, "nexa_zeeza_referral_reward_ledger") && exists(db, "nexa_zeeza_referral_reward_audit"); }
function omitHashFields(value) {
  if (Array.isArray(value)) return value.map(omitHashFields);
  if (value && typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) if (!/hash/i.test(k)) out[k] = omitHashFields(v);
    return out;
  }
  return value;
}
function inTransaction(db, fn) {
  if (typeof db.transaction === "function") return db.transaction(fn)();
  db.exec("BEGIN IMMEDIATE");
  try { const r = fn(); db.exec("COMMIT"); return r; } catch (e) { try { db.exec("ROLLBACK"); } catch (_) {} throw e; }
}
function ensureZeezaReferralCampaign(db, { userId, accountType, now = new Date() } = {}) {
  const uid = String(userId || "").trim();
  if (!uid) return { ok: false, code: "AUTH_REQUIRED" };
  const start = now instanceof Date ? now : new Date(now);
  if (!Number.isFinite(start.getTime())) return { ok: false, code: "INVALID_CAMPAIGN_TIME" };
  const startAt = start.toISOString();
  const endAt = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const type = normalizeReferralAccountType(accountType);
  const existing = db.prepare("SELECT id,userId,accountType,campaignStartAt,campaignEndAt,status,createdAt,updatedAt FROM nexa_zeeza_referral_campaigns WHERE userId=?").get(uid);
  if (existing && existing.campaignEndAt >= startAt && existing.status !== "expired") {
    if (existing.accountType === "unknown" && type !== "unknown") {
      db.prepare("UPDATE nexa_zeeza_referral_campaigns SET accountType=?,updatedAt=? WHERE userId=?").run(type, startAt, uid);
      existing.accountType = type; existing.updatedAt = startAt;
    }
    return { ok: true, created: false, campaign: existing };
  }
  if (existing) {
    db.prepare("UPDATE nexa_zeeza_referral_campaigns SET accountType=?,campaignStartAt=?,campaignEndAt=?,status='active',updatedAt=? WHERE userId=?").run(type === "unknown" ? existing.accountType : type, startAt, endAt, startAt, uid);
    return { ok: true, created: false, restarted: true, campaign: db.prepare("SELECT * FROM nexa_zeeza_referral_campaigns WHERE userId=?").get(uid) };
  }
  const campaign = { id: crypto.randomUUID(), userId: uid, accountType: type, campaignStartAt: startAt, campaignEndAt: endAt, status: "active", createdAt: startAt, updatedAt: startAt };
  db.prepare("INSERT INTO nexa_zeeza_referral_campaigns (id,userId,accountType,campaignStartAt,campaignEndAt,status,createdAt,updatedAt) VALUES (@id,@userId,@accountType,@campaignStartAt,@campaignEndAt,@status,@createdAt,@updatedAt)").run(campaign);
  return { ok: true, created: true, campaign };
}
function getZeezaReferralCampaignStatus(db, { userId, now = new Date() } = {}) {
  const uid = String(userId || "").trim();
  if (!uid) return { ok: false, code: "AUTH_REQUIRED" };
  const campaign = db.prepare("SELECT * FROM nexa_zeeza_referral_campaigns WHERE userId=?").get(uid);
  if (!campaign) return { ok: true, campaign: null, qualifiedReferrals: 0, referralsInWindow: 0, reward: { status: "not_started" } };
  const current = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const windowStart = campaign.campaignStartAt;
  const qualified = db.prepare(`
    SELECT a.referredUserId, a.createdAt,
      MIN(e.createdAt) AS activatedAt
    FROM nexa_referral_attributions a
    JOIN nexa_growth_events e ON e.userId=a.referredUserId AND e.eventName='activation'
      AND e.createdAt >= a.createdAt
    WHERE a.referrerUserId=? AND e.createdAt <= ?
    GROUP BY a.referredUserId, a.createdAt
  `).all(uid, current);
  const qualifiedReferrals = qualified.length;
  const referralsInWindow = qualified.filter(x => x.activatedAt >= windowStart && x.activatedAt <= campaign.campaignEndAt).length;
  const priorQualified = qualified.filter(x => x.activatedAt < windowStart).length;
  const vendor = campaign.accountType === "vendor";
  const isUser = campaign.accountType === "user";
  const target = vendor ? 100 : 30;
  const reached = vendor ? referralsInWindow >= 100 : isUser && referralsInWindow >= 30 && (priorQualified >= 20 || qualifiedReferrals >= 50);
  let rewardStatus = campaign.accountType === "unknown" ? "account_type_review" : current < windowStart ? "scheduled" : current > campaign.campaignEndAt && !reached ? "window_expired" : reached ? "pending_review" : "in_progress";
  if (campaign.status === "approved" || campaign.status === "credited") rewardStatus = campaign.status;
  let ledger = null;
  if (exists(db, "nexa_zeeza_referral_reward_ledger")) {
    ledger = db.prepare("SELECT id,status,decidedAt,updatedAt FROM nexa_zeeza_referral_reward_ledger WHERE campaignId=? AND rewardType=?").get(campaign.id, REWARD_TYPE) || null;
    if (ledger) rewardStatus = ledger.status;
  }
  const startMs = Date.parse(campaign.campaignStartAt), endMs = Date.parse(campaign.campaignEndAt), nowMs = Date.parse(current);
  const timing = Number.isFinite(startMs) && Number.isFinite(endMs) && Number.isFinite(nowMs)
    ? { campaignAgeDays: Math.max(0, Math.floor((nowMs - startMs) / DAY_MS)), remainingMs: Math.max(0, endMs - nowMs), remainingDays: Math.max(0, Math.ceil((endMs - nowMs) / DAY_MS)) }
    : { campaignAgeDays: null, remainingMs: null, remainingDays: null };
  return { ok: true, campaign, ...timing, qualifiedReferrals, referralsInWindow, target, aamiRewardsUnlocked: isUser && qualifiedReferrals >= 20, reward: { status: rewardStatus, statusLabel: REWARD_STATUS_LABELS[rewardStatus] || "Unknown", ledgerRecorded: !!ledger, eligibleForReview: reached, rewardType: reached ? "subscription_month" : null, note: vendor ? "100 verified signup-and-activation referrals within the 30-day campaign." : isUser ? "AAMI Rewards unlocks at 20 verified referrals; 30 additional verified referrals in a 30-day campaign are required for subscription-month review." : "Account type must be confirmed before reward eligibility can be evaluated." } };
}
const FOLLOWUP_SCAN_CAP = 500;
function parseFollowupQuery(query = {}) {
  const q = query && typeof query === "object" ? query : {};
  const one = (v) => (v === undefined || v === "" ? undefined : v);
  const bad = (field) => ({ ok: false, code: "INVALID_FILTER", field });
  const lim = one(q.limit), off = one(q.offset), type = one(q.accountType), st = one(q.status);
  if (lim !== undefined && !(typeof lim === "string" || typeof lim === "number")) return bad("limit");
  if (off !== undefined && !(typeof off === "string" || typeof off === "number")) return bad("offset");
  let limit = 100, offset = 0;
  if (lim !== undefined) { if (!/^\d{1,3}$/.test(String(lim))) return bad("limit"); limit = Number(lim); if (limit < 1 || limit > FOLLOWUP_SCAN_CAP) return bad("limit"); }
  if (off !== undefined) { if (!/^\d{1,6}$/.test(String(off))) return bad("offset"); offset = Number(off); }
  if (type !== undefined && !(typeof type === "string" && REWARD_ACCOUNT_TYPES.has(type))) return bad("accountType");
  if (st !== undefined && !(typeof st === "string" && Object.prototype.hasOwnProperty.call(REWARD_STATUS_LABELS, st))) return bad("status");
  return { ok: true, limit, offset, accountType: type, rewardStatus: st };
}
function listZeezaReferralFollowups(db, { limit = 100, offset = 0, accountType, rewardStatus, now = new Date() } = {}) {
  const safeLimit = Math.max(1, Math.min(FOLLOWUP_SCAN_CAP, Math.floor(Number(limit) || 100)));
  const safeOffset = Math.max(0, Math.min(100000, Math.floor(Number(offset) || 0)));
  const where = accountType ? "WHERE c.accountType=?" : "";
  const args = accountType ? [accountType] : [];
  const cols = "c.id,c.userId,c.accountType,c.campaignStartAt,c.campaignEndAt,c.status,c.createdAt,c.updatedAt";
  const rows = rewardStatus
    ? db.prepare(`SELECT ${cols} FROM nexa_zeeza_referral_campaigns c ${where} ORDER BY c.createdAt DESC, c.id DESC LIMIT ?`).all(...args, FOLLOWUP_SCAN_CAP)
    : db.prepare(`SELECT ${cols} FROM nexa_zeeza_referral_campaigns c ${where} ORDER BY c.createdAt DESC, c.id DESC LIMIT ? OFFSET ?`).all(...args, safeLimit, safeOffset);
  const shaped = rows.map(c => {
    const status = getZeezaReferralCampaignStatus(db, { userId: c.userId, now });
    return { ...c, qualifiedReferrals: status.qualifiedReferrals, referralsInWindow: status.referralsInWindow, target: status.target || (c.accountType === "vendor" ? 100 : 30), aamiRewardsUnlocked: status.aamiRewardsUnlocked === true, rewardStatus: status.reward.status, rewardStatusLabel: status.reward.statusLabel, eligibleForReview: status.reward.eligibleForReview === true, campaignAgeDays: status.campaignAgeDays, remainingDays: status.remainingDays, remainingMs: status.remainingMs };
  });
  return rewardStatus ? shaped.filter(r => r.rewardStatus === rewardStatus).slice(safeOffset, safeOffset + safeLimit) : shaped;
}

// Reward decisions. Qualification (counts) is computed by getZeezaReferralCampaignStatus; an
// administrator's decision is a separate, audited, idempotent record. Nothing here credits a
// subscription, wallet or coin balance.
function cleanReason(value) { if (typeof value !== "string") return null; const r = value.replace(/[\u0000-\u001f\u007f]/g, " ").trim(); return r.length >= 3 && r.length <= 300 ? r : null; }
function recordZeezaRewardDecision(db, { campaignUserId, decision, actorId, reason, now = new Date() } = {}) {
  const uid = String(campaignUserId || "").trim(); const actor = String(actorId || "").trim();
  const action = decision === "approve" ? "approve" : decision === "reject" ? "reject" : null;
  if (!uid || !actor) return { ok: false, code: "AUTH_REQUIRED" };
  if (!action) return { ok: false, code: "INVALID_DECISION" };
  const why = cleanReason(reason); if (!why) return { ok: false, code: "REASON_REQUIRED" };
  if (!rewardTablesReady(db)) return { ok: false, code: "REWARD_LEDGER_UNAVAILABLE" };
  const when = now instanceof Date ? now : new Date(now); if (!Number.isFinite(when.getTime())) return { ok: false, code: "INVALID_CAMPAIGN_TIME" };
  const status = getZeezaReferralCampaignStatus(db, { userId: uid, now: when });
  if (!status.ok || !status.campaign) return { ok: false, code: "CAMPAIGN_NOT_FOUND" };
  const target = action === "approve" ? "approved" : "rejected";
  const read = () => db.prepare("SELECT id,campaignId,userId,rewardType,status,decidedAt,updatedAt FROM nexa_zeeza_referral_reward_ledger WHERE campaignId=? AND rewardType=?").get(status.campaign.id, REWARD_TYPE);
  const prior = read();
  if (prior) return prior.status === target ? { ok: true, duplicate: true, ledger: prior } : { ok: false, code: "DECISION_ALREADY_RECORDED", currentStatus: prior.status };
  if (status.campaign.accountType === "unknown") return { ok: false, code: "ACCOUNT_TYPE_REVIEW" };
  if (status.reward.eligibleForReview !== true) return { ok: false, code: "NOT_ELIGIBLE" };
  const at = when.toISOString(); const ledgerId = crypto.randomUUID();
  try {
    inTransaction(db, () => {
      db.prepare("INSERT INTO nexa_zeeza_referral_reward_ledger (id,campaignId,userId,rewardType,status,decidedBy,decidedAt,updatedAt) VALUES (?,?,?,?,?,?,?,?)").run(ledgerId, status.campaign.id, uid, REWARD_TYPE, target, actor, at, at);
      db.prepare("INSERT INTO nexa_zeeza_referral_reward_audit (id,ledgerId,campaignId,userId,action,fromStatus,toStatus,actorId,reason,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)").run(crypto.randomUUID(), ledgerId, status.campaign.id, uid, action, null, target, actor, why, at);
    });
  } catch (error) {
    if (/unique/i.test(String(error?.message || ""))) { const raced = read(); if (raced && raced.status === target) return { ok: true, duplicate: true, ledger: raced }; return { ok: false, code: "DECISION_ALREADY_RECORDED", currentStatus: raced ? raced.status : null }; }
    throw error;
  }
  return { ok: true, duplicate: false, ledger: read() };
}
// Records that an operator applied the approved month outside this module. This module never applies it.
function recordZeezaRewardCredit(db, { campaignUserId, actorId, reason, now = new Date() } = {}) {
  const uid = String(campaignUserId || "").trim(); const actor = String(actorId || "").trim();
  if (!uid || !actor) return { ok: false, code: "AUTH_REQUIRED" };
  const why = cleanReason(reason); if (!why) return { ok: false, code: "REASON_REQUIRED" };
  if (!rewardTablesReady(db)) return { ok: false, code: "REWARD_LEDGER_UNAVAILABLE" };
  const when = now instanceof Date ? now : new Date(now); if (!Number.isFinite(when.getTime())) return { ok: false, code: "INVALID_CAMPAIGN_TIME" };
  const campaign = db.prepare("SELECT id FROM nexa_zeeza_referral_campaigns WHERE userId=?").get(uid);
  if (!campaign) return { ok: false, code: "CAMPAIGN_NOT_FOUND" };
  const row = db.prepare("SELECT id,campaignId,userId,rewardType,status,decidedAt,updatedAt FROM nexa_zeeza_referral_reward_ledger WHERE campaignId=? AND rewardType=?").get(campaign.id, REWARD_TYPE);
  if (!row) return { ok: false, code: "NOT_APPROVED" };
  if (row.status === "credited") return { ok: true, duplicate: true, ledger: row };
  if (row.status !== "approved") return { ok: false, code: "NOT_APPROVED", currentStatus: row.status };
  const at = when.toISOString();
  inTransaction(db, () => {
    const changed = db.prepare("UPDATE nexa_zeeza_referral_reward_ledger SET status='credited',updatedAt=? WHERE id=? AND status='approved'").run(at, row.id);
    if (!changed.changes) throw new Error("credit state changed concurrently");
    db.prepare("INSERT INTO nexa_zeeza_referral_reward_audit (id,ledgerId,campaignId,userId,action,fromStatus,toStatus,actorId,reason,createdAt) VALUES (?,?,?,?,?,?,?,?,?,?)").run(crypto.randomUUID(), row.id, campaign.id, uid, "credit", "approved", "credited", actor, why, at);
  });
  return { ok: true, duplicate: false, ledger: db.prepare("SELECT id,campaignId,userId,rewardType,status,decidedAt,updatedAt FROM nexa_zeeza_referral_reward_ledger WHERE id=?").get(row.id) };
}

function buildGrowthReadiness(db, env = process.env) {
  const has = (table, required = []) => { const cols = columns(db, table); return { available: cols.size > 0 && required.every((x) => cols.has(x)), source: cols.size ? table : null, missing: cols.size ? required.filter((x) => !cols.has(x)) : required }; };
  const flags = onboardingConfig({ env }).flags;
  const readiness = {
    onboarding: { available: true, source: "versioned onboarding configuration", details: "Country/language allowlists and module catalogue available; UI adoption is measured only when canonical events are recorded." },
    events: has("nexa_growth_events", ["userId", "eventName", "idempotencyKey", "createdAt"]),
    referrals: has("nexa_referral_codes", ["userId", "codeHash", "disabledAt"]),
    attribution: has("nexa_referral_attributions", ["referrerUserId", "referredUserId", "createdAt"]),
    lifecycleMessaging: { available: false, source: null, details: "Delivery is deliberately disabled until approved providers, consent rules and durable delivery receipts are configured." },
    activation: { available: exists(db, "nexa_growth_events"), source: exists(db, "nexa_growth_events") ? "allowlisted growth events" : null },
    retention: { available: false, source: null, details: "Cohort retention needs canonical, consent-aware activity history and a defined cohort policy." },
    membershipConversion: { available: false, source: null, details: "Canonical membership funnel source is not yet configured." },
    sellerAcquisition: { available: exists(db, "nexa_growth_events"), source: "allowlisted growth events" },
    vendorAcquisition: { available: exists(db, "nexa_growth_events"), source: "allowlisted growth events" },
    creatorAcquisition: { available: exists(db, "nexa_growth_events"), source: "allowlisted growth events" },
    damiAdoption: { available: exists(db, "nexa_growth_events"), source: "allowlisted growth events" },
    marketplaceAdoption: { available: exists(db, "nexa_growth_events"), source: "allowlisted growth events" },
    skyMoneyAdoption: { available: exists(db, "nexa_growth_events"), source: "allowlisted growth events; no financial mutation" },
    experiments: { available: true, source: "environment-backed allowlisted flags", details: "Flags default off; rollout is 0% unless explicitly enabled and assigned." },
    featureFlags: flags,
    rollout: onboardingConfig({ env }).rollout,
    safeRollout: true,
    rewardsExecuted: false,
    externalMessagingEnabled: false,
  };
  return { generatedAt: new Date().toISOString(), authority: "NEXA Main", readOnlyForAdmin: true, readiness };
}
module.exports = { EVENT_NAMES, MODULES, FLAGS, normalizedCountry, normalizedLanguage, onboardingConfig, assignFeatureFlags, recordEvent, getOrCreateReferralCode, attributeReferral, normalizeReferralAccountType, resolveReferralAccountType, ensureZeezaReferralCampaign, getZeezaReferralCampaignStatus, parseFollowupQuery, listZeezaReferralFollowups, recordZeezaRewardDecision, recordZeezaRewardCredit, omitHashFields, REWARD_STATUS_LABELS, buildGrowthReadiness };
