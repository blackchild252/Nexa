"use strict";
const crypto = require("crypto");
const subscriptions = require("./subscriptions");

const VERSION = "1.0.0";
const COIN_NAME = "Aami";
const QUALIFIED_VIEW_MS = 3000;
const LIKE_REWARD = 1;
const LIKE_DAILY_CAP = 25;
const AAMI_FRIEND_UNLOCK_COUNT = 20;
const AAMI_FRIEND_UNLOCK_PLANS = Object.freeze(new Set(["free", "regular"]));
const NGN_PER_AAMI = 1;
const AAMI_PAYMENT_UNIT = "Aami";
const ACTIVITY_RULES = Object.freeze({
  yaayz_like: Object.freeze({ amount: 1, dailyCap: 25 }),
  yaayz_post: Object.freeze({ amount: 10, dailyCap: 2 }),
  yaayz_comment: Object.freeze({ amount: 2, dailyCap: 10 }),
  yaayz_share: Object.freeze({ amount: 2, dailyCap: 5 }),
  marketplace_review: Object.freeze({ amount: 10, dailyCap: 3 }),
  marketplace_purchase: Object.freeze({ amount: 0, perUnit: 5, unitMinor: 100000, maxPerEvent: 50 }),
  kitchen_referral: Object.freeze({ amount: 0, percent: 2.5, maxPerEvent: 500 }),
  successful_referral: Object.freeze({ amount: 100, dailyCap: 5 }),
  daily_streak: Object.freeze({ amount: 5, maxBonus: 25, dailyCap: 1 }),
  challenge: Object.freeze({ amount: 10, dailyCap: 5 }),
  learning: Object.freeze({ amount: 10, dailyCap: 5 }),
  feedback: Object.freeze({ amount: 10, dailyCap: 2 }),
  bug_report: Object.freeze({ amount: 25, maxPerEvent: 100, dailyCap: 3 }),
  community_achievement: Object.freeze({ amount: 25, dailyCap: 3 }),
  seller_order: Object.freeze({ amount: 5, dailyCap: 20 }),
  promotional_campaign: Object.freeze({ amount: 0, maxPerEvent: 1000 })
});

const PPV = Object.freeze({
  regular: Object.freeze({ percent: 15, maxViews: 15 }),
  premium: Object.freeze({ percent: 25, maxViews: 25 }),
  vip: Object.freeze({ percent: 35, maxViews: 35 }),
});

function id(prefix) { return `${prefix}_${Date.now()}_${crypto.randomBytes(6).toString("hex")}`; }
function now() { return new Date().toISOString(); }
function cleanId(v) { return String(v || "").trim(); }
function periodWindow(sub) { return sub ? `${sub.id}:${sub.currentPeriodStart}:${sub.currentPeriodEnd}` : `free:${new Date().toISOString().slice(0,10)}`; }
function publicAmount(n) { return Number(n || 0); }
function ngnToAami(amountNgn) {
  const n = Number(amountNgn);
  if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error("Invalid NEXA Aami payment amount."), { status:400, code:"AAMI_INVALID_NGN_AMOUNT" });
  return Math.ceil(n / NGN_PER_AAMI);
}
function aamiToNgn(amountAami) {
  const n = Number(amountAami);
  if (!Number.isFinite(n) || n < 0) throw Object.assign(new Error("Invalid Aami amount."), { status:400, code:"AAMI_INVALID_AMOUNT" });
  return n * NGN_PER_AAMI;
}
function financialPolicy() {
  return Object.freeze({ unit: AAMI_PAYMENT_UNIT, ngnPerAami: NGN_PER_AAMI, integerAami: true, userVisible: false });
}

function ensureSchema(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS aami_accounts (
      userId TEXT PRIMARY KEY,
      balance INTEGER NOT NULL DEFAULT 0 CHECK(balance >= 0),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','locked','closed')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS aami_ledger (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      direction TEXT NOT NULL CHECK(direction IN ('credit','debit')),
      amount INTEGER NOT NULL CHECK(amount > 0),
      source TEXT NOT NULL,
      reference TEXT NOT NULL,
      idempotencyKey TEXT,
      metadata TEXT NOT NULL DEFAULT '{}',
      createdAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_aami_ledger_idem ON aami_ledger(userId,idempotencyKey) WHERE idempotencyKey IS NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_aami_ledger_user_created ON aami_ledger(userId,createdAt DESC);
    CREATE TABLE IF NOT EXISTS yaayz_social_posts (
      id TEXT PRIMARY KEY,
      authorId TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      mediaUrl TEXT,
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('draft','published','hidden','removed')),
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_yaayz_social_posts_status_created ON yaayz_social_posts(status,createdAt DESC);
    CREATE TABLE IF NOT EXISTS yaayz_social_likes (
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY(postId,userId)
    );
    CREATE INDEX IF NOT EXISTS idx_yaayz_social_likes_post ON yaayz_social_likes(postId);
    CREATE TABLE IF NOT EXISTS yaayz_social_comments (id TEXT PRIMARY KEY,postId TEXT NOT NULL,userId TEXT NOT NULL,comment TEXT NOT NULL,createdAt TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS idx_yaayz_social_comments_post ON yaayz_social_comments(postId,createdAt DESC);
    CREATE TABLE IF NOT EXISTS yaayz_social_shares (postId TEXT NOT NULL,userId TEXT NOT NULL,createdAt TEXT NOT NULL,PRIMARY KEY(postId,userId));
    CREATE TABLE IF NOT EXISTS yaayz_social_views (
      id TEXT PRIMARY KEY,
      postId TEXT NOT NULL,
      userId TEXT NOT NULL,
      windowKey TEXT NOT NULL,
      qualified INTEGER NOT NULL DEFAULT 0 CHECK(qualified IN (0,1)),
      watchMs INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_yaayz_social_view_window ON yaayz_social_views(postId,userId,windowKey);
    CREATE INDEX IF NOT EXISTS idx_yaayz_social_views_post ON yaayz_social_views(postId,createdAt DESC);
    CREATE TABLE IF NOT EXISTS aami_reward_events (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      source TEXT NOT NULL,
      sourceId TEXT NOT NULL,
      amount INTEGER NOT NULL CHECK(amount > 0),
      planId TEXT,
      windowKey TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_aami_reward_source ON aami_reward_events(userId,source,sourceId);
    CREATE TABLE IF NOT EXISTS aami_streak_checkins (
      userId TEXT NOT NULL,
      dayKey TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      PRIMARY KEY(userId,dayKey)
    );
    CREATE INDEX IF NOT EXISTS idx_aami_streak_checkins_user_day ON aami_streak_checkins(userId,dayKey DESC);
    CREATE TABLE IF NOT EXISTS aami_activity_claims (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      source TEXT NOT NULL,
      amount INTEGER,
      metadata TEXT NOT NULL DEFAULT '{}',
      status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','redeemed','cancelled')),
      expiresAt TEXT,
      createdAt TEXT NOT NULL,
      redeemedAt TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_aami_activity_claims_user ON aami_activity_claims(userId,status,createdAt DESC);
  `);
}

function ensureAccount(db, userId) {
  ensureSchema(db);
  const u = db.prepare("SELECT id,accountStatus,adultConfirmedAt FROM users WHERE id=?").get(userId);
  if (!u || u.accountStatus === "closed") throw Object.assign(new Error("Aami is unavailable for this account."), { status: 403, code: "ACCOUNT_CLOSED" });
  if (!u.adultConfirmedAt) throw Object.assign(new Error("Aami is available only to confirmed NEXA members aged 18 and above."), { status: 403, code: "AGE_RESTRICTION" });
  db.prepare("INSERT INTO aami_accounts(userId,balance,status,createdAt,updatedAt) VALUES(?,0,'active',?,?) ON CONFLICT(userId) DO NOTHING").run(userId,now(),now());
  const account = db.prepare("SELECT * FROM aami_accounts WHERE userId=?").get(userId);
  if (!account || account.status !== "active") throw Object.assign(new Error("Aami account is not active."), { status: 409, code: "AAMI_LOCKED" });
  return account;
}

function balance(db,userId) { return Number(ensureAccount(db,userId).balance || 0); }
function ledgerEntry(db,userId,direction,amount,source,reference,idempotencyKey,metadata={}) {
  ensureAccount(db,userId);
  const n = Math.floor(Number(amount));
  if (!Number.isFinite(n) || n <= 0) throw new Error("Aami amount must be a positive whole coin amount.");
  const existing = idempotencyKey ? db.prepare("SELECT * FROM aami_ledger WHERE userId=? AND idempotencyKey=?").get(userId,idempotencyKey) : null;
  if (existing) return { duplicate:true, entry:existing, balance:balance(db,userId) };
  const at = now();
  const work = () => {
    const account = db.prepare("SELECT * FROM aami_accounts WHERE userId=?").get(userId);
    const next = Number(account.balance) + (direction === "credit" ? n : -n);
    if (next < 0) throw Object.assign(new Error("Insufficient Aami balance."), { status:409, code:"AAMI_INSUFFICIENT" });
    const entryId = id("aami");
    db.prepare("INSERT INTO aami_ledger(id,userId,direction,amount,source,reference,idempotencyKey,metadata,createdAt) VALUES(?,?,?,?,?,?,?,?,?)")
      .run(entryId,userId,direction,n,source,reference,idempotencyKey||null,JSON.stringify(metadata||{}),at);
    db.prepare("UPDATE aami_accounts SET balance=?,updatedAt=? WHERE userId=? AND status='active'").run(next,at,userId);
    return { duplicate:false, entry:db.prepare("SELECT * FROM aami_ledger WHERE id=?").get(entryId), balance:next };
  };
  return db.inTransaction ? work() : db.transaction(work)();
}
function credit(db,userId,amount,source,reference,idempotencyKey,metadata={}) { return ledgerEntry(db,userId,"credit",amount,source,reference,idempotencyKey,metadata); }
function debit(db,userId,amount,source,reference,idempotencyKey,metadata={}) { return ledgerEntry(db,userId,"debit",amount,source,reference,idempotencyKey,metadata); }

function activityRule(source) { return ACTIVITY_RULES[String(source||'').trim()] || null; }
function activityCountToday(db,userId,source) { const day=new Date().toISOString().slice(0,10); return Number(db.prepare("SELECT COUNT(*) c FROM aami_reward_events WHERE userId=? AND source=? AND createdAt LIKE ?").get(userId,source,`${day}%`)?.c||0); }
function activityAmount(source, metadata={}) {
  const rule=activityRule(source); if(!rule) throw Object.assign(new Error("Unknown Aami earning activity."),{status:400,code:"AAMI_UNKNOWN_ACTIVITY"});
  if (source==='marketplace_purchase') return Math.min(rule.maxPerEvent, Math.floor(Number(metadata.totalMinor||0)/rule.unitMinor)*rule.perUnit);
  if (source==='kitchen_referral') return Math.min(rule.maxPerEvent, Math.floor(Number(metadata.total||0)*rule.percent/100));
  if (source==='bug_report' || source==='promotional_campaign') {
    const verified=metadata.verifiedAmount==null ? rule.amount : Math.floor(Number(metadata.verifiedAmount));
    if(!Number.isFinite(verified) || verified<=0) return 0;
    return Math.min(rule.maxPerEvent, Math.max(rule.amount, verified));
  }
  if (source==='daily_streak') {
    const streak=Math.max(1,Math.floor(Number(metadata.serverStreak||1)));
    return Math.min(rule.amount + Math.max(0,streak-1), rule.maxBonus);
  }
  return rule.amount;
}
function awardActivity(db,userId,source,sourceId,metadata={}) {
  ensureAccount(db,userId);
  const eligibility=assertAamiEarningUnlocked(db,userId);
  if(eligibility.locked) return {credited:false,duplicate:false,capped:false,locked:true,amount:0,balance:balance(db,userId),eligibility};
  const rule=activityRule(source); if(!rule) throw Object.assign(new Error("Unknown Aami earning activity."),{status:400,code:"AAMI_UNKNOWN_ACTIVITY"});
  const sid=String(sourceId||'').trim(); if(!sid) throw new Error("Aami activity source is required.");
  const work=()=>{
    const existing=db.prepare("SELECT * FROM aami_reward_events WHERE userId=? AND source=? AND sourceId=?").get(userId,source,sid);
    if(existing) return {credited:false,duplicate:true,amount:Number(existing.amount),balance:balance(db,userId),event:existing};
    if(rule.dailyCap!=null && activityCountToday(db,userId,source)>=rule.dailyCap) return {credited:false,duplicate:false,capped:true,amount:0,balance:balance(db,userId)};
    const amount=activityAmount(source,metadata); if(amount<=0) return {credited:false,duplicate:false,amount:0,balance:balance(db,userId)};
    const windowKey=String(metadata.windowKey||new Date().toISOString().slice(0,10));
    const c=credit(db,userId,amount,source,sid,`aami-activity:${source}:${sid}`,metadata);
    db.prepare("INSERT INTO aami_reward_events(id,userId,source,sourceId,amount,planId,windowKey,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(id("reward"),userId,source,sid,amount,metadata.planId||activePlan(db,userId),windowKey,now());
    return {credited:true,duplicate:false,amount,balance:c.balance};
  };
  return db.inTransaction ? work() : db.transaction(work)();
}
function migrateKitchenCashback(db) {
  ensureSchema(db);
  try {
    const cols=db.prepare("PRAGMA table_info(kitchen_cashback_ledger)").all().map(x=>x.name);
    if(!cols.includes('migratedToAami')) db.exec("ALTER TABLE kitchen_cashback_ledger ADD COLUMN migratedToAami INTEGER NOT NULL DEFAULT 0");
    if(!cols.includes('migrationRef')) db.exec("ALTER TABLE kitchen_cashback_ledger ADD COLUMN migrationRef TEXT");
    const rows=db.prepare("SELECT * FROM kitchen_cashback_ledger WHERE status='available' AND migratedToAami=0 ORDER BY createdAt ASC").all();
    for(const row of rows){
      const amount=Math.floor(Number(row.amount||0));
      const migrationRef=`kitchen-cashback-migrate:${row.id}`;
      if(amount<=0){db.prepare("UPDATE kitchen_cashback_ledger SET migratedToAami=1,migrationRef=? WHERE id=?").run(`kitchen-cashback-zero:${row.id}`,row.id);continue;}
      const existing=db.prepare("SELECT * FROM aami_ledger WHERE userId=? AND idempotencyKey=?").get(row.beneficiaryId,`aami-legacy-kitchen:${row.id}`);
      const r=existing ? {duplicate:true} : db.transaction(()=>{
        const c=credit(db,row.beneficiaryId,amount,'kitchen_cashback_migration',String(row.id),`aami-legacy-kitchen:${row.id}`,{legacy:true,sourceOrderId:row.sourceOrderId,currency:row.currency,originalCashbackAmount:amount});
        db.prepare("INSERT INTO aami_reward_events(id,userId,source,sourceId,amount,planId,windowKey,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(id('reward'),row.beneficiaryId,'kitchen_cashback_migration',String(row.id),amount,'legacy',String(row.createdAt||'').slice(0,10),now());
        return c;
      })();
      if(r.credited||r.duplicate){db.prepare("UPDATE kitchen_cashback_ledger SET status='migrated_to_aami',migratedToAami=1,migrationRef=? WHERE id=?").run(migrationRef,row.id);}
    }
  } catch (e) { console.warn('[NEXA] Kitchen cashback migration deferred:',e.message); }
}

function createClaim(db,userId,source,amount,metadata={},expiresAt=null){
  ensureAccount(db,userId);
  const rule=activityRule(source);
  if(!rule) throw Object.assign(new Error('Unknown Aami earning activity.'),{status:400,code:'AAMI_UNKNOWN_ACTIVITY'});
  const variableSources=new Set(['bug_report','promotional_campaign']);
  const n=amount==null?null:Math.floor(Number(amount));
  if(n!=null && (!Number.isFinite(n)||n<=0)) throw Object.assign(new Error('Claim amount must be positive.'),{status:400});
  if(!variableSources.has(source) && n!=null && n!==rule.amount) throw Object.assign(new Error('Claim amount does not match the authoritative Aami rule.'),{status:400,code:'AAMI_CLAIM_AMOUNT_MISMATCH'});
  if(variableSources.has(source) && n!=null && (n<rule.amount || n>rule.maxPerEvent)) throw Object.assign(new Error('Claim amount is outside the authoritative Aami range.'),{status:400,code:'AAMI_CLAIM_AMOUNT_OUT_OF_RANGE'});
  const claimId=id('claim');
  db.prepare("INSERT INTO aami_activity_claims(id,userId,source,amount,metadata,status,expiresAt,createdAt) VALUES(?,?,?,?,?,'open',?,?)").run(claimId,userId,source,n,JSON.stringify(metadata||{}),expiresAt,now());
  return {claimId,source,amount:n,expiresAt};
}
function redeemClaim(db,userId,claimId){
  ensureAccount(db,userId);
  const claim=db.prepare("SELECT * FROM aami_activity_claims WHERE id=? AND userId=? AND status='open'").get(String(claimId||''),userId);
  if(!claim) throw Object.assign(new Error('Aami claim is unavailable or already redeemed.'),{status:409,code:'AAMI_CLAIM_UNAVAILABLE'});
  if(claim.expiresAt && new Date(claim.expiresAt).getTime()<Date.now()){db.prepare("UPDATE aami_activity_claims SET status='cancelled' WHERE id=?").run(claim.id);throw Object.assign(new Error('Aami claim has expired.'),{status:409,code:'AAMI_CLAIM_EXPIRED'});}
  const metadata=JSON.parse(claim.metadata||'{}');
  const result=awardActivity(db,userId,claim.source,claim.id,{...metadata,...(claim.amount!=null?{verifiedAmount:claim.amount}:{})});
  if(result.credited||result.duplicate) db.prepare("UPDATE aami_activity_claims SET status='redeemed',redeemedAt=? WHERE id=? AND status='open'").run(now(),claim.id);
  return {...result,claimId:claim.id};
}


function streakCheckIn(db,userId,today){
  const exists=db.prepare("SELECT 1 FROM aami_streak_checkins WHERE userId=? AND dayKey=?").get(userId,today);
  if(exists){ const prior=awardActivity(db,userId,'daily_streak',`streak:${today}`,{serverStreak:1}); return {...prior,streak:1}; }
  db.prepare("INSERT INTO aami_streak_checkins(userId,dayKey,createdAt) VALUES(?,?,?)").run(userId,today,now());
  const rows=db.prepare("SELECT dayKey FROM aami_streak_checkins WHERE userId=? ORDER BY dayKey DESC LIMIT 6").all(userId).map(r=>r.dayKey);
  let streak=1;
  for(let i=1;i<rows.length;i++){
    const a=new Date(`${rows[i-1]}T00:00:00Z`).getTime();
    const b=new Date(`${rows[i]}T00:00:00Z`).getTime();
    if(a-b===86400000) streak++; else break;
  }
  const result=awardActivity(db,userId,'daily_streak',`streak:${today}`,{serverStreak:Math.min(5,streak)});
  return {...result,streak:Math.min(5,streak)};
}

function ppvPlan(planId) {
  const key = String(planId || "").toLowerCase();
  return PPV[key] || null;
}
function ppvPool(planId) {
  const plan = subscriptions.PLANS[String(planId || "").toLowerCase()];
  const rule = ppvPlan(planId);
  if (!plan || !rule || plan.monthlyFeeMinor <= 0) return { planId, percent:0, pool:0, maxViews:0, perView:0 };
  const subscriptionNaira = Number(plan.monthlyFeeMinor) / 100;
  const pool = Math.floor(subscriptionNaira * rule.percent);
  return { planId, percent:rule.percent, pool, maxViews:rule.maxViews, perView:Math.max(1,Math.floor(pool/rule.maxViews)) };
}
function friendCount(db,userId) {
  try { return Number(db.prepare("SELECT COUNT(*) AS n FROM friendships WHERE userId=?").get(userId)?.n || 0); }
  catch (_) { return 0; }
}
function aamiEarningEligibility(db,userId) {
  const planId=activePlan(db,userId);
  const friends=friendCount(db,userId);
  const gated=AAMI_FRIEND_UNLOCK_PLANS.has(planId);
  const unlocked=!gated || friends>=AAMI_FRIEND_UNLOCK_COUNT;
  return { unlocked, gated, planId, friends, requiredFriends:AAMI_FRIEND_UNLOCK_COUNT, remainingFriends:Math.max(0,AAMI_FRIEND_UNLOCK_COUNT-friends) };
}
function assertAamiEarningUnlocked(db,userId) {
  const eligibility=aamiEarningEligibility(db,userId);
  if (!eligibility.unlocked) return { ...eligibility, locked:true };
  return { ...eligibility, locked:false };
}
function maybeNotifyAamiUnlock(db,userId,sendPush) {
  if(typeof sendPush!=="function") return {eligible:false,notified:false};
  const eligibility=aamiEarningEligibility(db,userId);
  if(!eligibility.unlocked || !eligibility.gated || eligibility.friends < AAMI_FRIEND_UNLOCK_COUNT) return {eligible:eligibility.unlocked,notified:false,eligibility};
  try {
    const result=sendPush(userId,"Aami unlocked","You reached 20 friends. Aami rewards are now unlocked for your Free or Regular membership.",{screen:"money_group",action:"money_group",type:"money",aamiUnlock:true,inAppPopup:true,animation:"aami_unlock",friendCount:eligibility.friends,dedupeKey:`aami-unlock:${userId}:${eligibility.planId}`});
    return {eligible:true,notified:true,eligibility,push:result};
  } catch (_) { return {eligible:true,notified:false,eligibility}; }
}
function activePlan(db,userId) {
  const sub = subscriptions.currentSubscription(db,userId);
  return sub?.status === "active" ? String(sub.planId || "free") : "free";
}
function rewardWindow(db,userId) {
  const stored = subscriptions.currentSubscription(db,userId);
  const sub = stored && stored.status === "active" ? stored : null;
  return { key:periodWindow(sub), sub };
}

function like(db,userId,postId) {
  ensureAccount(db,userId);
  const post = db.prepare("SELECT * FROM yaayz_social_posts WHERE id=? AND status='published'").get(postId);
  if (!post) throw Object.assign(new Error("Yaayz post not found."),{status:404});
  if (post.authorId === userId) throw Object.assign(new Error("You cannot like your own Yaayz post."),{status:409});
  const existing = db.prepare("SELECT 1 FROM yaayz_social_likes WHERE postId=? AND userId=?").get(postId,userId);
  if (existing) return {liked:true,duplicate:true,likeCount:countLikes(db,postId),reward:0};
  const result = db.transaction(() => {
    db.prepare("INSERT INTO yaayz_social_likes(postId,userId,createdAt) VALUES(?,?,?)").run(postId,userId,now());
    const reward=awardActivity(db,userId,'yaayz_like',postId,{dailyCap:LIKE_DAILY_CAP}).amount;
    return {liked:true,duplicate:false,likeCount:countLikes(db,postId),reward};
  })();
  return result;
}
function comment(db,userId,postId,commentText){
  ensureAccount(db,userId); const postRow=db.prepare("SELECT id,authorId FROM yaayz_social_posts WHERE id=? AND status='published'").get(postId); if(!postRow) throw Object.assign(new Error("Yaayz post not found."),{status:404});
  const text=String(commentText||'').trim().slice(0,500); if(!text) throw Object.assign(new Error("Comment cannot be empty."),{status:400});
  const cid=id('yc'); const t=now(); db.prepare("INSERT INTO yaayz_social_comments(id,postId,userId,comment,createdAt) VALUES(?,?,?,?,?)").run(cid,postId,userId,text,t);
  const reward=awardActivity(db,userId,'yaayz_comment',cid,{}).amount; return {comment:{id:cid,postId,userId,comment:text,createdAt:t},reward};
}
function comments(db,userId,postId){ ensureAccount(db,userId); return db.prepare("SELECT c.id,c.postId,c.userId,u.name AS authorName,c.comment,c.createdAt FROM yaayz_social_comments c JOIN users u ON u.id=c.userId WHERE c.postId=? ORDER BY c.createdAt DESC LIMIT 50").all(postId); }
function share(db,userId,postId){
  ensureAccount(db,userId); const postRow=db.prepare("SELECT id FROM yaayz_social_posts WHERE id=? AND status='published'").get(postId); if(!postRow) throw Object.assign(new Error("Yaayz post not found."),{status:404});
  const result=db.prepare("INSERT OR IGNORE INTO yaayz_social_shares(postId,userId,createdAt) VALUES(?,?,?)").run(postId,userId,now()); if(!result.changes) return {shared:true,duplicate:true,reward:0};
  return {shared:true,duplicate:false,reward:awardActivity(db,userId,'yaayz_share',postId,{}).amount};
}
function unlike(db,userId,postId) {
  ensureAccount(db,userId);
  const changed=db.prepare("DELETE FROM yaayz_social_likes WHERE postId=? AND userId=?").run(postId,userId).changes;
  return {liked:false,removed:changed>0,likeCount:countLikes(db,postId)};
}
function countLikes(db,postId) { return Number(db.prepare("SELECT COUNT(*) c FROM yaayz_social_likes WHERE postId=?").get(postId)?.c || 0); }

function recordView(db,userId,postId,watchMs) {
  ensureAccount(db,userId);
  const post=db.prepare("SELECT * FROM yaayz_social_posts WHERE id=? AND status='published'").get(postId);
  if(!post) throw Object.assign(new Error("Yaayz post not found."),{status:404});
  if(post.authorId===userId) return {qualified:false,reward:0,reason:"self_view"};
  const ms=Math.floor(Number(watchMs)||0);
  const {key:windowKey,sub}=rewardWindow(db,userId);
  const qualified=ms>=QUALIFIED_VIEW_MS;
  const existing=db.prepare("SELECT * FROM yaayz_social_views WHERE postId=? AND userId=? AND windowKey=?").get(postId,userId,windowKey);
  if(existing) return {qualified:Boolean(existing.qualified),reward:0,reason:"already_qualified_in_window",windowKey};
  let reward=0;
  db.transaction(()=>{
    db.prepare("INSERT INTO yaayz_social_views(id,postId,userId,windowKey,qualified,watchMs,createdAt) VALUES(?,?,?,?,?,?,?)").run(id("view"),postId,userId,windowKey,qualified?1:0,ms,now());
    if(qualified && sub) {
      const gate=assertAamiEarningUnlocked(db,userId);
      if(!gate.unlocked) return;
      const rule=ppvPool(sub.planId);
      const used=Number(db.prepare("SELECT COALESCE(SUM(amount),0) total FROM aami_reward_events WHERE userId=? AND source='yaayz_qualified_view' AND windowKey=?").get(userId,windowKey)?.total||0);
      const remaining=Math.max(0,rule.pool-used);
      reward=Math.min(rule.perView,remaining);
      if(reward>0){
        const sourceId=`${postId}:${windowKey}`;
        credit(db,userId,reward,"yaayz_qualified_view",sourceId,`yaayz-view:${sourceId}`,{percent:rule.percent,pool:rule.pool,maxViews:rule.maxViews,qualifiedViewMs:QUALIFIED_VIEW_MS});
        db.prepare("INSERT INTO aami_reward_events(id,userId,source,sourceId,amount,planId,windowKey,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(id("reward"),userId,"yaayz_qualified_view",sourceId,reward,sub.planId,windowKey,now());
      }
    }
  })();
  return {qualified,reward,windowKey,planId:sub?.planId||"free",qualifiedViewMs:QUALIFIED_VIEW_MS};
}

function createPost(db,userId,{caption="",mediaUrl=null}={}) {
  ensureAccount(db,userId);
  const text=String(caption||"").trim().slice(0,1000);
  if(!text && !mediaUrl) throw Object.assign(new Error("A Yaayz post needs text or media."),{status:400});
  const at=now(), postId=id("yp");
  db.prepare("INSERT INTO yaayz_social_posts(id,authorId,caption,mediaUrl,status,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?)").run(postId,userId,text,mediaUrl?String(mediaUrl).slice(0,1000):null,"published",at,at);
  try { awardActivity(db,userId,'yaayz_post',postId,{media:!!mediaUrl}); } catch (_) {}
  return post(db,postId,userId);
}
function post(db,postId,userId=null){
  const row=db.prepare(`SELECT p.*,u.name AS authorName,(SELECT COUNT(*) FROM yaayz_social_likes l WHERE l.postId=p.id) AS likeCount${userId?", EXISTS(SELECT 1 FROM yaayz_social_likes me WHERE me.postId=p.id AND me.userId=?) AS liked":""} FROM yaayz_social_posts p JOIN users u ON u.id=p.authorId WHERE p.id=? AND p.status='published'`).get(...(userId?[userId,postId]:[postId]));
  if(!row)return null;
  return {...row,likeCount:Number(row.likeCount||0),liked:Boolean(row.liked),mediaUrl:row.mediaUrl||null};
}
function feed(db,userId,{limit=12}={}){
  ensureAccount(db,userId);
  const n=Math.min(Math.max(Number(limit)||12,1),30);
  const rows=db.prepare(`SELECT p.*,u.name AS authorName,(SELECT COUNT(*) FROM yaayz_social_likes l WHERE l.postId=p.id) AS likeCount,EXISTS(SELECT 1 FROM yaayz_social_likes me WHERE me.postId=p.id AND me.userId=?) AS liked FROM yaayz_social_posts p JOIN users u ON u.id=p.authorId WHERE p.status='published' ORDER BY p.createdAt DESC,p.id DESC LIMIT ?`).all(userId,n);
  return rows.map(r=>({...r,likeCount:Number(r.likeCount||0),liked:Boolean(r.liked),mediaUrl:r.mediaUrl||null}));
}
function history(db,userId,limit=50){
  ensureAccount(db,userId);
  const n=Math.min(Math.max(Number(limit)||50,1),100);
  return db.prepare("SELECT id,direction,amount,source,reference,metadata,createdAt FROM aami_ledger WHERE userId=? ORDER BY createdAt DESC,id DESC LIMIT ?").all(userId,n).map(r=>({...r,metadata:JSON.parse(r.metadata||"{}") }));
}
function centre(db,userId){
  ensureAccount(db,userId);
  const subscription=subscriptions.publicSubscription(db,userId);
  const stored=subscription.subscription;
  const activeSubscription=stored && stored.status === "active" ? stored : null;
  const planId=activeSubscription?.planId||"free";
  const ppv=ppvPool(planId);
  const {key}=rewardWindow(db,userId);
  const used=Number(db.prepare("SELECT COALESCE(SUM(amount),0) total FROM aami_reward_events WHERE userId=? AND source='yaayz_qualified_view' AND windowKey=?").get(userId,key)?.total||0);
  return {coin:{name:COIN_NAME,balance:balance(db,userId),cashValue:false},subscription:subscription.subscription,ppv:{planId,percent:ppv.percent,pool:ppv.pool,maxViews:ppv.maxViews,perQualifiedView:ppv.perView,allocated:used,remaining:Math.max(0,ppv.pool-used),windowKey:key,windowEndsAt:activeSubscription?.currentPeriodEnd||null},earn:{likeReward:LIKE_REWARD,likeDailyCap:LIKE_DAILY_CAP,qualifiedViewMs:QUALIFIED_VIEW_MS,eligibility:aamiEarningEligibility(db,userId)},vendorScope:subscription.vendorSubscription};
}
function awardChaseLikeMilestone(db, profileOwnerId, cumulativeUniqueLikes) {
  const total = Math.max(0, Math.floor(Number(cumulativeUniqueLikes) || 0));
  const gate = assertAamiEarningUnlocked(db, profileOwnerId);
  if (!gate.unlocked) return { credited:false, amount:0, milestones:0, balance:balance(db,profileOwnerId), locked:true, eligibility:gate };
  const milestones = Math.floor(total / 150);
  if (!milestones) return { credited:false, amount:0, milestones:0, balance:balance(db,profileOwnerId) };
  ensureAccount(db, profileOwnerId);
  let last = 0;
  const row = db.prepare("SELECT MAX(CAST(sourceId AS INTEGER)) AS threshold FROM aami_reward_events WHERE userId=? AND source='chase_profile_like_milestone'").get(profileOwnerId);
  last = Number(row?.threshold || 0);
  let credited = null;
  const work = () => {
    for (let n = last + 1; n <= milestones; n++) {
      const threshold = n * 150;
      const result = credit(db, profileOwnerId, 5, 'chase_profile_like_milestone', String(threshold), `chase-like-milestone:${profileOwnerId}:${threshold}`, { threshold, cumulativeUniqueLikes: total });
      if (!result.duplicate) credited = { ...result, credited:true, amount:5, threshold, milestones };
    }
    return credited || { duplicate:true, credited:false, amount:0, milestones, balance:balance(db,profileOwnerId) };
  };
  return work();
}

function redeemSubscription(db,userId,planId){
  ensureAccount(db,userId);
  const plan=subscriptions.PLANS[String(planId||"").toLowerCase()];
  if(!plan || plan.id==='free') throw new Error("Choose a paid NEXA subscription plan.");
  const current=subscriptions.currentSubscription(db,userId);
  if(current && current.status!=='cancelled') throw new Error("A NEXA subscription is already active. Change the plan instead.");
  const cost=ngnToAami(Number(plan.monthlyFeeMinor)/100);
  if(balance(db,userId)<cost) throw Object.assign(new Error(`You need ${cost} Aami to redeem ${plan.name} for one month.`),{status:409,code:"AAMI_INSUFFICIENT"});
  const start=new Date(), end=new Date(start); end.setUTCMonth(end.getUTCMonth()+1);
  const sub={id:id('sub'),userId,planId:plan.id,status:'active',autoPay:0,currentPeriodStart:start.toISOString(),currentPeriodEnd:end.toISOString(),nextBillingAt:end.toISOString(),monthlyCapMinor:plan.monthlyCapMinor,createdAt:start.toISOString(),updatedAt:start.toISOString()};
  db.transaction(()=>{
    db.prepare("INSERT INTO nexa_subscriptions(id,userId,planId,status,autoPay,currentPeriodStart,currentPeriodEnd,nextBillingAt,monthlyCapMinor,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)").run(sub.id,sub.userId,sub.planId,sub.status,0,sub.currentPeriodStart,sub.currentPeriodEnd,sub.nextBillingAt,sub.monthlyCapMinor,sub.createdAt,sub.updatedAt);
    db.prepare("INSERT INTO nexa_subscription_preferences(userId,autoPay,monthlyCapMinor,updatedAt) VALUES(?,?,?,?) ON CONFLICT(userId) DO UPDATE SET autoPay=excluded.autoPay,monthlyCapMinor=excluded.monthlyCapMinor,updatedAt=excluded.updatedAt").run(userId,0,plan.monthlyCapMinor,sub.updatedAt);
    debit(db,userId,cost,"subscription_redemption",sub.id,`subscription-aami:${sub.id}`,{planId:plan.id,periodEnd:sub.currentPeriodEnd});
  })();
  return subscriptions.publicSubscription(db,userId);
}
function register({app,auth,db,rateLimit}){
  migrateKitchenCashback(db);

  ensureSchema(db);
  const limited=rateLimit?rateLimit({windowMs:60_000,max:60,keyFn:req=>req.user?.id||req.ip,message:"Too many Aami actions. Please try again shortly."}):(req,res,next)=>next();
  app.get('/api/aami/earn',auth.authMiddleware,limited,(req,res)=>{
    try { ensureAccount(db,req.user.id); res.json({coin:COIN_NAME,rules:ACTIVITY_RULES,eligibility:aamiEarningEligibility(db,req.user.id),history:db.prepare("SELECT source,SUM(amount) amount,COUNT(*) events,MAX(createdAt) lastEarnedAt FROM aami_reward_events WHERE userId=? GROUP BY source ORDER BY lastEarnedAt DESC").all(req.user.id)}); }
    catch(e){res.status(e.status||400).json({error:e.message||'Aami earning centre unavailable.'});}
  });
  app.post('/api/aami/earn/claim',auth.authMiddleware,limited,(req,res)=>{
    try {
      const source=String(req.body?.source||'').trim(); const sourceId=String(req.body?.sourceId||'').trim();
      const claimId=String(req.body?.claimId||sourceId||'').trim();
      if(!claimId) return res.status(400).json({error:'A verified Aami claim is required.'});
      const result=redeemClaim(db,req.user.id,claimId);
      res.status(result.capped?409:201).json(result);
    } catch(e){res.status(e.status||400).json({error:e.message||'Could not award Aami.'});}
  });
  app.post('/api/aami/streak/check-in',auth.authMiddleware,limited,(req,res)=>{
    try {
      ensureAccount(db,req.user.id);
      const today=new Date().toISOString().slice(0,10);
      const result=db.inTransaction ? streakCheckIn(db,req.user.id,today) : db.transaction(()=>streakCheckIn(db,req.user.id,today))();
      res.status(result.capped?409:201).json(result);
    } catch(e){res.status(e.status||400).json({error:e.message||"Could not record today's Aami streak."});}
  });
  app.get('/api/aami/centre',auth.authMiddleware,limited,(req,res)=>{try{res.json(centre(db,req.user.id));}catch(e){res.status(e.status||400).json({error:e.message||'Aami centre unavailable.'});}});
  app.get('/api/aami/eligibility',auth.authMiddleware,limited,(req,res)=>{try{ensureAccount(db,req.user.id);res.json(aamiEarningEligibility(db,req.user.id));}catch(e){res.status(e.status||400).json({error:e.message||'Aami eligibility unavailable.'});}});
  app.get('/api/subscription/centre',auth.authMiddleware,limited,(req,res)=>{try{res.json(centre(db,req.user.id));}catch(e){res.status(e.status||400).json({error:e.message||"Subscription Centre unavailable."});}});
  app.get('/api/aami',auth.authMiddleware,limited,(req,res)=>{try{res.json(centre(db,req.user.id));}catch(e){res.status(e.status||400).json({error:e.message||"Aami unavailable."});}});
  app.get('/api/aami/history',auth.authMiddleware,limited,(req,res)=>{try{res.json({transactions:history(db,req.user.id,req.query?.limit)});}catch(e){res.status(e.status||400).json({error:e.message||"Aami history unavailable."});}});
  app.post('/api/aami/redeem-subscription',auth.authMiddleware,limited,(req,res)=>{try{res.json({subscription:redeemSubscription(db,req.user.id,req.body?.planId)});}catch(e){res.status(e.status||400).json({error:e.message||"Subscription redemption unavailable."});}});
  app.get('/api/yaayz/social/posts',auth.authMiddleware,limited,(req,res)=>{try{res.json({posts:feed(db,req.user.id,{limit:req.query?.limit})});}catch(e){res.status(e.status||400).json({error:e.message||"Yaayz social feed unavailable."});}});
  app.post('/api/yaayz/social/posts',auth.authMiddleware,limited,(req,res)=>{try{res.status(201).json({post:createPost(db,req.user.id,{caption:req.body?.caption,mediaUrl:req.body?.mediaUrl})});}catch(e){res.status(e.status||400).json({error:e.message||"Yaayz post could not be created."});}});
  app.post('/api/yaayz/social/posts/:postId/report',auth.authMiddleware,limited,(req,res)=>{try{const post=db.prepare("SELECT id,authorId,status FROM yaayz_social_posts WHERE id=? AND status='published'").get(req.params.postId);if(!post)return res.status(404).json({error:'Yaayz post not found.'});if(post.authorId===req.user.id)return res.status(400).json({error:'You cannot report your own Yaayz post.'});const ts=require('./trustSafety');const reason=String(req.body?.reason||'other').trim().toLowerCase();if(!['spam','nudity','harassment','other'].includes(reason))return res.status(400).json({error:'Choose a report reason.'});res.status(201).json({report:ts.report(db,{reporterId:req.user.id,targetType:'yaayz_post',targetId:post.id,targetUserId:post.authorId,reason})});}catch(e){res.status(e.status||400).json({error:e.message||'Could not report that Yaayz post.'});}});
  app.get('/api/yaayz/social/posts/:postId/comments',auth.authMiddleware,limited,(req,res)=>{try{res.json({comments:comments(db,req.user.id,req.params.postId)});}catch(e){res.status(e.status||400).json({error:e.message||'Comments unavailable.'});}});
  app.post('/api/yaayz/social/posts/:postId/comments',auth.authMiddleware,limited,(req,res)=>{try{res.status(201).json(comment(db,req.user.id,req.params.postId,req.body?.comment));}catch(e){res.status(e.status||400).json({error:e.message||'Comment could not be saved.'});}});
  app.post('/api/yaayz/social/posts/:postId/share',auth.authMiddleware,limited,(req,res)=>{try{res.json(share(db,req.user.id,req.params.postId));}catch(e){res.status(e.status||400).json({error:e.message||'Share could not be recorded.'});}});
  app.post('/api/yaayz/social/posts/:postId/like',auth.authMiddleware,limited,(req,res)=>{try{res.json(like(db,req.user.id,req.params.postId));}catch(e){res.status(e.status||400).json({error:e.message||"Yaayz like could not be saved."});}});
  app.delete('/api/yaayz/social/posts/:postId/like',auth.authMiddleware,limited,(req,res)=>{try{res.json(unlike(db,req.user.id,req.params.postId));}catch(e){res.status(e.status||400).json({error:e.message||"Yaayz like could not be removed."});}});
  app.post('/api/yaayz/social/posts/:postId/view',auth.authMiddleware,limited,(req,res)=>{try{res.json(recordView(db,req.user.id,req.params.postId,req.body?.watchMs));}catch(e){res.status(e.status||400).json({error:e.message||"Yaayz view could not be recorded."});}});
}
module.exports={VERSION,PPV,QUALIFIED_VIEW_MS,LIKE_REWARD,LIKE_DAILY_CAP,AAMI_FRIEND_UNLOCK_COUNT,AAMI_FRIEND_UNLOCK_PLANS,ACTIVITY_RULES,NGN_PER_AAMI,AAMI_PAYMENT_UNIT,ensureSchema,ensureAccount,balance,credit,debit,ngnToAami,aamiToNgn,financialPolicy,friendCount,aamiEarningEligibility,assertAamiEarningUnlocked,maybeNotifyAamiUnlock,awardChaseLikeMilestone,ppvPool,like,unlike,recordView,createPost,post,feed,history,centre,redeemSubscription,awardActivity,migrateKitchenCashback,createClaim,redeemClaim,comment,comments,share,register};
