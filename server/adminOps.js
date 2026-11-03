"use strict";
const yaayzAdvertisers = require("./yaayzAdvertisers");
const accountLifecycle = require("./accountLifecycle");
const vendorSubscriptions = require("./vendorSubscriptions");
// Admin operations (B320): the routes a separate admin app will call.
// Every route checks the signed-in user's admin role, and every change is written to the audit log.
function register(app, { db, auth, admin, notify }) {
  const trustSafety = require("./trustSafety");
  const closure = require("./accountLifecycle");
  trustSafety.ensureSchema(db);
  db.exec(`
CREATE TABLE IF NOT EXISTS account_suspensions (
  userId TEXT PRIMARY KEY,
  reason TEXT NOT NULL,
  suspendedBy TEXT NOT NULL,
  createdAt TEXT NOT NULL
);
`);
  const fail = (res, status, error) => res.status(status).json({ error });
  const page = (req) => ({ limit: Math.min(Math.max(parseInt(req.query.limit, 10) || 25, 1), 100), offset: Math.max(parseInt(req.query.offset, 10) || 0, 0) });
  const tableExists = (name) => !!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(name);
  const count = (sql, ...args) => db.prepare(sql).get(...args).n;

  app.get("/api/admin/me", auth.authMiddleware, (req, res) => {
    const scoped = req.adminAamiAccess?.productId === "admin-aami" && req.adminAamiAccess?.companyId === "nexa";
    const role = scoped ? req.adminAamiAccess.role : admin.roleOf(req.user);
    const permissions = scoped ? admin.ADMIN_AAMI_PERMISSIONS?.[role] : admin.PERMISSIONS[role];
    if (!role || !permissions) return fail(res, 403, "Administrator access required.");
    res.json({ id: req.user.id, name: req.user.name || req.user.username || null, role, permissions: [...permissions].sort(), ...(scoped ? { productId: "admin-aami", companyScope: "nexa" } : {}) });
  });

  app.get("/api/admin/summary", auth.authMiddleware, admin.require("summary"), (req, res) => {
    res.json({
      users: count("SELECT COUNT(*) AS n FROM users WHERE accountStatus = 'active'"),
      suspended: count("SELECT COUNT(*) AS n FROM users WHERE accountStatus = 'suspended'"),
      vendors: tableExists("vendors") ? count("SELECT COUNT(*) AS n FROM vendors") : 0,
      pendingVerifications: tableExists("verification_requests") ? count("SELECT COUNT(*) AS n FROM verification_requests WHERE status = 'pending'") : 0,
      reportedLifestyleComments: tableExists("lifestyle_comment_reports") ? count("SELECT COUNT(DISTINCT r.commentId) AS n FROM lifestyle_comment_reports r JOIN lifestyle_comments c ON c.id = r.commentId WHERE r.status = 'open'") : 0,
      reportedLifestylePosts: tableExists("lifestyle_reports") ? count("SELECT COUNT(DISTINCT r.postId) AS n FROM lifestyle_reports r JOIN lifestyle_posts p ON p.id = r.postId WHERE r.status = 'open'") : 0,
      pendingSubscriptions: tableExists("nexa_subscription_requests") ? count("SELECT COUNT(*) AS n FROM nexa_subscription_requests WHERE status='pending'") : 0,
      pendingYaayzAdverts: tableExists("yaayz_ads") ? count("SELECT COUNT(*) AS n FROM yaayz_ads WHERE status='pending'") : 0,
      pendingFitnessGyms: tableExists("fitness_gyms") ? count("SELECT COUNT(*) AS n FROM fitness_gyms WHERE status='pending'") : 0,
      pendingKitchenShops: tableExists("hub_shops") ? count("SELECT COUNT(*) AS n FROM hub_shops WHERE status='pending'") : 0,
    });
  });

  app.get("/api/admin/users", auth.authMiddleware, admin.require("users_read"), (req, res) => {
    const { limit, offset } = page(req);
    const q = String(req.query.q || "").trim().slice(0, 80);
    const like = `%${q.replace(/[%_]/g, "")}%`;
    const rows = db.prepare(
      `SELECT u.id, u.name, u.email, u.createdAt, u.accountStatus, s.reason AS suspendedReason,
              (SELECT 1 FROM vendors v WHERE v.userId = u.id) AS isVendor
       FROM users u LEFT JOIN account_suspensions s ON s.userId = u.id
       WHERE (? = '' OR u.name LIKE ? OR u.email LIKE ?) AND u.accountStatus != 'closed'
       ORDER BY u.createdAt DESC LIMIT ? OFFSET ?`
    ).all(q, like, like, limit, offset);
    const ver = tableExists("user_verifications") ? db.prepare("SELECT kind FROM user_verifications WHERE userId = ?") : null;
    res.json({ users: rows.map((u) => {
      const verified = { user: false, vendor: false };
      if (ver) for (const v of ver.all(u.id)) if (v.kind in verified) verified[v.kind] = true;
      return { id: u.id, name: u.name, email: u.email, createdAt: u.createdAt, status: u.accountStatus, suspendedReason: u.suspendedReason || null, isVendor: !!u.isVendor, verified, adminRole: admin.roleOf({ id: u.id, email: u.email }) };
    }) });
  });

  app.get("/api/admin/moderation/reports", auth.authMiddleware, admin.require("violations"), (req,res) => {
    const targetType=String(req.query.kind||"all");
    const allowed=new Set(["all","yaayz_post","chase_account"]);
    if(!allowed.has(targetType)) return fail(res,400,"Choose a valid moderation queue.");
    const rows=trustSafety.openReports(db,{targetType,limit:req.query.limit,offset:req.query.offset});
    res.json({reports:rows,generatedAt:new Date().toISOString()});
  });

  app.post("/api/admin/moderation/reports/:id/action", auth.authMiddleware, admin.require("violations"), (req,res) => {
    const report=db.prepare("SELECT * FROM moderation_content_reports WHERE id=? AND status='open'").get(req.params.id);
    if(!report) return fail(res,404,"Open moderation report not found.");
    const action=String(req.body?.action||"").trim();
    const reason=String(req.body?.reason||"").trim().slice(0,500);
    if(reason.length<3) return fail(res,400,"Give a short moderation decision note.");
    if(!["dismiss","remove","account"].includes(action)) return fail(res,400,"Choose dismiss, remove or account.");
    const at=new Date().toISOString();
    if(action==="dismiss"){db.prepare("UPDATE moderation_content_reports SET status='dismissed',reviewedAt=?,reviewerId=? WHERE id=? AND status='open'").run(at,req.user.id,report.id);admin.audit(req,"moderation_report_dismissed","moderation_content_report",report.id,reason);return res.json({ok:true,status:"dismissed"});}
    if(report.targetType==="yaayz_post" && action==="remove"){const post=db.prepare("SELECT id,authorId FROM yaayz_social_posts WHERE id=?").get(report.targetId);if(!post)return fail(res,404,"Yaayz post is already gone.");db.prepare("UPDATE yaayz_social_posts SET status='removed',updatedAt=? WHERE id=? AND status='published'").run(at,post.id);db.prepare("UPDATE moderation_content_reports SET status='actioned',reviewedAt=?,reviewerId=? WHERE id=?").run(at,req.user.id,report.id);const feedback=trustSafety.addFeedback(db,{userId:post.authorId,reportId:report.id,targetType:report.targetType,targetId:post.id,reason,notify,closeAccount:(uid)=>closure.closeAccount(db,uid,new Date().toISOString(),vendorSubscriptions)});admin.audit(req,"yaayz_post_removed","yaayz_social_post",post.id,reason);return res.json({ok:true,status:"actioned",feedback});}
    if(report.targetType==="chase_account" && action==="account"){const target=db.prepare("SELECT id,accountStatus FROM users WHERE id=?").get(report.targetUserId);if(!target)return fail(res,404,"Account not found.");const feedback=trustSafety.addFeedback(db,{userId:target.id,reportId:report.id,targetType:report.targetType,targetId:target.id,reason,notify,closeAccount:(uid)=>closure.closeAccount(db,uid,new Date().toISOString(),vendorSubscriptions)});db.prepare("UPDATE moderation_content_reports SET status='actioned',reviewedAt=?,reviewerId=? WHERE id=?").run(at,req.user.id,report.id);admin.audit(req,"chase_account_removed","user",target.id,reason);return res.json({ok:true,status:"actioned",feedback});}
    return fail(res,400,"That moderation action is not valid for this report type.");
  });

  app.get("/api/admin/violations", auth.authMiddleware, admin.require("violations"), (req, res) => {
    const { limit, offset } = page(req);
    const kind = String(req.query.kind || "all").trim();
    const rows = [];
    if (tableExists("social_reports") && (kind === "all" || kind === "users")) {
      rows.push(...db.prepare(`SELECT r.id, r.targetUserId AS subjectId, u.name AS subjectName, u.email AS subjectEmail, r.reporterId, r.reason, r.details, r.status, r.createdAt, r.reviewedAt, r.reviewerId, 'user' AS targetType, 'user' AS targetClass
        FROM social_reports r LEFT JOIN users u ON u.id=r.targetUserId WHERE r.status IN ('open','under_review') ORDER BY r.createdAt ASC LIMIT ? OFFSET ?`).all(limit, offset));
    }
    if (tableExists("mall_interaction_reports") && (kind === "all" || kind === "vendors")) {
      rows.push(...db.prepare(`SELECT r.id, COALESCE(v.userId, p.vendorId) AS subjectId, COALESCE(u.name, v.shopName) AS subjectName, u.email AS subjectEmail, r.reporterId, r.targetType, r.targetId, r.reason, r.details, r.createdAt, r.status, NULL AS reviewedAt, NULL AS reviewerId, 'vendor' AS targetClass
        FROM mall_interaction_reports r LEFT JOIN vendors v ON (r.targetType='seller' AND v.userId=r.targetId) LEFT JOIN mall_products p ON (r.targetType='listing' AND p.id=r.targetId) LEFT JOIN vendors pv ON pv.id=p.vendorId LEFT JOIN users u ON u.id=COALESCE(v.userId,pv.userId)
        WHERE r.status='open' ORDER BY r.createdAt ASC LIMIT ? OFFSET ?`).all(limit, offset).map(r => ({...r, subjectId:r.subjectId || null, targetType:r.targetType || 'vendor'})));
    }
    rows.sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    res.json({ violations: rows.slice(0, limit), generatedAt: new Date().toISOString() });
  });

  app.post("/api/admin/violations/:id/resolve", auth.authMiddleware, admin.require("violations"), (req, res) => {
    const reason = String(req.body?.reason || "").trim().slice(0, 500);
    if (reason.length < 3) return fail(res, 400, "Give a short examination note.");
    const now = new Date().toISOString();
    if (tableExists("social_reports")) {
      const row = db.prepare("SELECT * FROM social_reports WHERE id=?").get(req.params.id);
      if (row) {
        const status = String(req.body?.status || "dismissed");
        if (!["dismissed","actioned","under_review"].includes(status)) return fail(res, 400, "Choose dismissed, actioned or under_review.");
        const changed = db.prepare("UPDATE social_reports SET status=?,reviewedAt=?,reviewerId=? WHERE id=? AND status IN ('open','under_review')").run(status, now, req.user.id, row.id);
        if (!changed.changes) return fail(res, 409, "This violation was already examined.");
        admin.audit(req, "user_violation_examined", "social_report", row.id, `${status}: ${reason}`);
        return res.json({ ok:true, id:row.id, status });
      }
    }
    if (tableExists("mall_interaction_reports")) {
      const row = db.prepare("SELECT * FROM mall_interaction_reports WHERE id=?").get(req.params.id);
      if (row) {
        const status = String(req.body?.status || "reviewed");
        if (!["reviewed","dismissed"].includes(status)) return fail(res, 400, "Choose reviewed or dismissed.");
        const changed = db.prepare("UPDATE mall_interaction_reports SET status=? WHERE id=? AND status='open'").run(status, row.id);
        if (!changed.changes) return fail(res, 409, "This violation was already examined.");
        admin.audit(req, "vendor_violation_examined", "mall_interaction_report", row.id, `${status}: ${reason}`);
        return res.json({ ok:true, id:row.id, status });
      }
    }
    return fail(res, 404, "Violation not found.");
  });

  app.delete("/api/admin/users/:id", auth.authMiddleware, admin.require("users_remove"), (req, res) => {
    const reason = String((req.body || {}).reason || "").trim().slice(0, 300);
    if (reason.length < 3) return fail(res,400,"Give a short reason for removing the account.");
    const target = db.prepare("SELECT id,email,name,accountStatus FROM users WHERE id=?").get(req.params.id);
    if (!target) return fail(res,404,"User not found.");
    if (target.id === req.user.id) return fail(res,400,"You can't remove yourself.");
    if (admin.roleOf(target)) return fail(res,403,"Remove their admin access before removing the account.");
    if (target.accountStatus === "closed") return fail(res,409,"This account is already removed.");
    try {
      const result = accountLifecycle.closeAccount(db, target.id, new Date().toISOString(), vendorSubscriptions);
      admin.audit(req,"user_removed_from_platform","user",target.id,`Administrator-initiated account closure: ${reason}. Financial records retained where required.`);
      res.json({ok:true,removed:true,...result});
    } catch (e) {
      return fail(res,e.status===409?409:500,e.message||"The account could not be removed.");
    }
  });

  app.delete("/api/admin/vendors/:id", auth.authMiddleware, admin.require("vendors_remove"), (req, res) => {
    const reason = String((req.body || {}).reason || "").trim().slice(0, 300);
    if (reason.length < 3) return fail(res,400,"Give a short reason for removing the vendor.");
    const vendor = db.prepare("SELECT v.*,u.id AS ownerId,u.email,u.name,u.accountStatus FROM vendors v JOIN users u ON u.id=v.userId WHERE v.id=?").get(req.params.id);
    if (!vendor) return fail(res,404,"Vendor not found.");
    if (vendor.ownerId === req.user.id) return fail(res,400,"You can't remove your own vendor account.");
    if (admin.roleOf({id:vendor.ownerId,email:vendor.email})) return fail(res,403,"Remove the owner's admin access before removing the vendor.");
    try {
      const result = vendorSubscriptions.closeVendorForAccount(db, vendor.ownerId, new Date());
      admin.audit(req,"vendor_removed_from_platform","vendor",vendor.id,`Vendor removed from the platform: ${reason}. Owner account retained unless separately removed.`);
      res.json({ok:true,removed:true,vendorId:vendor.id,...result});
    } catch (e) { return fail(res,e.status===409?409:500,e.message||"The vendor could not be removed."); }
  });

  app.get("/api/admin/vendors", auth.authMiddleware, admin.require("vendors_read"), (req, res) => {
    const { limit, offset } = page(req);
    const rows = db.prepare(
      `SELECT v.id, v.userId, v.shopName, v.createdAt, v.moderationStatus, v.moderationReason, u.name AS ownerName, u.email AS ownerEmail, u.accountStatus
       FROM vendors v JOIN users u ON u.id = v.userId ORDER BY v.createdAt DESC LIMIT ? OFFSET ?`
    ).all(limit, offset);
    const ver = tableExists("user_verifications") ? db.prepare("SELECT 1 FROM user_verifications WHERE userId = ? AND kind = 'vendor'") : null;
    res.json({ vendors: rows.map((v) => ({ id: v.id, shopName: v.shopName, createdAt: v.createdAt, moderationStatus: String(v.moderationStatus || "active").toLowerCase(), moderationReason: v.moderationReason || null, owner: { id: v.userId, name: v.ownerName, email: v.ownerEmail, status: v.accountStatus }, verified: !!(ver && ver.get(v.userId)) })) });
  });

  app.post("/api/admin/users/:id/suspend", auth.authMiddleware, admin.require("users_suspend"), (req, res) => {
    const target = db.prepare("SELECT id, email, accountStatus FROM users WHERE id = ?").get(req.params.id);
    if (!target) return fail(res, 404, "User not found.");
    if (target.id === req.user.id) return fail(res, 400, "You can't suspend yourself.");
    if (admin.roleOf(target)) return fail(res, 403, "Remove their admin access before suspending them.");
    if (target.accountStatus !== "active") return fail(res, 409, target.accountStatus === "suspended" ? "This account is already suspended." : "This account can't be suspended.");
    const reason = String((req.body || {}).reason || "").trim().slice(0, 300);
    if (reason.length < 3) return fail(res, 400, "Give a short reason for the suspension.");
    db.transaction(() => {
      db.prepare("UPDATE users SET accountStatus = 'suspended' WHERE id = ?").run(target.id);
      db.prepare("INSERT OR REPLACE INTO account_suspensions(userId,reason,suspendedBy,createdAt) VALUES(?,?,?,?)").run(target.id, reason, req.user.id, new Date().toISOString());
    })();
    admin.audit(req, "user_suspended", "user", target.id, reason);
    res.json({ ok: true });
  });

  app.post("/api/admin/users/:id/unsuspend", auth.authMiddleware, admin.require("users_suspend"), (req, res) => {
    const target = db.prepare("SELECT id, accountStatus FROM users WHERE id = ?").get(req.params.id);
    if (!target) return fail(res, 404, "User not found.");
    if (target.accountStatus !== "suspended") return fail(res, 409, "This account is not suspended.");
    db.transaction(() => {
      db.prepare("UPDATE users SET accountStatus = 'active' WHERE id = ?").run(target.id);
      db.prepare("DELETE FROM account_suspensions WHERE userId = ?").run(target.id);
    })();
    admin.audit(req, "user_unsuspended", "user", target.id, null);
    res.json({ ok: true });
  });


  // B331 moderation: keep shop moderation separate from subscription state so payment renewal cannot undo an admin suspension.
  const ensureVendorModeration = () => {
    if (!tableExists("vendors")) return;
    const cols = db.prepare("PRAGMA table_info(vendors)").all().map((c) => c.name);
    if (!cols.includes("status")) db.exec("ALTER TABLE vendors ADD COLUMN status TEXT NOT NULL DEFAULT 'active'");
    if (!cols.includes("moderationStatus")) db.exec("ALTER TABLE vendors ADD COLUMN moderationStatus TEXT NOT NULL DEFAULT 'active'");
    if (!cols.includes("moderationReason")) db.exec("ALTER TABLE vendors ADD COLUMN moderationReason TEXT");
    if (!cols.includes("moderationUpdatedAt")) db.exec("ALTER TABLE vendors ADD COLUMN moderationUpdatedAt TEXT");
  };
  ensureVendorModeration();

  app.post("/api/admin/vendors/:id/suspend", auth.authMiddleware, admin.require("vendors_moderate"), (req, res) => {
    const target = db.prepare("SELECT id, userId, shopName, moderationStatus FROM vendors WHERE id=?").get(req.params.id);
    if (!target) return fail(res, 404, "Vendor not found.");
    const reason = String(req.body?.reason || "").trim().slice(0, 300);
    if (reason.length < 3) return fail(res, 400, "Give a short reason for the shop suspension.");
    if (String(target.moderationStatus || "active").toLowerCase() !== "active") return fail(res, 409, "This shop is already suspended.");
    const now = new Date().toISOString();
    db.prepare("UPDATE vendors SET moderationStatus='suspended', moderationReason=?, moderationUpdatedAt=?, status='inactive' WHERE id=?").run(reason, now, target.id);
    admin.audit(req, "vendor_suspended", "vendor", target.id, reason);
    res.json({ ok:true, vendorId:target.id, moderationStatus:"suspended", reason });
  });

  app.post("/api/admin/vendors/:id/unsuspend", auth.authMiddleware, admin.require("vendors_moderate"), (req, res) => {
    const target = db.prepare("SELECT id, status, moderationStatus FROM vendors WHERE id=?").get(req.params.id);
    if (!target) return fail(res, 404, "Vendor not found.");
    if (String(target.moderationStatus || "active").toLowerCase() !== "suspended") return fail(res, 409, "This shop is not suspended.");
    const activePeriod = tableExists("vendor_subscription_periods") && db.prepare("SELECT 1 FROM vendor_subscription_periods WHERE vendorId=? AND status='ACTIVE' AND endAt>? LIMIT 1").get(target.id, new Date().toISOString());
    const nextStatus = activePeriod ? "active" : "inactive";
    const now = new Date().toISOString();
    db.prepare("UPDATE vendors SET moderationStatus='active', moderationReason=NULL, moderationUpdatedAt=?, status=? WHERE id=?").run(now, nextStatus, target.id);
    admin.audit(req, "vendor_unsuspended", "vendor", target.id, null);
    res.json({ ok:true, vendorId:target.id, moderationStatus:"active", status:nextStatus });
  });

  const moderateProduct = (req, res, active, action) => {
    const row = db.prepare("SELECT p.id, p.name, p.active, p.vendorId, v.shopName FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE p.id=?").get(req.params.id);
    if (!row) return fail(res, 404, "Product not found.");
    if (Number(row.active) === active) return fail(res, 409, active ? "This product is already active." : "This product is already taken down.");
    const reason = active ? null : String(req.body?.reason || "").trim().slice(0, 300);
    if (!active && reason.length < 3) return fail(res, 400, "Give a short reason for the product takedown.");
    db.prepare("UPDATE mall_products SET active=?, updatedAt=? WHERE id=?").run(active, new Date().toISOString(), row.id);
    admin.audit(req, action, "mall_product", row.id, reason);
    res.json({ ok:true, productId:row.id, active:Boolean(active), reason });
  };
  app.post("/api/admin/mall/products/:id/takedown", auth.authMiddleware, admin.require("vendors_moderate"), (req,res) => moderateProduct(req,res,0,"mall_product_takedown"));
  app.post("/api/admin/mall/products/:id/restore", auth.authMiddleware, admin.require("vendors_moderate"), (req,res) => moderateProduct(req,res,1,"mall_product_restored"));

  const moderateTicket = (req, res, active, action) => {
    const row = db.prepare("SELECT id, title, active, sellerId FROM yaayz_ticket_listings WHERE id=?").get(req.params.id);
    if (!row) return fail(res, 404, "Ticket listing not found.");
    if (Number(row.active) === active) return fail(res, 409, active ? "This ticket listing is already active." : "This ticket listing is already taken down.");
    const reason = active ? null : String(req.body?.reason || "").trim().slice(0, 300);
    if (!active && reason.length < 3) return fail(res, 400, "Give a short reason for the ticket takedown.");
    db.prepare("UPDATE yaayz_ticket_listings SET active=?, updatedAt=? WHERE id=?").run(active, new Date().toISOString(), row.id);
    admin.audit(req, action, "yaayz_ticket", row.id, reason);
    res.json({ ok:true, ticketId:row.id, active:Boolean(active), reason });
  };
  app.post("/api/admin/yaayz/tickets/:id/takedown", auth.authMiddleware, admin.require("vendors_moderate"), (req,res) => moderateTicket(req,res,0,"yaayz_ticket_takedown"));
  app.post("/api/admin/yaayz/tickets/:id/restore", auth.authMiddleware, admin.require("vendors_moderate"), (req,res) => moderateTicket(req,res,1,"yaayz_ticket_restored"));

  app.get("/api/admin/mall/products", auth.authMiddleware, admin.require("vendors_moderate"), (req,res) => {
    const {limit,offset}=page(req);
    const status=String(req.query?.status||"all").toLowerCase();
    const where=status==="active"?"p.active=1":status==="inactive"?"p.active=0":"1=1";
    const rows=db.prepare(`SELECT p.id,p.name,p.price,p.currency,p.active,p.createdAt,p.updatedAt,v.id AS vendorId,v.shopName FROM mall_products p JOIN vendors v ON v.id=p.vendorId WHERE ${where} ORDER BY p.updatedAt DESC,p.id DESC LIMIT ? OFFSET ?`).all(limit,offset);
    res.json({products:rows});
  });

  app.get("/api/admin/yaayz/tickets", auth.authMiddleware, admin.require("vendors_moderate"), (req,res) => {
    const {limit,offset}=page(req);
    const status=String(req.query?.status||"all").toLowerCase();
    const where=status==="active"?"t.active=1":status==="inactive"?"t.active=0":"1=1";
    const rows=db.prepare(`SELECT t.id,t.title,t.type,t.price,t.currency,t.quantity,t.active,t.createdAt,t.updatedAt,t.sellerId,u.name AS sellerName,u.email AS sellerEmail FROM yaayz_ticket_listings t LEFT JOIN users u ON u.id=t.sellerId WHERE ${where} ORDER BY t.updatedAt DESC,t.id DESC LIMIT ? OFFSET ?`).all(limit,offset);
    res.json({tickets:rows});
  });

  // B332 YaayzAdvert moderation: advertiser submissions are vendor-owned and require owner review.
  yaayzAdvertisers.ensureSchema(db);
  app.get("/api/admin/yaayz/adverts", auth.authMiddleware, admin.require("vendors_moderate"), (req,res) => {
    const status=String(req.query?.status||"all").toLowerCase();
    if(!yaayzAdvertisers.STATUSES.has(status) && status!=="all") return fail(res,400,"Invalid advert status.");
    const limitRaw=Number(req.query?.limit||100), offsetRaw=Number(req.query?.offset||0);
    if(!Number.isInteger(limitRaw)||!Number.isInteger(offsetRaw)||limitRaw<1||offsetRaw<0) return fail(res,400,"Invalid advert page.");
    const limit=Math.min(100,limitRaw), offset=offsetRaw;
    res.json({adverts:yaayzAdvertisers.adminList(db,{status,limit,offset})});
  });
  app.post("/api/admin/yaayz/adverts/:id/decision", auth.authMiddleware, admin.require("vendors_moderate"), (req,res) => {
    const decision=String(req.body?.decision||"").trim().toLowerCase();
    const reason=String(req.body?.reason||"").trim();
    if(["rejected","taken_down"].includes(decision) && reason.length<3) return fail(res,400,"Give a short reason for this advert decision.");
    const result=yaayzAdvertisers.decide(db,{id:req.params.id,decision,reason,adminId:req.user.id});
    if(result.error) return fail(res,result.status||400,result.error);
    admin.audit(req,`yaayz_advert_${decision}`,"yaayz_advert",req.params.id,reason||null);
    res.json({ok:true,advert:result.value});
  });

  app.get("/api/admin/admins", auth.authMiddleware, admin.require("admins"), (req, res) => {
    const rows = db.prepare("SELECT a.userId, a.role, a.createdAt, u.name, u.email FROM admin_users a LEFT JOIN users u ON u.id = a.userId ORDER BY a.createdAt").all();
    res.json({ admins: rows.map((r) => ({ userId: r.userId, role: r.role, name: r.name || null, email: r.email || null, createdAt: r.createdAt })) });
  });

  app.post("/api/admin/admins", auth.authMiddleware, admin.require("admins"), async (req, res) => {
    const b = req.body || {};
    const role = String(b.role || "").toLowerCase();
    if (!["reviewer", "support"].includes(role)) return fail(res, 400, "Choose reviewer or support. Owners are set by the bootstrap owner.");
    const email = String(b.email || "").trim().toLowerCase();
    const name = String(b.name || "").trim().slice(0, 80);
    const password = String(b.password || "");
    if (!email) return fail(res, 400, "Admin email is required.");
    if (password.length < 8) return fail(res, 400, "Admin password must be at least 8 characters.");
    const existing = db.prepare("SELECT id, email, accountStatus FROM users WHERE lower(email) = ?").get(email);
    if (existing) return fail(res, 409, "That email already belongs to a NEXA account. Use a new Admin email.");
    const id = admin.newId();
    const passwordHash = auth.hashPasswordSync(password);
    const at = new Date().toISOString();
    db.prepare("INSERT INTO users(id,email,passwordHash,name,createdAt,accountStatus,adultConfirmedAt) VALUES(?,?,?,?,?,?,?)").run(id,email,passwordHash,name||"NEXA Admin",at,"active",at);
    db.prepare("INSERT INTO admin_users(userId,role,addedBy,createdAt) VALUES(?,?,?,?)").run(id, role, req.user.id, at);
    admin.audit(req, "admin_added", "user", id, role);
    res.status(201).json({ ok: true, userId: id, role, email });
  });

  app.delete("/api/admin/admins/:userId", auth.authMiddleware, admin.require("admins"), (req, res) => {
    const row = db.prepare("SELECT userId FROM admin_users WHERE userId = ?").get(req.params.userId);
    if (!row) return fail(res, 404, "That person is not an added admin.");
    db.prepare("DELETE FROM admin_users WHERE userId = ?").run(row.userId);
    admin.audit(req, "admin_removed", "user", row.userId, null);
    res.json({ ok: true });
  });

  app.get("/api/admin/audit", auth.authMiddleware, admin.require("audit"), (req, res) => {
    const { limit, offset } = page(req);
    res.json({ events: db.prepare("SELECT a.id, a.actorId, u.name AS actorName, a.actorRole, a.action, a.targetType, a.targetId, a.detail, a.createdAt FROM admin_audit a LEFT JOIN users u ON u.id = a.actorId ORDER BY a.createdAt DESC, a.id DESC LIMIT ? OFFSET ?").all(limit, offset) });
  });
}

module.exports = { register };
