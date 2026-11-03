"use strict";
const crypto = require("crypto");
const notifications = require("./notifications");
const { nextEscalationTier, normalizeEscalationReason } = require("./customerCareEscalation");

const SUPPORT_CAPABILITY = "support_investigation";
const PRIORITIES = new Set(["low","normal","high","urgent"]);
const OPEN_STATUSES = new Set(["waiting", "assigned", "in_progress"]);
const TERMINAL_STATUSES = new Set(["closed"]);

function create({ db, auth, admin, genRowId, rateLimit }) {
  const A = auth.authMiddleware;
  const now = () => new Date().toISOString();
  const newId = (prefix) => typeof genRowId === "function" ? genRowId(prefix) : `${prefix}_${crypto.randomUUID()}`;

  function ensureSchema() {
    db.exec(`
      CREATE TABLE IF NOT EXISTS customer_care_threads (
        id TEXT PRIMARY KEY,
        userId TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'waiting',
        source TEXT NOT NULL DEFAULT 'help',
        assignedStaffId TEXT,
        handoffReason TEXT NOT NULL DEFAULT '',
        handoffContext TEXT NOT NULL DEFAULT '',
        createdAt TEXT NOT NULL,
        updatedAt TEXT NOT NULL,
        closedAt TEXT,
        lastReadAt TEXT,
        priority TEXT NOT NULL DEFAULT 'normal',
        escalationTier TEXT NOT NULL DEFAULT 'customer_care',
        escalationUpdatedAt TEXT,
        escalationUpdatedBy TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_customer_care_user_status ON customer_care_threads(userId,status,updatedAt DESC);
      CREATE INDEX IF NOT EXISTS idx_customer_care_staff_status ON customer_care_threads(assignedStaffId,status,updatedAt DESC);
      CREATE TABLE IF NOT EXISTS customer_care_messages (
        id TEXT PRIMARY KEY,
        threadId TEXT NOT NULL,
        senderType TEXT NOT NULL,
        senderId TEXT,
        body TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customer_care_messages_thread ON customer_care_messages(threadId,createdAt ASC,id ASC);
    `);
    try { db.prepare("ALTER TABLE customer_care_threads ADD COLUMN lastReadAt TEXT").run(); } catch (_) {}
    try { db.prepare("ALTER TABLE customer_care_threads ADD COLUMN priority TEXT NOT NULL DEFAULT 'normal'").run(); } catch (_) {}
    try { db.prepare("ALTER TABLE customer_care_threads ADD COLUMN escalationTier TEXT NOT NULL DEFAULT 'customer_care'").run(); } catch (_) {}
    try { db.prepare("ALTER TABLE customer_care_threads ADD COLUMN escalationUpdatedAt TEXT").run(); } catch (_) {}
    try { db.prepare("ALTER TABLE customer_care_threads ADD COLUMN escalationUpdatedBy TEXT").run(); } catch (_) {}
    try { db.prepare("ALTER TABLE admin_work ADD COLUMN sourceType TEXT").run(); } catch (_) {}
    try { db.prepare("ALTER TABLE admin_work ADD COLUMN sourceKey TEXT").run(); } catch (_) {}
    try { db.prepare("ALTER TABLE admin_work ADD COLUMN sourceMetadata TEXT NOT NULL DEFAULT '{}'").run(); } catch (_) {}
    try { db.prepare("CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_work_source_key ON admin_work(sourceType,sourceKey) WHERE sourceType IS NOT NULL AND sourceKey IS NOT NULL").run(); } catch (_) {}
  }
  ensureSchema();

  function event(userId, action, threadId, metadata={}) { try { db.prepare("INSERT INTO platform_event_log(id,requestId,userId,action,entityType,entityId,metadata,createdAt) VALUES(?,?,?,?,?,?,?,?)").run(newId("evt"),newId("care_req"),userId,action,"customer_care",threadId,JSON.stringify(metadata).slice(0,4000),now()); } catch (_) {} }

  function openThread(userId, { source = "help", reason = "", context = "" } = {}) {
    const existing = db.prepare("SELECT * FROM customer_care_threads WHERE userId=? AND status IN ('waiting','assigned','in_progress') ORDER BY updatedAt DESC LIMIT 1").get(userId);
    if (existing) return existing;
    const at = now();
    const id = newId("care");
    db.prepare("INSERT INTO customer_care_threads(id,userId,status,source,assignedStaffId,handoffReason,handoffContext,createdAt,updatedAt,closedAt,lastReadAt) VALUES(?,?,?,?,?,?,?,?,?,NULL,?)")
      .run(id,userId,"waiting",String(source).slice(0,40),null,String(reason).slice(0,500),String(context).slice(0,8000),at,at,at);
    // Customer Care is Staff work, never an Admin decision. Reuse the existing capability queue.
    try {
      db.prepare("INSERT INTO admin_work(id,kind,resourceId,capability,assignedTo,assignedBy,status,priority,notes,createdAt,updatedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?)")
        .run(newId("aw"),"customer_care",id,SUPPORT_CAPABILITY,null,null,"unassigned","normal",`Customer Care · ${String(source).slice(0,40)}`,at,at);
    } catch (_) {}
    const created = db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(id);
    event(userId,"customer_care_created",id,{source:String(source).slice(0,40)});
    return created;
  }

  function safeThread(row) {
    if (!row) return null;
    const unread = db.prepare("SELECT COUNT(*) AS count FROM customer_care_messages WHERE threadId=? AND senderType IN ('staff','dami') AND createdAt > COALESCE(?, '')").get(row.id,row.lastReadAt||'')?.count || 0;
    return { id:row.id, status:row.status, source:row.source, assignedStaffId:row.assignedStaffId || null, priority:row.priority || "normal", escalationTier:row.escalationTier || "customer_care", escalationUpdatedAt:row.escalationUpdatedAt || null, handoffReason:row.handoffReason || "", handoffContext:row.handoffContext || "", createdAt:row.createdAt, updatedAt:row.updatedAt, closedAt:row.closedAt || null, lastReadAt:row.lastReadAt || null, unreadCount:Number(unread) };
  }
  function threadForUser(id,userId) { return db.prepare("SELECT * FROM customer_care_threads WHERE id=? AND userId=?").get(id,userId); }
  function addMessage(threadId, senderType, senderId, body, { idempotencyKey = null } = {}) {
    const text = String(body || "").trim().slice(0,4000);
    const idem = idempotencyKey ? String(idempotencyKey).trim().slice(0,120) : null;
    if (!text) throw Object.assign(new Error("Message is required."),{status:400});
    const thread = db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(threadId);
    if (!thread) throw Object.assign(new Error("Customer Care conversation not found."),{status:404});
    if (TERMINAL_STATUSES.has(thread.status)) throw Object.assign(new Error("This Customer Care conversation is closed."),{status:409});
    const at = now();
    if (idem) { const prior = db.prepare("SELECT * FROM customer_care_messages WHERE threadId=? AND senderId=? AND body=? ORDER BY createdAt DESC LIMIT 1").get(threadId,senderId||null,text); if (prior && (Date.now()-Date.parse(prior.createdAt||at)) < 120000) return db.prepare("SELECT id,threadId,senderType,senderId,body,createdAt FROM customer_care_messages WHERE threadId=? ORDER BY createdAt ASC,id ASC LIMIT 500").all(threadId); }
    db.prepare("INSERT INTO customer_care_messages(id,threadId,senderType,senderId,body,createdAt) VALUES(?,?,?,?,?,?)").run(newId("ccm"),threadId,senderType,senderId||null,text,at);
    db.prepare("UPDATE customer_care_threads SET updatedAt=? WHERE id=?").run(at,threadId);
    if (senderType === "staff") { try { const owner = db.prepare("SELECT userId FROM customer_care_threads WHERE id=?").get(threadId); if (owner?.userId) { const ev = notifications.createEvent(owner.userId, "NEXA Customer Care", "A Staff agent replied to your Help conversation.", { type:"system", screen:"home", action:"home", source:"customer_care", threadId }); db.prepare("INSERT OR IGNORE INTO notification_events(id,userId,title,body,type,data,createdAt) VALUES(?,?,?,?,?,?,?)").run(ev.id,ev.userId,ev.title,ev.body,ev.type,JSON.stringify(ev.data),ev.createdAt); } } catch (_) {} }
    event(senderId||thread.userId,`customer_care_${senderType}_message`,threadId,{senderType});
    return db.prepare("SELECT id,threadId,senderType,senderId,body,createdAt FROM customer_care_messages WHERE threadId=? ORDER BY createdAt ASC,id ASC LIMIT 500").all(threadId);
  }

  function staffGuard(capability = SUPPORT_CAPABILITY) {
    return (req,res,next) => {
      if (req.user && req.user.adminSessionVerified === false) return res.status(403).json({error:"Verify your sign-in code to use staff access.",code:"ADMIN_SESSION_UNVERIFIED"});
      const row = db.prepare("SELECT * FROM admin_staff WHERE userId=? AND active=1").get(req.user.id);
      if (!row) return res.status(403).json({error:"Active Staff access required."});
      let caps=[]; try { caps=JSON.parse(row.capabilities||"[]"); } catch (_) {}
      if (capability && !caps.includes(capability)) return res.status(403).json({error:"Customer Care capability is not assigned to this Staff account."});
      req.customerCareStaff=row; next();
    };
  }

  function register(app) {
    const messageLimit = typeof rateLimit === "function" ? rateLimit({ windowMs: 60 * 1000, max: 20, persistent: true, scope: "customer-care-message", keyFn: req => req.user?.id || req.ip, message: "Too many Customer Care messages. Please wait a moment and try again." }) : (req,res,next)=>next();
    app.post("/api/customer-care/threads",A,(req,res)=>{
      const source = ["help","dami"].includes(String(req.body?.source||"")) ? String(req.body.source) : "help";
      const thread = openThread(req.user.id,{source,reason:req.body?.reason,context:req.body?.context});
      res.status(201).json({thread:safeThread(thread),messages:db.prepare("SELECT id,threadId,senderType,senderId,body,createdAt FROM customer_care_messages WHERE threadId=? ORDER BY createdAt ASC,id ASC LIMIT 500").all(thread.id)});
    });
    app.get("/api/customer-care/threads/:id",A,(req,res)=>{
      const thread=threadForUser(req.params.id,req.user.id); if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      const limit=Math.min(Math.max(Number(req.query?.limit)||100,1),100); const before=String(req.query?.before||"").trim(); const messages=before?db.prepare("SELECT id,threadId,senderType,senderId,body,createdAt FROM customer_care_messages WHERE threadId=? AND createdAt < ? ORDER BY createdAt DESC,id DESC LIMIT ?").all(thread.id,before,limit).reverse():db.prepare("SELECT id,threadId,senderType,senderId,body,createdAt FROM customer_care_messages WHERE threadId=? ORDER BY createdAt DESC,id DESC LIMIT ?").all(thread.id,limit).reverse(); res.json({thread:safeThread(thread),messages,nextBefore:messages.length===limit?messages[0]?.createdAt:null});
    });
    app.post("/api/customer-care/threads/:id/read",A,(req,res)=>{
      const thread=threadForUser(req.params.id,req.user.id); if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      const at=now(); db.prepare("UPDATE customer_care_threads SET lastReadAt=?,updatedAt=updatedAt WHERE id=? AND userId=?").run(at,thread.id,req.user.id);
      res.json({thread:safeThread(db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(thread.id))});
    });

    app.post("/api/customer-care/threads/:id/messages",A,messageLimit,(req,res)=>{
      const thread=threadForUser(req.params.id,req.user.id); if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      const messages=addMessage(thread.id,"user",req.user.id,req.body?.body,{idempotencyKey:req.body?.idempotencyKey}); res.status(201).json({thread:safeThread(db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(thread.id)),messages});
    });

    app.post("/api/customer-care/threads/:id/escalate",A,(req,res)=>{
      const thread=threadForUser(req.params.id,req.user.id); if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      if(TERMINAL_STATUSES.has(thread.status))return res.status(409).json({error:"Closed Customer Care conversations cannot be escalated."});
      const at=now(); db.prepare("UPDATE customer_care_threads SET status=CASE WHEN status='waiting' THEN 'waiting' ELSE status END,source=CASE WHEN source='dami' THEN 'dami' ELSE source END,updatedAt=? WHERE id=?").run(at,thread.id);
      event(req.user.id,"customer_care_escalation_requested",thread.id,{reason:String(req.body?.reason||"customer_requested").slice(0,200)});
      res.json({ok:true,thread:safeThread(db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(thread.id))});
    });
    app.post("/api/customer-care/threads/:id/reopen",A,(req,res)=>{
      const thread=threadForUser(req.params.id,req.user.id); if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      if(!TERMINAL_STATUSES.has(thread.status))return res.json({ok:true,thread:safeThread(thread)});
      const at=now(); db.prepare("UPDATE customer_care_threads SET status='waiting',assignedStaffId=NULL,closedAt=NULL,updatedAt=?,lastReadAt=? WHERE id=? AND userId=?").run(at,at,thread.id,req.user.id);
      try { db.prepare("UPDATE admin_work SET status='unassigned',assignedTo=NULL,assignedBy=NULL,updatedAt=? WHERE kind='customer_care' AND resourceId=? AND status IN ('resolved','cancelled')").run(at,thread.id); } catch (_) {}
      event(req.user.id,"customer_care_reopened",thread.id,{}); res.json({ok:true,thread:safeThread(db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(thread.id))});
    });
    app.get("/api/admin/customer-care/my",A,staffGuard(),(req,res)=>{
      const rows=db.prepare(`SELECT t.id,t.userId,t.status,t.source,t.assignedStaffId,t.handoffReason,t.handoffContext,t.createdAt,t.updatedAt,u.name AS userName,u.email AS userEmail FROM customer_care_threads t JOIN users u ON u.id=t.userId WHERE t.assignedStaffId=? AND t.status IN ('assigned','in_progress') ORDER BY t.updatedAt ASC LIMIT 100`).all(req.user.id);
      res.json({threads:rows});
    });
    app.post("/api/admin/customer-care/threads/:id/assign",A,admin.require("staff_work"),(req,res)=>{
      const thread=db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(req.params.id);
      if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      if(thread.status==='closed')return res.status(409).json({error:"Closed Customer Care conversations cannot be assigned."});
      const staffId=String(req.body?.staffUserId||req.body?.staffId||"").trim();
      const staff=db.prepare("SELECT * FROM admin_staff WHERE userId=? AND active=1").get(staffId);
      if(!staff)return res.status(400).json({error:"An active Staff account is required."});
      let caps=[]; try{caps=JSON.parse(staff.capabilities||"[]")}catch(_){}
      if(!caps.includes(SUPPORT_CAPABILITY))return res.status(403).json({error:"Selected Staff account does not have Customer Care capability."});
      const at=now(); const priority=PRIORITIES.has(String(req.body?.priority||""))?String(req.body.priority):null;
      db.prepare(`UPDATE customer_care_threads SET assignedStaffId=?,status=CASE WHEN status='waiting' THEN 'assigned' ELSE status END,priority=COALESCE(?,priority),updatedAt=? WHERE id=? AND status!='closed'`).run(staffId,priority,at,thread.id);
      db.prepare("UPDATE admin_work SET assignedTo=?,assignedBy=?,status=CASE WHEN status='unassigned' THEN 'assigned' ELSE status END,updatedAt=? WHERE kind='customer_care' AND resourceId=? AND status NOT IN ('resolved','cancelled')").run(staffId,req.user.id,at,thread.id);
      event(req.user.id,"customer_care_assigned",thread.id,{assignedStaffId:staffId});
      res.json({ok:true,thread:safeThread(db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(thread.id))});
    });
    app.post("/api/admin/customer-care/threads/:id/escalate",A,admin.require("staff_work"),(req,res)=>{
      const thread=db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(req.params.id); if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      if(thread.status==='closed')return res.status(409).json({error:"Closed Customer Care conversations cannot be escalated."});
      const transition = nextEscalationTier(thread.escalationTier || "customer_care", req.body?.tier);
      if (!transition.ok) return res.status(409).json({error:transition.error,code:transition.code});
      const reason = normalizeEscalationReason(req.body?.reason);
      if (!reason.ok) return res.status(400).json({error:reason.error});
      const at=now();
      db.prepare("UPDATE customer_care_threads SET escalationTier=?,escalationUpdatedAt=?,escalationUpdatedBy=?,status='in_progress',updatedAt=? WHERE id=? AND status!='closed'")
        .run(transition.to,at,req.user.id,at,thread.id);
      event(req.user.id,"customer_care_admin_escalated",thread.id,{fromTier:transition.from,toTier:transition.to,reason:reason.value});
      res.json({ok:true,thread:safeThread(db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(thread.id))});
    });
    app.get("/api/admin/customer-care",A,admin.require("staff_work"),(req,res)=>{
      const status=String(req.query?.status||"").trim();
      const where=status && OPEN_STATUSES.has(status) ? "WHERE t.status=?" : "WHERE t.status IN ('waiting','assigned','in_progress')";
      const args=status && OPEN_STATUSES.has(status) ? [status] : [];
      const q=String(req.query?.q||"").trim().slice(0,80); const priority=PRIORITIES.has(String(req.query?.priority||""))?String(req.query.priority):null; const search=(q?" AND (u.name LIKE ? OR u.email LIKE ? OR t.handoffReason LIKE ?)":""); if(q){args.push(`%${q}%`,`%${q}%`,`%${q}%`);} if(priority){args.push(priority);} const rows=db.prepare(`SELECT t.id,t.userId,t.status,t.source,t.assignedStaffId,t.handoffReason,t.handoffContext,t.createdAt,t.updatedAt,COALESCE(t.priority,'normal') AS priority,u.name AS userName,u.email AS userEmail FROM customer_care_threads t JOIN users u ON u.id=t.userId ${where}${search}${priority?" AND COALESCE(t.priority,'normal')=?":""} ORDER BY CASE t.status WHEN 'waiting' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END, CASE COALESCE(t.priority,'normal') WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'normal' THEN 2 ELSE 3 END,t.updatedAt ASC LIMIT 250`).all(...args);
      res.json({threads:rows});
    });
    app.get("/api/admin/customer-care/threads/:id",A,staffGuard(),(req,res)=>{
      const thread=db.prepare("SELECT t.*,u.name AS userName,u.email AS userEmail FROM customer_care_threads t JOIN users u ON u.id=t.userId WHERE t.id=?").get(req.params.id);
      if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      if(thread.assignedStaffId && thread.assignedStaffId!==req.user.id) return res.status(403).json({error:"This conversation is assigned to another Staff member."});
      res.json({thread:safeThread(thread),user:{id:thread.userId,name:thread.userName,email:thread.userEmail},messages:db.prepare("SELECT id,threadId,senderType,senderId,body,createdAt FROM customer_care_messages WHERE threadId=? ORDER BY createdAt ASC,id ASC LIMIT 500").all(thread.id)});
    });
    app.post("/api/admin/customer-care/threads/:id/messages",A,staffGuard(),(req,res)=>{
      const thread=db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(req.params.id); if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      if(thread.assignedStaffId && thread.assignedStaffId!==req.user.id)return res.status(403).json({error:"This conversation is assigned to another Staff member."});
      if(!thread.assignedStaffId) db.prepare("UPDATE customer_care_threads SET assignedStaffId=?,status='in_progress',updatedAt=? WHERE id=? AND status IN ('waiting','assigned')").run(req.user.id,now(),thread.id);
      const messages=addMessage(thread.id,"staff",req.user.id,req.body?.body,{idempotencyKey:req.body?.idempotencyKey}); res.status(201).json({messages});
    });
    app.post("/api/admin/customer-care/threads/:id/close",A,staffGuard(),(req,res)=>{
      const thread=db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(req.params.id); if(!thread)return res.status(404).json({error:"Customer Care conversation not found."});
      if(thread.assignedStaffId && thread.assignedStaffId!==req.user.id)return res.status(403).json({error:"This conversation is assigned to another Staff member."});
      const at=now(); db.prepare("UPDATE customer_care_threads SET status='closed',closedAt=?,updatedAt=? WHERE id=? AND status!='closed'").run(at,at,thread.id);
      event(req.user.id,"customer_care_closed",thread.id,{actorType:"staff"});
      db.prepare("UPDATE admin_work SET status='resolved',notes=CASE WHEN notes='' THEN 'Customer Care conversation closed by Staff.' ELSE notes END,updatedAt=? WHERE kind='customer_care' AND resourceId=? AND status NOT IN ('resolved','cancelled')").run(at,thread.id);
      res.json({ok:true,thread:safeThread(db.prepare("SELECT * FROM customer_care_threads WHERE id=?").get(thread.id))});
    });
  }
  return { register, openThread, addMessage, SUPPORT_CAPABILITY };
}
module.exports={create, SUPPORT_CAPABILITY};
