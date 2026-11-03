"use strict";

const paymentAttention = require("./paymentAttention");
const subscriptions = require("./subscriptions");

function register({ app, auth, db, admin }) {
  const tableExists = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  const fail = (res, status, error) => res.status(status).json({ error });
  const page = (req) => ({ limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100), offset: Math.max(parseInt(req.query.offset, 10) || 0, 0) });

  db.exec(`
    CREATE TABLE IF NOT EXISTS admin_payment_reviews (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL UNIQUE,
      actorId TEXT NOT NULL,
      decision TEXT NOT NULL CHECK (decision IN ('confirmed','rejected','reviewed')),
      note TEXT,
      createdAt TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_admin_payment_reviews_reference ON admin_payment_reviews(reference);
  `);

  app.get("/api/admin/approvals", auth.authMiddleware, admin.require("approvals"), (req, res) => {
    const { limit, offset } = page(req);
    subscriptions.ensureSchema(db);
    const subscriptionRequests = tableExists("nexa_subscription_requests") ? db.prepare(`
      SELECT r.*, u.name AS userName, u.email AS userEmail
      FROM nexa_subscription_requests r JOIN users u ON u.id=r.userId
      WHERE r.status='pending' ORDER BY r.createdAt ASC LIMIT ? OFFSET ?`).all(limit, offset).map((r) => ({
      id:r.id, type:"subscription", userId:r.userId, userName:r.userName, userEmail:r.userEmail,
      planId:r.planId, autoPay:Boolean(r.autoPay), createdAt:r.createdAt, status:r.status
    })) : [];
    const verification = tableExists("verification_requests") ? db.prepare(`SELECT id, userId, kind, createdAt FROM verification_requests WHERE status='pending' ORDER BY createdAt ASC LIMIT ? OFFSET ?`).all(limit, offset).map((r) => ({...r,type:"verification"})) : [];
    const adverts = tableExists("yaayz_ads") ? db.prepare(`SELECT id, vendorId, title, createdAt FROM yaayz_ads WHERE status='pending' ORDER BY createdAt ASC LIMIT ? OFFSET ?`).all(limit, offset).map((r) => ({...r,type:"yaayz_advert"})) : [];
    const gyms = tableExists("fitness_gyms") ? db.prepare(`SELECT id, name, createdAt FROM fitness_gyms WHERE status='pending' ORDER BY createdAt ASC LIMIT ? OFFSET ?`).all(limit, offset).map((r) => ({...r,type:"fitness_gym"})) : [];
    const kitchen = tableExists("hub_shops") ? db.prepare(`SELECT id, name, createdAt FROM hub_shops WHERE status='pending' ORDER BY createdAt ASC LIMIT ? OFFSET ?`).all(limit, offset).map((r) => ({...r,type:"kitchen_shop"})) : [];
    const attention = tableExists("mall_payment_events") ? paymentAttention.attentionReport(db, { limit:100, offset:0 }).items : [];
    const reviewed = new Set(db.prepare("SELECT reference FROM admin_payment_reviews").all().map((r) => r.reference));
    const payments = attention.filter((r) => !reviewed.has(r.reference)).slice(offset, offset + limit).map((r) => ({...r,type:"payment"}));
    const all = [...subscriptionRequests, ...verification, ...adverts, ...gyms, ...kitchen, ...payments].sort((a,b) => String(a.createdAt || a.receivedAt).localeCompare(String(b.createdAt || b.receivedAt)));
    res.json({ generatedAt:new Date().toISOString(), counts:{ subscriptions:subscriptionRequests.length, verification:verification.length, yaayzAdverts:adverts.length, fitnessGyms:gyms.length, kitchenShops:kitchen.length, payments:payments.length }, approvals:all.slice(0, limit), paymentPolicy:"Provider verification remains authoritative; payment decisions here record administrator review and never fabricate provider settlement." });
  });

  app.get("/api/admin/subscriptions/requests", auth.authMiddleware, admin.require("approvals"), (req,res) => {
    subscriptions.ensureSchema(db);
    const { limit, offset } = page(req);
    const rows = db.prepare(`SELECT r.*,u.name AS userName,u.email AS userEmail FROM nexa_subscription_requests r JOIN users u ON u.id=r.userId ORDER BY r.createdAt DESC LIMIT ? OFFSET ?`).all(limit,offset);
    res.json({requests:rows.map(r=>({...r,autoPay:Boolean(r.autoPay)}))});
  });

  app.post("/api/admin/subscriptions/requests/:id/decision", auth.authMiddleware, admin.require("approvals"), (req,res) => {
    const decision=String(req.body?.decision||"").toLowerCase();
    const reason=String(req.body?.reason||"").trim().slice(0,300);
    if (!["approve","reject"].includes(decision)) return fail(res,400,"Choose approve or reject.");
    const row=db.prepare("SELECT * FROM nexa_subscription_requests WHERE id=?").get(req.params.id);
    if(!row) return fail(res,404,"Subscription request not found.");
    if(row.status!=="pending") return fail(res,409,"This subscription request has already been decided.");
    if(decision==="reject" && reason.length<3) return fail(res,400,"Give a short reason for the rejection.");
    try {
      let result=null;
      if(decision==="approve") {
        if(row.kind==="new") result=subscriptions.createSubscription(db,row.userId,row.planId,{autoPay:Boolean(row.autoPay)});
        else result=subscriptions.schedulePlanChange(db,row.userId,row.planId);
      }
      const now=new Date().toISOString();
      const changed=db.prepare("UPDATE nexa_subscription_requests SET status=?,decisionReason=?,decidedBy=?,decidedAt=?,updatedAt=? WHERE id=? AND status='pending'").run(decision==="approve"?"approved":"rejected",reason||null,req.user.id,now,now,row.id);
      if(!changed.changes) return fail(res,409,"This subscription request has already been decided.");
      admin.audit(req,`subscription_request_${decision}`,"subscription_request",row.id,reason||row.planId);
      res.json({ok:true,status:decision==="approve"?"approved":"rejected",subscription:result?subscriptions.publicSubscription(db,row.userId):null});
    } catch(e) {
      return fail(res,e.status===503?503:409,e.message||"Subscription request could not be decided.");
    }
  });

  app.get("/api/admin/payments/review", auth.authMiddleware, admin.require("approvals"), (req,res) => {
    const report=tableExists("mall_payment_events") ? paymentAttention.attentionReport(db,{limit:100,offset:0}) : {items:[],counts:{}};
    const rows=db.prepare("SELECT reference,decision,note,actorId,createdAt FROM admin_payment_reviews ORDER BY createdAt DESC").all();
    const byRef=new Map(rows.map(r=>[r.reference,r]));
    res.json({payments:report.items.map(p=>({...p,adminReview:byRef.get(p.reference)||null})),counts:report.counts});
  });

  app.post("/api/admin/payments/:reference/review", auth.authMiddleware, admin.require("approvals"), (req,res) => {
    const reference=String(req.params.reference||"").trim();
    const decision=String(req.body?.decision||"").toLowerCase();
    const note=String(req.body?.note||"").trim().slice(0,500);
    if(!reference) return fail(res,400,"Payment reference is required.");
    if(!["confirmed","rejected","reviewed"].includes(decision)) return fail(res,400,"Choose confirmed, rejected or reviewed.");
    const exists=db.prepare("SELECT 1 FROM mall_payment_events WHERE reference=? LIMIT 1").get(reference);
    if(!exists) return fail(res,404,"Payment event not found.");
    const now=new Date().toISOString();
    db.prepare("INSERT INTO admin_payment_reviews(id,reference,actorId,decision,note,createdAt) VALUES(?,?,?,?,?,?) ON CONFLICT(reference) DO UPDATE SET actorId=excluded.actorId,decision=excluded.decision,note=excluded.note,createdAt=excluded.createdAt")
      .run(`apr_${Date.now()}_${Math.random().toString(16).slice(2)}`,reference,req.user.id,decision,note||null,now);
    admin.audit(req,"payment_reviewed","payment",reference,`${decision}${note?`: ${note}`:""}`);
    res.json({ok:true,reference,decision,providerSettlementUnchanged:true});
  });
}

module.exports={register};
